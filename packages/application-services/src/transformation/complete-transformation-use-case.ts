import pg from 'pg';
import { 
  CostAllocationPolicy, 
  LotValuationRecordContract, 
  PhysicalTransformationOutputContract, 
  ProvenanceEdgeContract, 
  StockLedgerMovementContract, 
  TransformationInputContract, 
  WasteTransformationOutputContract 
} from '@roastery-os/contracts';
import { 
  DecimalValue, 
  IncompatibleUomDimensionError, 
  InventoryLot, 
  Money, 
  NegativeQuantityError, 
  Quantity, 
  UnitCost, 
  UnitOfMeasure 
} from '@roastery-os/domain-core';
import { 
  CostingPostgresRepository, 
  InventoryPostgresRepository, 
  MasterDataPostgresRepository, 
  PostgresTransactionManager, 
  TraceabilityPostgresRepository, 
  TransformationPostgresRepository 
} from '@roastery-os/infrastructure-postgres';
import { 
  CompleteTransformationCommand, 
  CompleteTransformationResult, 
  EmptyTransformationError, 
  InsufficientLotQuantityError, 
  InvalidTransformationStateError, 
  MaterialIdentityMismatchError, 
  PhysicalOutputParam, 
  TransformationNotFoundError 
} from './complete-transformation.js';
import { CrossTenantReceivingError, MaterialNotFoundError } from '../procurement/receive-purchase-order.js';

export class CompleteTransformationUseCase {
  constructor(
    private readonly transformationRepo: TransformationPostgresRepository = new TransformationPostgresRepository(),
    private readonly inventoryRepo: InventoryPostgresRepository = new InventoryPostgresRepository(),
    private readonly masterDataRepo: MasterDataPostgresRepository = new MasterDataPostgresRepository(),
    private readonly costingRepo: CostingPostgresRepository = new CostingPostgresRepository(),
    private readonly traceabilityRepo: TraceabilityPostgresRepository = new TraceabilityPostgresRepository()
  ) {}

  public async execute(
    command: CompleteTransformationCommand,
    providedClient?: pg.PoolClient
  ): Promise<CompleteTransformationResult> {
    if (command.inputs.length === 0) {
      throw new EmptyTransformationError('Transformation must have at least one input');
    }
    if (command.outputs.length === 0) {
      throw new EmptyTransformationError('Transformation must have at least one output');
    }

    const runWithClient = async (client: pg.PoolClient): Promise<CompleteTransformationResult> => {
      const completedAt = command.completedAt ?? new Date();

      // 1. Load and validate Transformation
      const tx = await this.transformationRepo.findTransformationById(
        client,
        command.organizationId,
        command.transformationId
      );
      if (!tx) {
        throw new TransformationNotFoundError(command.transformationId, command.organizationId);
      }
      if (tx.status === 'COMPLETED' || tx.status === 'CANCELLED') {
        throw new InvalidTransformationStateError(tx.status);
      }

      // 2. Load & lock input InventoryLots using SELECT ... FOR UPDATE (Concurrency Protection)
      const inputLots: {
        param: typeof command.inputs[0];
        lot: InventoryLot;
        valuation: LotValuationRecordContract;
      }[] = [];

      let totalInputValuation = Money.zero('IDR');

      for (const inParam of command.inputs) {
        if (inParam.actualQuantityConsumed.amount.isZero() || inParam.actualQuantityConsumed.amount.isNegative()) {
          throw new NegativeQuantityError(
            inParam.actualQuantityConsumed.amount.toString(),
            inParam.actualQuantityConsumed.uom
          );
        }

        // Concurrency lock
        const lot = await this.inventoryRepo.findLotByIdForUpdate(
          client,
          command.organizationId,
          inParam.inventoryLotId
        );

        if (!lot) {
          throw new Error(`Input InventoryLot '${inParam.inventoryLotId}' not found for Organization '${command.organizationId}'`);
        }

        if (lot.organizationId !== command.organizationId) {
          throw new CrossTenantReceivingError(`Input lot '${lot.inventoryLotId}' belongs to another organization`);
        }

        if (lot.materialId !== inParam.materialId) {
          throw new MaterialIdentityMismatchError(
            lot.inventoryLotId,
            inParam.materialId,
            lot.materialId
          );
        }

        // Verify UOM compatibility
        if (!UnitOfMeasure.isCompatible(inParam.actualQuantityConsumed.uom, lot.quantityOnHand.uom)) {
          throw new IncompatibleUomDimensionError(inParam.actualQuantityConsumed.uom, lot.quantityOnHand.uom);
        }

        // Check available quantity (does NOT consume reserved quantity)
        const available = lot.getAvailableQuantity();
        if (inParam.actualQuantityConsumed.compare(available) > 0) {
          throw new InsufficientLotQuantityError(
            lot.inventoryLotId,
            inParam.actualQuantityConsumed.toString(),
            available.toString()
          );
        }

        // Load unit valuation for economic resolution
        const valuation = await this.costingRepo.findLotValuation(
          client,
          command.organizationId,
          lot.inventoryLotId
        );
        if (!valuation) {
          throw new Error(`Lot valuation record missing for input lot '${lot.inventoryLotId}'`);
        }

        // Resolve consumed economic value: V_consumed = consumedQty * U_lot
        const unitCost = UnitCost.of(valuation.unitCost.unitPrice, valuation.unitCost.currency, valuation.unitCost.perUom);
        const consumedValue = unitCost.totalCostFor(inParam.actualQuantityConsumed);
        totalInputValuation = totalInputValuation.add(consumedValue);

        inputLots.push({ param: inParam, lot, valuation });
      }

      // 3. Process Input Inventory Depletion & Movements
      for (const item of inputLots) {
        const { param, lot } = item;

        // Deduct quantityOnHand projection
        const updatedOnHand = lot.quantityOnHand.sub(param.actualQuantityConsumed);
        const updatedLot = new InventoryLot({
          ...lot,
          quantityOnHand: updatedOnHand,
          lotState: updatedOnHand.isZero() ? 'DEPLETED' : lot.lotState,
          updatedAt: completedAt
        });

        // Update lot balance in DB
        await this.inventoryRepo.updateLotBalance(client, updatedLot);

        // Insert StockLedgerMovement (TRANSFORMATION_CONSUME)
        const movement: StockLedgerMovementContract = {
          organizationId: command.organizationId,
          movementId: param.movementId,
          movementNumber: `MOV-CONSUME-${param.transformationInputId}`,
          inventoryLotId: lot.inventoryLotId,
          movementType: 'TRANSFORMATION_CONSUME',
          quantityDelta: Quantity.delta(
            param.actualQuantityConsumed.amount.mul(DecimalValue.from('-1')),
            param.actualQuantityConsumed.uom
          ),
          referenceEntityType: 'TRANSFORMATION',
          referenceEntityId: command.transformationId as string,
          occurredAt: completedAt,
          notes: `Consumed in Transformation ${tx.transformationNumber}`
        };

        await this.inventoryRepo.insertMovement(client, movement);

        // Record TransformationInput record
        const inputRecord: TransformationInputContract = {
          organizationId: command.organizationId,
          transformationInputId: param.transformationInputId,
          transformationId: command.transformationId,
          inventoryLotId: lot.inventoryLotId,
          materialId: param.materialId,
          plannedQuantity: param.plannedQuantity,
          actualQuantityConsumed: param.actualQuantityConsumed,
          inputSequence: param.inputSequence,
          movementId: param.movementId
        };

        await this.transformationRepo.insertTransformationInput(client, inputRecord);
      }

      // 4. Calculate Economic Pool: V_total = V_input_total + C_direct
      let totalConversionCost = Money.zero('IDR');
      for (const ce of command.costEvents) {
        totalConversionCost = totalConversionCost.add(ce.allocatedAmount);

        // Insert CostEvent record
        await this.costingRepo.insertCostEvent(client, {
          organizationId: command.organizationId,
          costEventId: ce.costEventId,
          transformationId: command.transformationId,
          costCategory: ce.costCategory,
          allocatedAmount: ce.allocatedAmount,
          allocationBasis: ce.allocationBasis,
          recordedAt: completedAt
        });
      }

      const totalEconomicPool = totalInputValuation.add(totalConversionCost);

      // 5. Separate Physical Outputs from Waste
      const physicalOutputs: PhysicalOutputParam[] = [];
      for (const outParam of command.outputs) {
        if (outParam.actualQuantityProduced.amount.isZero() || outParam.actualQuantityProduced.amount.isNegative()) {
          throw new NegativeQuantityError(
            outParam.actualQuantityProduced.amount.toString(),
            outParam.actualQuantityProduced.uom
          );
        }

        // Verify Output Material exists and is active
        const mat = await this.masterDataRepo.findMaterialById(
          client,
          command.organizationId,
          outParam.materialId
        );
        if (!mat || !mat.isActive) {
          throw new MaterialNotFoundError(outParam.materialId, command.organizationId);
        }

        if (outParam.outputType === 'UNRECOVERABLE_WASTE') {
          // Persist Waste Output Record (NO INVENTORY LOT, NO MOVEMENT)
          const wasteRecord: WasteTransformationOutputContract = {
            organizationId: command.organizationId,
            transformationOutputId: outParam.transformationOutputId,
            transformationId: command.transformationId,
            outputType: 'UNRECOVERABLE_WASTE',
            materialId: outParam.materialId,
            actualQuantityProduced: outParam.actualQuantityProduced,
            createdLotId: null,
            movementId: null
          };
          await this.transformationRepo.insertTransformationOutput(client, wasteRecord);
        } else {
          physicalOutputs.push(outParam);
        }
      }

      // 6. Output Economic Allocation
      // Policy default: If 1 primary output -> FULL_ABSORPTION. If multiple -> MASS_PRO_RATA across compatible outputs.
      const policy: CostAllocationPolicy = command.allocationPolicy ?? 
        (physicalOutputs.length === 1 ? 'FULL_ABSORPTION' : 'MASS_PRO_RATA');

      // Calculate allocation shares
      let totalPhysicalMass = DecimalValue.zero();
      if (policy === 'MASS_PRO_RATA') {
        for (const po of physicalOutputs) {
          totalPhysicalMass = totalPhysicalMass.add(po.actualQuantityProduced.amount);
        }
      }

      for (let i = 0; i < physicalOutputs.length; i++) {
        const out = physicalOutputs[i]!;

        // 7. Materialize new InventoryLot in domain
        const outputLot = new InventoryLot({
          organizationId: command.organizationId,
          inventoryLotId: out.createdLotId,
          lotNumber: out.lotNumber,
          materialId: out.materialId,
          quantityOnHand: out.actualQuantityProduced,
          reservedQuantity: Quantity.zero(out.actualQuantityProduced.uom),
          lotState: 'ACTIVE',
          receivedAt: completedAt
        });

        await this.inventoryRepo.insertLot(client, outputLot);

        // 8. Insert StockLedgerMovement (TRANSFORMATION_YIELD)
        const yieldMovement: StockLedgerMovementContract = {
          organizationId: command.organizationId,
          movementId: out.movementId,
          movementNumber: `MOV-YIELD-${out.transformationOutputId}`,
          inventoryLotId: out.createdLotId,
          movementType: 'TRANSFORMATION_YIELD',
          quantityDelta: Quantity.delta(out.actualQuantityProduced.amount, out.actualQuantityProduced.uom),
          referenceEntityType: 'TRANSFORMATION',
          referenceEntityId: command.transformationId as string,
          occurredAt: completedAt,
          notes: `Yielded from Transformation ${tx.transformationNumber}`
        };

        await this.inventoryRepo.insertMovement(client, yieldMovement);

        // 9. Persist TransformationOutput Record
        const outputRecord: PhysicalTransformationOutputContract = {
          organizationId: command.organizationId,
          transformationOutputId: out.transformationOutputId,
          transformationId: command.transformationId,
          outputType: out.outputType,
          materialId: out.materialId,
          actualQuantityProduced: out.actualQuantityProduced,
          createdLotId: out.createdLotId,
          movementId: out.movementId
        };

        await this.transformationRepo.insertTransformationOutput(client, outputRecord);

        // 10. Compute Allocated Output Cost & LotValuationRecord
        let allocatedCost: Money;
        if (policy === 'FULL_ABSORPTION' || physicalOutputs.length === 1) {
          allocatedCost = i === 0 ? totalEconomicPool : Money.zero(totalEconomicPool.currency);
        } else {
          const share = out.actualQuantityProduced.amount.div(totalPhysicalMass);
          allocatedCost = totalEconomicPool.scale(share);
        }

        const unitCostDec = allocatedCost.amount.div(out.actualQuantityProduced.amount);
        const unitCost = UnitCost.of(unitCostDec, allocatedCost.currency, out.actualQuantityProduced.uom);

        await this.costingRepo.insertLotValuation(client, {
          organizationId: command.organizationId,
          valuationRecordId: out.valuationRecordId,
          inventoryLotId: out.createdLotId,
          materialCost: totalInputValuation.scale(allocatedCost.amount.div(totalEconomicPool.amount)),
          conversionCost: totalConversionCost.scale(allocatedCost.amount.div(totalEconomicPool.amount)),
          totalLotCost: allocatedCost,
          unitCost,
          allocationPolicy: policy,
          calculatedAt: completedAt
        });
      }

      // 11. Record Provenance Edges (Traceability)
      for (const edge of command.provenanceEdges) {
        const edgeRecord: ProvenanceEdgeContract = {
          organizationId: command.organizationId,
          provenanceEdgeId: edge.provenanceEdgeId,
          sourceLotId: edge.sourceLotId,
          transformationId: command.transformationId,
          targetLotId: edge.targetLotId,
          consumedQuantity: edge.consumedQuantity,
          edgeType: 'MATERIAL_CONSUMPTION',
          recordedAt: completedAt
        };

        await this.traceabilityRepo.insertProvenanceEdge(client, edgeRecord);
      }

      // 12. Complete Transformation State
      await this.transformationRepo.updateTransformationStatus(
        client,
        command.organizationId,
        command.transformationId,
        'COMPLETED',
        completedAt
      );

      // 13. Complete Batch if present
      if (command.batchId) {
        await this.transformationRepo.updateBatchStatus(
          client,
          command.organizationId,
          command.batchId,
          'COMPLETED',
          completedAt
        );
      }

      return {
        transformationId: command.transformationId,
        status: 'COMPLETED',
        completedAt,
        consumedInputCount: command.inputs.length,
        createdOutputLotCount: physicalOutputs.length,
        totalEconomicPool,
        provenanceEdgeCount: command.provenanceEdges.length
      };
    };

    if (providedClient) {
      return runWithClient(providedClient);
    }

    return PostgresTransactionManager.withTransaction(runWithClient);
  }
}
