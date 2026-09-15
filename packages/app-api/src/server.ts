import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { 
  OrganizationId, 
  PurchaseOrderId, 
  PurchaseOrderLineId, 
  MaterialId, 
  SupplierId, 
  PurchaseReceiptId, 
  MovementId,
  InventoryLotId,
  ProductId,
  SkuId
} from '@roastery-os/contracts';
import { Money, Quantity, DecimalValue } from '@roastery-os/domain-core';
import { 
  ReceivePurchaseOrderUseCase,
  ReceivePurchaseOrderCommand,
  CompleteTransformationUseCase,
  CompleteTransformationCommand,
  ProcessSaleFulfillmentUseCase,
  ProcessSaleFulfillmentCommand,
  WholesaleOrderUseCase,
  AnalyticsQueryService,
  IntelligenceEngineService,
  OperationalReasoningService
} from '@roastery-os/application-services';
import { 
  SupplierPostgresRepository,
  MasterDataPostgresRepository,
  InventoryPostgresRepository,
  CostingPostgresRepository,
  TransformationPostgresRepository,
  TraceabilityPostgresRepository,
  CommercialPostgresRepository,
  CustomerPostgresRepository,
  BlendRecipePostgresRepository,
  AnalyticsPostgresRepository
} from '@roastery-os/infrastructure-postgres';

function getPublicDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'packages/app-api/public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../public')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

export interface ApiServerOptions {
  port?: number;
  pool: pg.Pool;
  defaultOrgId?: OrganizationId;
}

export function createApiServer(options: ApiServerOptions): http.Server {
  const { pool } = options;
  const defaultOrgId = (options.defaultOrgId ?? '018f3a00-0000-7000-8000-000000000001') as OrganizationId;

  const supplierRepo = new SupplierPostgresRepository();
  const masterDataRepo = new MasterDataPostgresRepository();
  const inventoryRepo = new InventoryPostgresRepository();
  const costingRepo = new CostingPostgresRepository();
  const transformationRepo = new TransformationPostgresRepository();
  const traceabilityRepo = new TraceabilityPostgresRepository();
  const commercialRepo = new CommercialPostgresRepository();
  const customerRepo = new CustomerPostgresRepository();
  const blendRecipeRepo = new BlendRecipePostgresRepository();
  const analyticsRepo = new AnalyticsPostgresRepository();

  const analyticsService = new AnalyticsQueryService(analyticsRepo);
  const intelligenceService = new IntelligenceEngineService(analyticsRepo);
  const aiReasoningService = new OperationalReasoningService(analyticsRepo, intelligenceService);

  const receiveUseCase = new ReceivePurchaseOrderUseCase(
    supplierRepo,
    masterDataRepo,
    inventoryRepo,
    costingRepo
  );

  const completeTransformUseCase = new CompleteTransformationUseCase(
    transformationRepo,
    inventoryRepo,
    masterDataRepo,
    costingRepo,
    traceabilityRepo
  );

  const wholesaleUseCase = new WholesaleOrderUseCase(
    commercialRepo,
    inventoryRepo,
    masterDataRepo,
    costingRepo,
    customerRepo
  );

  const processSaleUseCase = new ProcessSaleFulfillmentUseCase(
    commercialRepo,
    inventoryRepo,
    masterDataRepo,
    costingRepo
  );

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method ?? 'GET';

      // Helper for JSON responses
      const sendJson = (status: number, data: any) => {
        res.writeHead(status, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Organization-Id'
        });
        res.end(JSON.stringify(data));
      };

      // CORS Preflight
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Organization-Id'
        });
        res.end();
        return;
      }

      const orgId = (req.headers['x-organization-id'] as string as OrganizationId) || defaultOrgId;

      // 1. GET /api/purchase-orders (List POs)
      if (method === 'GET' && pathname === '/api/purchase-orders') {
        const client = await pool.connect();
        try {
          const pos = await supplierRepo.listPurchaseOrders(client, orgId);
          const suppliers = await supplierRepo.listSuppliers(client, orgId);
          const supplierMap = new Map(suppliers.map(s => [s.supplierId, s.name]));

          const enriched = pos.map(po => ({
            ...po,
            supplierName: supplierMap.get(po.supplierId) ?? 'Unknown Supplier',
            lineCount: po.lines.length
          }));

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 2. GET /api/purchase-orders/:poId (PO Detail with lines & materials)
      const poMatch = pathname.match(/^\/api\/purchase-orders\/([^\/]+)$/);
      if (method === 'GET' && poMatch) {
        const poId = poMatch[1] as PurchaseOrderId;
        const client = await pool.connect();
        try {
          const po = await supplierRepo.findPurchaseOrder(client, orgId, poId);
          if (!po) {
            sendJson(404, { error: 'Purchase Order not found' });
            return;
          }

          const suppliers = await supplierRepo.listSuppliers(client, orgId);
          const supplier = suppliers.find(s => s.supplierId === po.supplierId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));

          const enrichedLines = po.lines.map(line => {
            const mat = matMap.get(line.materialId);
            const ordered = new DecimalValue(line.orderedQuantity.amount.toString());
            const received = new DecimalValue(line.receivedQuantity.amount.toString());
            const remaining = ordered.sub(received);

            return {
              ...line,
              materialCode: mat?.code ?? 'UNKNOWN',
              materialName: mat?.name ?? 'Unknown Material',
              materialCategory: mat?.category ?? 'RAW_MATERIAL',
              remainingQuantity: {
                amount: remaining.toString(),
                uom: line.orderedQuantity.uom
              }
            };
          });

          // Fetch any past receipts for this PO
          const receipts = await supplierRepo.findPurchaseReceiptsByPo(client, orgId, poId);

          sendJson(200, {
            data: {
              ...po,
              supplierName: supplier?.name ?? 'Unknown Supplier',
              supplierCode: supplier?.supplierCode ?? 'UNKNOWN',
              lines: enrichedLines,
              receipts
            }
          });
          return;
        } finally {
          client.release();
        }
      }

      // 3. POST /api/purchase-orders/:poId/receive (Execute ReceivePurchaseOrderUseCase)
      const receiveMatch = pathname.match(/^\/api\/purchase-orders\/([^\/]+)\/receive$/);
      if (method === 'POST' && receiveMatch) {
        const poId = receiveMatch[1] as PurchaseOrderId;

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');

            // Generate UUIDs if not supplied
            const generateUuid = () => '018f3a00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
            const receiptId = (payload.receiptId || generateUuid()) as PurchaseReceiptId;
            const movementId = (payload.movementId || generateUuid()) as MovementId;
            const receiptNumber = payload.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

            const command: ReceivePurchaseOrderCommand = {
              organizationId: orgId,
              receiptId,
              receiptNumber,
              poId,
              poLineId: payload.poLineId as PurchaseOrderLineId,
              supplierId: payload.supplierId as SupplierId,
              materialId: payload.materialId as MaterialId,
              movementId,
              receivedQuantity: Quantity.of(payload.quantity, payload.uom),
              unitPurchasePrice: Money.of(payload.unitPrice, payload.currency || 'IDR'),
              originLotReference: payload.originLotReference || undefined
            };

            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const result = await receiveUseCase.execute(command, client);
              await client.query('COMMIT');

              sendJson(201, {
                success: true,
                data: {
                  receiptId: result.receiptId,
                  createdLotId: result.createdLotId,
                  movementId: result.movementId,
                  lotNumber: result.lotNumber,
                  quantityOnHand: {
                    amount: result.quantityOnHand.amount.toString(),
                    uom: result.quantityOnHand.uom
                  },
                  unitCost: {
                    amount: result.unitCost.amount.toString(),
                    currency: result.unitCost.currency
                  }
                }
              });
            } catch (err: any) {
              await client.query('ROLLBACK');
              sendJson(400, {
                error: err.message,
                errorName: err.name || 'ApplicationError'
              });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON payload: ' + jsonErr.message });
          }
        });
        return;
      }

      // 4. GET /api/receipts/:receiptId (Inspect full physical & valuation records)
      const receiptMatch = pathname.match(/^\/api\/receipts\/([^\/]+)$/);
      if (method === 'GET' && receiptMatch) {
        const receiptId = receiptMatch[1] as PurchaseReceiptId;
        const client = await pool.connect();
        try {
          const receipt = await supplierRepo.findPurchaseReceipt(client, orgId, receiptId);
          if (!receipt) {
            sendJson(404, { error: 'Purchase Receipt not found' });
            return;
          }

          const lot = await inventoryRepo.findLotById(client, orgId, receipt.createdLotId);
          const movement = await inventoryRepo.findMovementById(client, orgId, receipt.movementId as string);
          const valuation = await costingRepo.findLotValuation(client, orgId, receipt.createdLotId);
          const material = await masterDataRepo.findMaterialById(client, orgId, receipt.materialId);
          const suppliers = await supplierRepo.listSuppliers(client, orgId);
          const supplier = suppliers.find(s => s.supplierId === receipt.supplierId);

          sendJson(200, {
            data: {
              receipt,
              lot: lot ? {
                organizationId: lot.organizationId,
                inventoryLotId: lot.inventoryLotId,
                lotNumber: lot.lotNumber,
                materialId: lot.materialId,
                quantityOnHand: {
                  amount: lot.quantityOnHand.amount.toString(),
                  uom: lot.quantityOnHand.uom
                },
                reservedQuantity: {
                  amount: lot.reservedQuantity.amount.toString(),
                  uom: lot.reservedQuantity.uom
                },
                storageLocationId: lot.storageLocationId,
                lotState: lot.lotState,
                receivedAt: lot.receivedAt,
                expiresAt: lot.expiresAt,
                createdAt: lot.createdAt,
                updatedAt: lot.updatedAt,
                materialName: material?.name ?? 'Unknown Material',
                materialCode: material?.code ?? 'UNKNOWN'
              } : null,
              movement,
              valuation,
              supplierName: supplier?.name ?? 'Unknown Supplier'
            }
          });
          return;
        } finally {
          client.release();
        }
      }

      // 5. GET /api/materials
      if (method === 'GET' && pathname === '/api/materials') {
        const client = await pool.connect();
        try {
          const materials = await masterDataRepo.listMaterials(client, orgId);
          sendJson(200, { data: materials });
          return;
        } finally {
          client.release();
        }
      }

      // 6. GET /api/suppliers
      if (method === 'GET' && pathname === '/api/suppliers') {
        const client = await pool.connect();
        try {
          const suppliers = await supplierRepo.listSuppliers(client, orgId);
          sendJson(200, { data: suppliers });
          return;
        } finally {
          client.release();
        }
      }

      // 7. GET /api/inventory-lots (List available lots for roasting/transformation)
      if (method === 'GET' && pathname === '/api/inventory-lots') {
        const client = await pool.connect();
        try {
          const lots = await inventoryRepo.listLots(client, orgId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));

          const enriched = await Promise.all(lots.map(async (lot) => {
            const mat = matMap.get(lot.materialId);
            const val = await costingRepo.findLotValuation(client, orgId, lot.inventoryLotId);
            const available = lot.getAvailableQuantity();

            return {
              organizationId: lot.organizationId,
              inventoryLotId: lot.inventoryLotId,
              lotNumber: lot.lotNumber,
              materialId: lot.materialId,
              materialCode: mat?.code ?? 'UNKNOWN',
              materialName: mat?.name ?? 'Unknown Material',
              materialCategory: mat?.category ?? 'RAW_MATERIAL',
              quantityOnHand: {
                amount: lot.quantityOnHand.amount.toString(),
                uom: lot.quantityOnHand.uom
              },
              reservedQuantity: {
                amount: lot.reservedQuantity.amount.toString(),
                uom: lot.reservedQuantity.uom
              },
              availableQuantity: {
                amount: available.amount.toString(),
                uom: available.uom
              },
              lotState: lot.lotState,
              unitCost: val ? {
                unitPrice: val.unitCost.unitPrice.toString(),
                currency: val.unitCost.currency,
                perUom: val.unitCost.perUom
              } : null,
              totalLotCost: val ? {
                amount: val.totalLotCost.amount.toString(),
                currency: val.totalLotCost.currency
              } : null,
              receivedAt: lot.receivedAt
            };
          }));

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 7b. POST /api/inventory/items (Create Item and Initialize Inventory Lot)
      if (method === 'POST' && pathname === '/api/inventory/items') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const generateUuid = () => '018f3a00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
            
            const productName = String(payload.name || payload.productName || '').trim();
            if (!productName) {
              sendJson(400, { error: 'Product Name is required' });
              return;
            }

            const itemType = String(payload.type || 'RAW_MATERIAL').toUpperCase(); // RAW_MATERIAL, PACKAGING_MATERIAL, INTERMEDIARY_COFFEE, FINISHED_GOOD
            const rawUnit = String(payload.unit || 'KG').toUpperCase();
            const uom = (rawUnit === 'GRAM' || rawUnit === 'G') ? 'G' : (rawUnit === 'PIECES' || rawUnit === 'PCS' || rawUnit === 'UNIT') ? 'UNIT' : 'KG';
            const stockQty = Number(payload.stockQuantity ?? payload.quantityOnHand ?? 0);
            const costPerUnit = Number(payload.costPerUnit ?? payload.unitCost ?? 0);
            const sellPrice = Number(payload.sellPrice ?? payload.baseRetailPrice ?? 0);
            const wholesalePrice = Number(payload.wholesalePrice ?? payload.baseWholesalePrice ?? 0);
            const costMethod = String(payload.costMethod || 'Standard Price (Fixed)');
            const restDays = Number(payload.recommendedRestDays ?? 7);

            const prefixMap: Record<string, string> = {
              'RAW_MATERIAL': 'GB',
              'PACKAGING_MATERIAL': 'PKG',
              'INTERMEDIARY_COFFEE': 'RST',
              'FINISHED_GOOD': 'FG'
            };
            const pfx = prefixMap[itemType] || 'MAT';
            const sku = payload.sku ? String(payload.sku).trim() : `${pfx}-${Date.now().toString().slice(-6)}`;
            const materialCode = sku;

            const materialId = (payload.materialId || generateUuid()) as MaterialId;
            const lotId = (payload.inventoryLotId || generateUuid()) as InventoryLotId;
            const lotNumber = payload.lotNumber || `LOT-${pfx}-${Date.now().toString().slice(-6)}`;
            const movementId = generateUuid() as MovementId;
            const valuationId = generateUuid();
            const productId = generateUuid() as ProductId;
            const skuId = generateUuid() as SkuId;

            const client = await pool.connect();
            try {
              await client.query('BEGIN');

              // 1. Insert material_master
              await client.query(
                `INSERT INTO material_master (
                  organization_id, material_id, code, name, category, base_uom, description, is_active, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, base_uom = EXCLUDED.base_uom`,
                [orgId, materialId, materialCode, productName, itemType, uom, `RestDays: ${restDays}; CostMethod: ${costMethod}`, true]
              );

              // 2. If FINISHED_GOOD or has sell price, create product_master and sku_master
              if (itemType === 'FINISHED_GOOD' || sellPrice > 0 || wholesalePrice > 0) {
                await client.query(
                  `INSERT INTO product_master (
                    organization_id, product_id, product_code, name, brand_line, description, primary_material_id, is_active, created_at, updated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT (organization_id, product_code) DO NOTHING`,
                  [orgId, productId, `PROD-${materialCode}`, productName, 'House Line', `Created via Inventory Manager`, materialId, true]
                );

                await client.query(
                  `INSERT INTO sku_master (
                    organization_id, sku_id, sku_code, product_id, material_id, name, packaging_type, packaged_quantity, packaged_uom, barcode, base_retail_price, base_wholesale_price, is_active, created_at, updated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT (organization_id, sku_code) DO UPDATE SET base_retail_price = EXCLUDED.base_retail_price, base_wholesale_price = EXCLUDED.base_wholesale_price`,
                  [orgId, skuId, materialCode, productId, materialId, productName, uom === 'UNIT' ? 'BAG' : 'BULK', 1, uom, null, sellPrice, wholesalePrice, true]
                );
              }

              // 3. Insert inventory_lot (if stock quantity > 0)
              if (stockQty > 0) {
                await client.query(
                  `INSERT INTO inventory_lot (
                    organization_id, inventory_lot_id, lot_number, material_id, quantity_on_hand, reserved_quantity, uom, storage_location_id, lot_state, received_at, created_at, updated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                  [orgId, lotId, lotNumber, materialId, stockQty, 0, uom, null, 'ACTIVE']
                );

                // 4. Insert initial stock ledger movement
                await client.query(
                  `INSERT INTO stock_ledger_movement (
                    organization_id, movement_id, movement_number, inventory_lot_id, movement_type, quantity_delta, uom, source_location_id, destination_location_id, reference_entity_type, reference_entity_id, operator_id, occurred_at, notes
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13)`,
                  [orgId, movementId, `MOV-INIT-${Date.now().toString().slice(-6)}`, lotId, 'RESTOCK', stockQty, uom, null, null, 'INVENTORY_ITEM_INITIALIZATION', lotId, null, `Initial stock initialization for ${productName}`]
                );

                // 5. Insert lot valuation record
                const totalLotCost = stockQty * costPerUnit;
                await client.query(
                  `INSERT INTO lot_valuation_record (
                    organization_id, valuation_record_id, inventory_lot_id, material_cost, conversion_cost, total_lot_cost, unit_cost, currency, allocation_policy, calculated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
                  [orgId, valuationId, lotId, totalLotCost, 0, totalLotCost, costPerUnit, 'IDR', costMethod.includes('Fixed') ? 'STANDARD_FIXED' : 'FIFO']
                );
              }

              await client.query('COMMIT');

              sendJson(201, {
                success: true,
                data: {
                  materialId,
                  materialCode,
                  productName,
                  category: itemType,
                  lotId: stockQty > 0 ? lotId : null,
                  lotNumber: stockQty > 0 ? lotNumber : null,
                  quantityOnHand: stockQty,
                  uom,
                  costPerUnit,
                  sellPrice,
                  wholesalePrice
                }
              });
            } catch (err: any) {
              await client.query('ROLLBACK');
              sendJson(400, { error: err.message });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON payload: ' + jsonErr.message });
          }
        });
        return;
      }

      // 8. GET /api/transformations (List Transformations & Batches)
      if (method === 'GET' && pathname === '/api/transformations') {
        const client = await pool.connect();
        try {
          const txs = await transformationRepo.listTransformations(client, orgId);
          const enriched = await Promise.all(txs.map(async (tx) => {
            const batch = await transformationRepo.findBatchByTransformation(client, orgId, tx.transformationId);
            return {
              ...tx,
              batchNumber: batch?.batchNumber ?? null,
              batchStatus: batch?.status ?? null,
              recipeOrProfileId: batch?.recipeOrProfileId ?? null
            };
          }));

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 9. POST /api/transformations/start (Start a new Roasting Transformation & Batch)
      if (method === 'POST' && pathname === '/api/transformations/start') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const generateUuid = () => '018f3a00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
            const txId = (payload.transformationId || generateUuid()) as any;
            const batchId = (payload.batchId || generateUuid()) as any;
            const txNumber = payload.transformationNumber || `TX-ROAST-${Date.now().toString().slice(-6)}`;
            const batchNumber = payload.batchNumber || `BATCH-ROAST-${Date.now().toString().slice(-6)}`;
            const archetype = payload.archetype || 'ROASTING';
            const validArchetype = archetype === 'PACKAGING' ? 'ASSEMBLY_PACKAGING' : archetype;
            const batchType = validArchetype === 'ASSEMBLY_PACKAGING' || validArchetype === 'REPACKAGING' 
              ? 'PACKAGING_BATCH' 
              : validArchetype === 'BLENDING' 
                ? 'BLEND_BATCH' 
                : 'ROAST_BATCH';
            const profile = payload.recipeOrProfileId || 'Light-Filter-Profile-01';

            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              await transformationRepo.insertTransformation(client, {
                organizationId: orgId,
                transformationId: txId,
                transformationNumber: txNumber,
                archetype: validArchetype,
                status: 'IN_PROGRESS',
                inputs: [],
                outputs: [],
                startedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              });

              await transformationRepo.insertBatch(client, {
                organizationId: orgId,
                batchId,
                batchNumber,
                batchType,
                transformationId: txId,
                recipeOrProfileId: profile,
                status: 'EXECUTING',
                startedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              });

              await client.query('COMMIT');
              sendJson(201, {
                success: true,
                data: {
                  transformationId: txId,
                  transformationNumber: txNumber,
                  batchId,
                  batchNumber,
                  status: 'IN_PROGRESS',
                  recipeOrProfileId: profile
                }
              });
            } catch (err: any) {
              await client.query('ROLLBACK');
              sendJson(400, { error: err.message });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON: ' + jsonErr.message });
          }
        });
        return;
      }

      // 10. POST /api/transformations/:txId/complete (Execute CompleteTransformationUseCase)
      const completeTxMatch = pathname.match(/^\/api\/transformations\/([^\/]+)\/complete$/);
      if (method === 'POST' && completeTxMatch) {
        const txId = completeTxMatch[1] as any;
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const generateUuid = () => '018f3a00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');

            // Map inputs
            const inputs = (payload.inputs || []).map((inp: any, idx: number) => ({
              transformationInputId: (inp.transformationInputId || generateUuid()) as any,
              inventoryLotId: inp.inventoryLotId as any,
              materialId: inp.materialId as any,
              plannedQuantity: Quantity.of(inp.plannedQuantity || inp.actualQuantityConsumed, inp.uom),
              actualQuantityConsumed: Quantity.of(inp.actualQuantityConsumed, inp.uom),
              movementId: (inp.movementId || generateUuid()) as any,
              inputSequence: idx + 1
            }));

            // Map outputs
            const outputs = (payload.outputs || []).map((out: any) => {
              if (out.outputType === 'UNRECOVERABLE_WASTE') {
                return {
                  transformationOutputId: (out.transformationOutputId || generateUuid()) as any,
                  materialId: out.materialId as any,
                  outputType: 'UNRECOVERABLE_WASTE' as const,
                  actualQuantityProduced: Quantity.of(out.actualQuantityProduced, out.uom)
                };
              }
              const createdLotId = (out.createdLotId || generateUuid()) as any;
              const lotNumber = out.lotNumber || `LOT-RST-${Date.now().toString().slice(-6)}`;
              let outputType = out.outputType;
              if (outputType === 'PRIMARY') outputType = 'PRIMARY_PRODUCT';
              if (outputType === 'SECONDARY') outputType = 'CO_PRODUCT';
              return {
                transformationOutputId: (out.transformationOutputId || generateUuid()) as any,
                materialId: out.materialId as any,
                outputType: outputType as any,
                actualQuantityProduced: Quantity.of(out.actualQuantityProduced, out.uom),
                createdLotId,
                lotNumber,
                movementId: (out.movementId || generateUuid()) as any,
                valuationRecordId: (out.valuationRecordId || generateUuid()) as any
              };
            });

            // Map Cost Events
            const costEvents = (payload.costEvents || []).map((ce: any) => ({
              costEventId: (ce.costEventId || generateUuid()) as any,
              costCategory: ce.costCategory as any,
              allocatedAmount: Money.of(ce.allocatedAmount, ce.currency || 'IDR'),
              allocationBasis: ce.allocationBasis || 'BATCH_FIXED'
            }));

            // Map Provenance Edges
            let provenanceEdges = (payload.provenanceEdges || []).map((pe: any) => ({
              provenanceEdgeId: (pe.provenanceEdgeId || generateUuid()) as any,
              sourceLotId: pe.sourceLotId as any,
              targetLotId: pe.targetLotId as any,
              consumedQuantity: Quantity.of(pe.consumedQuantity, pe.uom)
            }));

            // Auto-generate provenance edges if not explicitly supplied
            if (provenanceEdges.length === 0) {
              const outputWithLots = outputs.filter((o: any) => o.outputType !== 'UNRECOVERABLE_WASTE' && o.createdLotId);
              for (const inp of inputs) {
                for (const out of outputWithLots) {
                  provenanceEdges.push({
                    provenanceEdgeId: generateUuid() as any,
                    sourceLotId: inp.inventoryLotId,
                    targetLotId: (out as any).createdLotId,
                    consumedQuantity: inp.actualQuantityConsumed
                  });
                }
              }
            }

            const command: CompleteTransformationCommand = {
              organizationId: orgId,
              transformationId: txId,
              batchId: payload.batchId ? (payload.batchId as any) : undefined,
              allocationPolicy: payload.allocationPolicy ?? undefined,
              inputs,
              outputs,
              costEvents,
              provenanceEdges,
              completedAt: new Date()
            };

            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const result = await completeTransformUseCase.execute(command, client);
              await client.query('COMMIT');

              sendJson(200, {
                success: true,
                data: {
                  transformationId: result.transformationId,
                  status: result.status,
                  completedAt: result.completedAt,
                  consumedInputCount: result.consumedInputCount,
                  createdOutputLotCount: result.createdOutputLotCount,
                  totalEconomicPool: {
                    amount: result.totalEconomicPool.amount.toString(),
                    currency: result.totalEconomicPool.currency
                  },
                  provenanceEdgeCount: result.provenanceEdgeCount
                }
              });
            } catch (err: any) {
              await client.query('ROLLBACK');
              sendJson(400, {
                error: err.message,
                errorName: err.name || 'TransformationError'
              });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON payload: ' + jsonErr.message });
          }
        });
        return;
      }

      // 11. GET /api/transformations/:txId (Transformation Inspector)
      const getTxMatch = pathname.match(/^\/api\/transformations\/([^\/]+)$/);
      if (method === 'GET' && getTxMatch) {
        const txId = getTxMatch[1] as any;
        const client = await pool.connect();
        try {
          const tx = await transformationRepo.findTransformationById(client, orgId, txId);
          if (!tx) {
            sendJson(404, { error: 'Transformation not found' });
            return;
          }

          const batch = await transformationRepo.findBatchByTransformation(client, orgId, txId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));

          // Enrich inputs
          const enrichedInputs = await Promise.all(tx.inputs.map(async (inp) => {
            const lot = await inventoryRepo.findLotById(client, orgId, inp.inventoryLotId);
            const mat = matMap.get(inp.materialId);
            const val = await costingRepo.findLotValuation(client, orgId, inp.inventoryLotId);
            return {
              ...inp,
              lotNumber: lot?.lotNumber ?? 'UNKNOWN',
              materialCode: mat?.code ?? 'UNKNOWN',
              materialName: mat?.name ?? 'Unknown Material',
              unitCost: val ? {
                unitPrice: val.unitCost.unitPrice.toString(),
                currency: val.unitCost.currency,
                perUom: val.unitCost.perUom
              } : null
            };
          }));

          // Enrich outputs
          const enrichedOutputs = await Promise.all(tx.outputs.map(async (out) => {
            const mat = matMap.get(out.materialId);
            let lotData = null;
            let valuationData = null;
            if (out.outputType !== 'UNRECOVERABLE_WASTE' && out.createdLotId) {
              const lot = await inventoryRepo.findLotById(client, orgId, out.createdLotId);
              const val = await costingRepo.findLotValuation(client, orgId, out.createdLotId);
              lotData = lot ? {
                lotNumber: lot.lotNumber,
                quantityOnHand: { amount: lot.quantityOnHand.amount.toString(), uom: lot.quantityOnHand.uom },
                lotState: lot.lotState
              } : null;
              valuationData = val ? {
                unitCost: { unitPrice: val.unitCost.unitPrice.toString(), currency: val.unitCost.currency, perUom: val.unitCost.perUom },
                totalLotCost: { amount: val.totalLotCost.amount.toString(), currency: val.totalLotCost.currency },
                materialCost: { amount: val.materialCost.amount.toString(), currency: val.materialCost.currency },
                conversionCost: { amount: val.conversionCost.amount.toString(), currency: val.conversionCost.currency },
                allocationPolicy: val.allocationPolicy
              } : null;
            }
            return {
              ...out,
              materialCode: mat?.code ?? 'UNKNOWN',
              materialName: mat?.name ?? 'Unknown Material',
              lot: lotData,
              valuation: valuationData
            };
          }));

          // Cost Events
          const costEvents = await costingRepo.findCostEventsByTransformation(client, orgId, txId);

          // Provenance Edges
          const provenanceEdges = await traceabilityRepo.findEdgesByTransformation(client, orgId, txId);
          const enrichedEdges = await Promise.all(provenanceEdges.map(async (edge) => {
            const srcLot = await inventoryRepo.findLotById(client, orgId, edge.sourceLotId);
            const tgtLot = await inventoryRepo.findLotById(client, orgId, edge.targetLotId);
            return {
              ...edge,
              sourceLotNumber: srcLot?.lotNumber ?? edge.sourceLotId,
              targetLotNumber: tgtLot?.lotNumber ?? edge.targetLotId
            };
          }));

          sendJson(200, {
            data: {
              transformation: {
                ...tx,
                inputs: enrichedInputs,
                outputs: enrichedOutputs
              },
              batch,
              costEvents,
              provenanceEdges: enrichedEdges
            }
          });
          return;
        } finally {
          client.release();
        }
      }

      // Workstream 3: Packaging & Finished Goods (Phase 6C)

      // 12. GET /api/products (List Commercial Products)
      if (method === 'GET' && pathname === '/api/products') {
        const client = await pool.connect();
        try {
          const products = await masterDataRepo.listProducts(client, orgId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));
          const skus = await masterDataRepo.listSkus(client, orgId);

          const enriched = products.map(p => {
            const primaryMat = p.primaryMaterialId ? matMap.get(p.primaryMaterialId) : null;
            const matchingSkus = skus.filter(s => s.productId === p.productId);
            return {
              ...p,
              primaryMaterialCode: primaryMat?.code ?? null,
              primaryMaterialName: primaryMat?.name ?? null,
              skuCount: matchingSkus.length
            };
          });

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 13. GET /api/skus (List Commercial SKUs with Finished Stock Availability)
      if (method === 'GET' && pathname === '/api/skus') {
        const client = await pool.connect();
        try {
          const skus = await masterDataRepo.listSkus(client, orgId);
          const products = await masterDataRepo.listProducts(client, orgId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const lots = await inventoryRepo.listLots(client, orgId);

          const prodMap = new Map(products.map(p => [p.productId, p]));
          const matMap = new Map(materials.map(m => [m.materialId, m]));

          const enriched = await Promise.all(skus.map(async (sku) => {
            const prod = prodMap.get(sku.productId);
            const mat = matMap.get(sku.materialId);

            // Find matching physical inventory lots that hold this finished good material
            const matchingLots = lots.filter(l => l.materialId === sku.materialId && l.lotState === 'ACTIVE');
            let availableUnits = 0;
            matchingLots.forEach(l => {
              availableUnits += Number(l.getAvailableQuantity().amount);
            });

            return {
              ...sku,
              productName: prod?.name ?? 'Unknown Product',
              productCode: prod?.code ?? 'UNKNOWN',
              brandLine: prod?.brandLine ?? 'Standard',
              materialCode: mat?.code ?? 'UNKNOWN',
              materialName: mat?.name ?? 'Unknown Material',
              availableStockUnits: availableUnits.toFixed(0)
            };
          }));

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 14. GET /api/production-inputs (Available Intermediary Coffee & Packaging Material Lots)
      if (method === 'GET' && pathname === '/api/production-inputs') {
        const client = await pool.connect();
        try {
          const lots = await inventoryRepo.listLots(client, orgId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));

          const productionLots = lots.filter(lot => {
            const mat = matMap.get(lot.materialId);
            return mat && (mat.category === 'INTERMEDIARY_COFFEE' || mat.category === 'PACKAGING_MATERIAL');
          });

          const enriched = await Promise.all(productionLots.map(async (lot) => {
            const mat = matMap.get(lot.materialId);
            const val = await costingRepo.findLotValuation(client, orgId, lot.inventoryLotId);
            const available = lot.getAvailableQuantity();

            return {
              organizationId: lot.organizationId,
              inventoryLotId: lot.inventoryLotId,
              lotNumber: lot.lotNumber,
              materialId: lot.materialId,
              materialCode: mat?.code ?? 'UNKNOWN',
              materialName: mat?.name ?? 'Unknown Material',
              materialCategory: mat?.category ?? 'INTERMEDIARY_COFFEE',
              quantityOnHand: {
                amount: lot.quantityOnHand.amount.toString(),
                uom: lot.quantityOnHand.uom
              },
              reservedQuantity: {
                amount: lot.reservedQuantity.amount.toString(),
                uom: lot.reservedQuantity.uom
              },
              availableQuantity: {
                amount: available.amount.toString(),
                uom: available.uom
              },
              lotState: lot.lotState,
              unitCost: val ? {
                unitPrice: val.unitCost.unitPrice.toString(),
                currency: val.unitCost.currency,
                perUom: val.unitCost.perUom
              } : null,
              totalLotCost: val ? {
                amount: val.totalLotCost.amount.toString(),
                currency: val.totalLotCost.currency
              } : null,
              receivedAt: lot.receivedAt
            };
          }));

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 15. POST /api/pos/checkout (Execute Commercial Sale & Multi-Lot Fulfillment)
      if (method === 'POST' && pathname === '/api/pos/checkout') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');

            if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length === 0) {
              sendJson(400, { error: 'Sale checkout must contain at least one line with SKU and allocations' });
              return;
            }

            const command: ProcessSaleFulfillmentCommand = {
              organizationId: orgId,
              orderId: (parsed.orderId ?? crypto.randomUUID()) as any,
              orderNumber: parsed.orderNumber ?? `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
              channel: parsed.channel ?? 'RETAIL_POS',
              customerId: parsed.customerId,
              lines: parsed.lines.map((l: any) => {
                const qtyAmount = typeof l.quantity === 'object' ? l.quantity.amount : (l.orderedQuantity ? (typeof l.orderedQuantity === 'object' ? l.orderedQuantity.amount : l.orderedQuantity) : l.quantity);
                const qtyUom = typeof l.quantity === 'object' ? (l.quantity.uom || 'UNIT') : (l.orderedQuantity?.uom || 'UNIT');

                const priceAmount = typeof l.unitPrice === 'object' ? l.unitPrice.amount : l.unitPrice;
                const priceCurr = typeof l.unitPrice === 'object' ? (l.unitPrice.currency || 'IDR') : 'IDR';

                const discAmount = l.discountAmount ? (typeof l.discountAmount === 'object' ? l.discountAmount.amount : l.discountAmount) : undefined;
                const taxAmount = l.taxAmount ? (typeof l.taxAmount === 'object' ? l.taxAmount.amount : l.taxAmount) : undefined;

                return {
                  orderLineId: (l.orderLineId ?? crypto.randomUUID()) as any,
                  skuId: l.skuId,
                  orderedQuantity: Quantity.of(qtyAmount ?? 1, qtyUom),
                  unitPrice: Money.of(priceAmount ?? 0, priceCurr),
                  discountAmount: discAmount ? Money.of(discAmount, priceCurr) : undefined,
                  taxAmount: taxAmount ? Money.of(taxAmount, priceCurr) : undefined,
                  allocations: (l.allocations || []).map((a: any) => {
                    const aLotId = a.inventoryLotId || a.lotId;
                    const aQtyAmount = typeof a.allocatedQuantity === 'object' ? a.allocatedQuantity.amount : (a.quantity !== undefined ? a.quantity : a.allocatedQuantity);
                    const aQtyUom = typeof a.allocatedQuantity === 'object' ? (a.allocatedQuantity.uom || 'UNIT') : (a.uom || 'UNIT');
                    return {
                      inventoryLotId: aLotId,
                      allocatedQuantity: Quantity.of(aQtyAmount ?? 0, aQtyUom)
                    };
                  })
                };
              }),
              orderedAt: parsed.orderedAt ? new Date(parsed.orderedAt) : new Date()
            };

            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const result = await processSaleUseCase.execute(command, client);
              await client.query('COMMIT');

              sendJson(200, { data: result });
            } catch (err: any) {
              await client.query('ROLLBACK');
              console.error('POS Checkout error:', err);
              sendJson(400, {
                error: err.message || 'Failed to process commercial sale',
                errorName: err.name || 'Error'
              });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON payload: ' + jsonErr.message });
          }
        });
        return;
      }

      // 16. GET /api/commercial-orders (List Commercial Orders)
      if (method === 'GET' && pathname === '/api/commercial-orders') {
        const client = await pool.connect();
        try {
          const orders = await commercialRepo.listOrders(client, orgId);

          const enriched = await Promise.all(orders.map(async (order) => {
            const cogsRecords = await costingRepo.listCogsByOrder(client, orgId, order.orderId);
            let totalCogs = 0;
            cogsRecords.forEach(c => {
              totalCogs += Number(c.totalCogsAmount.amount);
            });

            const revenue = Number(order.grandTotal.amount);
            const grossMargin = revenue - totalCogs;
            const grossMarginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

            return {
              ...order,
              lineCount: order.lines.length,
              totalCogs: { amount: totalCogs.toFixed(2), currency: order.grandTotal.currency },
              grossMargin: {
                amount: grossMargin.toFixed(2),
                currency: order.grandTotal.currency,
                percentage: parseFloat(grossMarginPct.toFixed(2))
              }
            };
          }));

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 17. GET /api/commercial-orders/:orderId (Commercial Order Deep Inspector)
      if (method === 'GET' && pathname.startsWith('/api/commercial-orders/')) {
        const orderId = pathname.replace('/api/commercial-orders/', '');
        const client = await pool.connect();
        try {
          const order = await commercialRepo.findOrderById(client, orgId, orderId);
          if (!order) {
            sendJson(404, { error: `Commercial order '${orderId}' not found` });
            return;
          }

          const skus = await masterDataRepo.listSkus(client, orgId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const lots = await inventoryRepo.listLots(client, orgId);
          const cogsRecords = await costingRepo.listCogsByOrder(client, orgId, orderId);
          const customer = order.customerId ? await customerRepo.findCustomerById(client, orgId, order.customerId) : null;

          const skuMap = new Map(skus.map(s => [s.skuId, s]));
          const matMap = new Map(materials.map(m => [m.materialId, m]));
          const lotMap = new Map(lots.map(l => [l.inventoryLotId, l]));
          const cogsMap = new Map(cogsRecords.map(c => [c.fulfillmentAllocationId, c]));

          let orderTotalCogs = 0;
          cogsRecords.forEach(c => {
            orderTotalCogs += Number(c.totalCogsAmount.amount);
          });

          const revenue = Number(order.grandTotal.amount);
          const grossMargin = revenue - orderTotalCogs;
          const grossMarginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

          const enrichedLines = order.lines.map(line => {
            const sku = skuMap.get(line.skuId);
            const mat = matMap.get(line.materialId);

            const enrichedAllocations = line.allocations.map(alloc => {
              const lot = lotMap.get(alloc.inventoryLotId);
              const cogs = cogsMap.get(alloc.allocationId);
              return {
                ...alloc,
                lotNumber: lot?.lotNumber ?? 'UNKNOWN',
                resultingOnHand: lot ? lot.quantityOnHand.amount.toString() : '0',
                resultingAvailable: lot ? lot.getAvailableQuantity().amount.toString() : '0',
                unitCostSnapshot: cogs ? cogs.unitCostSnapshot.unitPrice.toString() : '0',
                totalCogsAmount: cogs ? cogs.totalCogsAmount.amount.toString() : '0'
              };
            });

            return {
              ...line,
              skuCode: sku?.skuCode ?? 'UNKNOWN',
              skuName: sku?.name ?? 'Unknown SKU',
              materialCode: mat?.code ?? 'UNKNOWN',
              allocations: enrichedAllocations
            };
          });

          sendJson(200, {
            data: {
              ...order,
              customerName: customer?.name ?? (order.channel === 'RETAIL_POS' ? 'Direct Retail POS' : 'Walk-in / Direct Customer'),
              customerCode: customer?.customerCode ?? 'N/A',
              customerType: customer?.customerType,
              lines: enrichedLines,
              totalCogs: { amount: orderTotalCogs.toFixed(2), currency: order.grandTotal.currency },
              grossMargin: {
                amount: grossMargin.toFixed(2),
                currency: order.grandTotal.currency,
                percentage: parseFloat(grossMarginPct.toFixed(2))
              }
            }
          });
          return;
        } finally {
          client.release();
        }
      }
      // 18. GET /api/customers (List Wholesale Customers)
      if (method === 'GET' && pathname === '/api/customers') {
        const client = await pool.connect();
        try {
          const customers = await customerRepo.listCustomers(client, orgId);
          sendJson(200, { data: customers });
          return;
        } finally {
          client.release();
        }
      }

      // 19. POST /api/wholesale/orders (Create Wholesale Commercial Order)
      if (method === 'POST' && pathname === '/api/wholesale/orders') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            if (!parsed.customerId) {
              sendJson(400, { error: 'customerId is required' });
              return;
            }
            if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length === 0) {
              sendJson(400, { error: 'Order must contain at least one line item' });
              return;
            }

            const command = {
              organizationId: orgId,
              orderId: parsed.orderId,
              orderNumber: parsed.orderNumber,
              customerId: parsed.customerId,
              status: parsed.status ?? 'DRAFT',
              orderedAt: parsed.orderedAt ? new Date(parsed.orderedAt) : new Date(),
              lines: parsed.lines.map((l: any) => {
                const qtyAmount = typeof l.quantity === 'object' ? l.quantity.amount : (l.orderedQuantity ? (typeof l.orderedQuantity === 'object' ? l.orderedQuantity.amount : l.orderedQuantity) : l.quantity);
                const qtyUom = typeof l.quantity === 'object' ? (l.quantity.uom || 'UNIT') : (l.orderedQuantity?.uom || 'UNIT');

                const priceAmount = typeof l.unitPrice === 'object' ? l.unitPrice.amount : l.unitPrice;
                const priceCurr = typeof l.unitPrice === 'object' ? (l.unitPrice.currency || 'IDR') : 'IDR';

                const discAmount = l.discountAmount ? (typeof l.discountAmount === 'object' ? l.discountAmount.amount : l.discountAmount) : undefined;
                const taxAmount = l.taxAmount ? (typeof l.taxAmount === 'object' ? l.taxAmount.amount : l.taxAmount) : undefined;

                return {
                  orderLineId: l.orderLineId,
                  skuId: l.skuId,
                  orderedQuantity: Quantity.of(qtyAmount ?? 1, qtyUom),
                  unitPrice: Money.of(priceAmount ?? 0, priceCurr),
                  discountAmount: discAmount ? Money.of(discAmount, priceCurr) : undefined,
                  taxAmount: taxAmount ? Money.of(taxAmount, priceCurr) : undefined
                };
              })
            };

            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const result = await wholesaleUseCase.createOrder(command as any, client);
              await client.query('COMMIT');
              sendJson(201, { data: result });
            } catch (err: any) {
              await client.query('ROLLBACK');
              console.error('Wholesale createOrder error:', err);
              sendJson(400, { error: err.message || 'Failed to create wholesale order' });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON payload: ' + jsonErr.message });
          }
        });
        return;
      }

      // 20. POST /api/wholesale/orders/:orderId/confirm (Confirm Wholesale Order)
      if (method === 'POST' && pathname.endsWith('/confirm') && pathname.includes('/api/wholesale/orders/')) {
        const orderId = pathname.replace('/api/wholesale/orders/', '').replace('/confirm', '');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const order = await wholesaleUseCase.confirmOrder(orgId, orderId, client);
          await client.query('COMMIT');
          sendJson(200, { data: order });
          return;
        } catch (err: any) {
          await client.query('ROLLBACK');
          console.error('Wholesale confirmOrder error:', err);
          sendJson(400, { error: err.message || 'Failed to confirm wholesale order' });
          return;
        } finally {
          client.release();
        }
      }

      // 21. POST /api/wholesale/orders/:orderId/reserve (Reserve Stock for Wholesale Order)
      if (method === 'POST' && pathname.endsWith('/reserve') && pathname.includes('/api/wholesale/orders/')) {
        const orderId = pathname.replace('/api/wholesale/orders/', '').replace('/reserve', '');
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            let rawItems: any[] = [];
            if (Array.isArray(parsed.reservations)) {
              rawItems = parsed.reservations;
            } else if (Array.isArray(parsed.lines)) {
              for (const l of parsed.lines) {
                const lineId = l.orderLineId || l.lineId;
                for (const a of (l.allocations || [])) {
                  rawItems.push({
                    orderLineId: lineId,
                    inventoryLotId: a.inventoryLotId || a.lotId,
                    quantityToReserve: a.quantityToReserve || a.allocatedQuantity || a.quantity
                  });
                }
              }
            }

            const reservations = rawItems.map((r: any) => {
              const qtyAmount = typeof r.quantityToReserve === 'object' ? r.quantityToReserve.amount : (r.quantity !== undefined ? r.quantity : r.quantityToReserve);
              const qtyUom = typeof r.quantityToReserve === 'object' ? (r.quantityToReserve.uom || 'UNIT') : (r.uom || 'UNIT');
              return {
                orderLineId: r.orderLineId,
                inventoryLotId: r.inventoryLotId || r.lotId,
                quantityToReserve: Quantity.of(qtyAmount, qtyUom)
              };
            });

            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const result = await wholesaleUseCase.reserveStock({
                organizationId: orgId,
                orderId: orderId as any,
                reservations
              }, client);
              await client.query('COMMIT');
              sendJson(200, { data: result });
            } catch (err: any) {
              await client.query('ROLLBACK');
              console.error('Wholesale reserveStock error:', err);
              sendJson(400, { error: err.message || 'Failed to reserve wholesale stock' });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON payload: ' + jsonErr.message });
          }
        });
        return;
      }

      // 22. POST /api/wholesale/orders/:orderId/fulfill (Fulfill & Dispatch Wholesale Order)
      if (method === 'POST' && pathname.endsWith('/fulfill') && pathname.includes('/api/wholesale/orders/')) {
        const orderId = pathname.replace('/api/wholesale/orders/', '').replace('/fulfill', '');
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            let rawItems: any[] = [];
            if (Array.isArray(parsed.fulfillments)) {
              rawItems = parsed.fulfillments;
            } else if (Array.isArray(parsed.lines)) {
              for (const l of parsed.lines) {
                const lineId = l.orderLineId || l.lineId;
                for (const a of (l.allocations || [])) {
                  rawItems.push({
                    orderLineId: lineId,
                    inventoryLotId: a.inventoryLotId || a.lotId,
                    quantityToFulfill: a.quantityToFulfill || a.allocatedQuantity || a.quantity
                  });
                }
              }
            }

            const fulfillments = rawItems.map((f: any) => {
              const qtyAmount = typeof f.quantityToFulfill === 'object' ? f.quantityToFulfill.amount : (f.quantity !== undefined ? f.quantity : f.quantityToFulfill);
              const qtyUom = typeof f.quantityToFulfill === 'object' ? (f.quantityToFulfill.uom || 'UNIT') : (f.uom || 'UNIT');
              return {
                orderLineId: f.orderLineId,
                inventoryLotId: f.inventoryLotId || f.lotId,
                quantityToFulfill: Quantity.of(qtyAmount, qtyUom)
              };
            });

            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const result = await wholesaleUseCase.fulfillOrder({
                organizationId: orgId,
                orderId: orderId as any,
                fulfillments
              }, client);
              await client.query('COMMIT');
              sendJson(200, { data: result.order, ...result });
            } catch (err: any) {
              await client.query('ROLLBACK');
              console.error('Wholesale fulfillOrder error:', err);
              sendJson(400, { error: err.message || 'Failed to fulfill wholesale order' });
            } finally {
              client.release();
            }
          } catch (jsonErr: any) {
            sendJson(400, { error: 'Invalid JSON payload: ' + jsonErr.message });
          }
        });
        return;
      }

      // 23. GET /api/wholesale/orders (List Wholesale Orders with Customers)
      if (method === 'GET' && pathname === '/api/wholesale/orders') {
        const client = await pool.connect();
        try {
          const orders = await commercialRepo.listOrders(client, orgId, 'WHOLESALE_CONTRACT');
          const customers = await customerRepo.listCustomers(client, orgId);
          const custMap = new Map(customers.map(c => [c.customerId, c]));

          const enriched = await Promise.all(orders.map(async (order) => {
            const customer = order.customerId ? custMap.get(order.customerId) : null;
            const cogsRecords = await costingRepo.listCogsByOrder(client, orgId, order.orderId);
            let totalCogs = 0;
            cogsRecords.forEach(c => {
              totalCogs += Number(c.totalCogsAmount.amount);
            });

            const revenue = Number(order.grandTotal.amount);
            const grossMargin = revenue - totalCogs;
            const grossMarginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

            const totalOrderedUnits = order.lines.reduce((s, l) => s + Number(l.orderedQuantity.amount), 0);
            const totalFulfilledUnits = order.lines.reduce((s, l) => s + Number(l.fulfilledQuantity.amount), 0);

            return {
              ...order,
              customerName: customer?.name ?? 'Unknown Customer',
              customerCode: customer?.customerCode ?? 'UNKNOWN',
              totalOrderedUnits,
              totalFulfilledUnits,
              totalCogs: { amount: totalCogs.toFixed(2), currency: order.grandTotal.currency },
              grossMargin: {
                amount: grossMargin.toFixed(2),
                currency: order.grandTotal.currency,
                percentage: parseFloat(grossMarginPct.toFixed(2))
              }
            };
          }));

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // Workstream 6: Blend Formulation & Execution (Phase 9 - Module 04)

      // 24. GET /api/blend-recipes (List Blend Recipes with Components & Materials)
      if (method === 'GET' && pathname === '/api/blend-recipes') {
        const client = await pool.connect();
        try {
          const recipes = await blendRecipeRepo.listRecipes(client, orgId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));

          const enriched = recipes.map(r => {
            const outMat = matMap.get(r.outputMaterialId);
            const enrichedComponents = r.components.map(c => {
              const compMat = matMap.get(c.materialId);
              return {
                ...c,
                targetRatioPercentage: c.targetRatioPercentage.toString(),
                materialCode: compMat?.code ?? 'UNKNOWN',
                materialName: compMat?.name ?? 'Unknown Material',
                materialCategory: compMat?.category ?? 'INTERMEDIARY_COFFEE'
              };
            });

            return {
              ...r,
              code: r.recipeCode,
              outputMaterialCode: outMat?.code ?? 'UNKNOWN',
              outputMaterialName: outMat?.name ?? 'Unknown Material',
              components: enrichedComponents
            };
          });

          sendJson(200, { data: enriched });
          return;
        } finally {
          client.release();
        }
      }

      // 25. GET /api/blend-recipes/:recipeId
      const recipeMatch = pathname.match(/^\/api\/blend-recipes\/([^\/]+)$/);
      if (method === 'GET' && recipeMatch) {
        const recipeId = recipeMatch[1] as any;
        const client = await pool.connect();
        try {
          const recipe = await blendRecipeRepo.findRecipeById(client, orgId, recipeId);
          if (!recipe) {
            sendJson(404, { error: `Blend recipe '${recipeId}' not found` });
            return;
          }

          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));
          const outMat = matMap.get(recipe.outputMaterialId);

          const enrichedComponents = recipe.components.map(c => {
            const compMat = matMap.get(c.materialId);
            return {
              ...c,
              targetRatioPercentage: c.targetRatioPercentage.toString(),
              materialCode: compMat?.code ?? 'UNKNOWN',
              materialName: compMat?.name ?? 'Unknown Material',
              materialCategory: compMat?.category ?? 'INTERMEDIARY_COFFEE'
            };
          });

          sendJson(200, {
            data: {
              ...recipe,
              code: recipe.recipeCode,
              outputMaterialCode: outMat?.code ?? 'UNKNOWN',
              outputMaterialName: outMat?.name ?? 'Unknown Material',
              components: enrichedComponents
            }
          });
          return;
        } finally {
          client.release();
        }
      }

      // Workstream 7: Global Traceability Explorer (Phase 9 - Module 08)

      // 26. GET /api/traceability/tree (Bi-directional Traceability Traversal by Lot # or Lot ID)
      if (method === 'GET' && pathname === '/api/traceability/tree') {
        const lotQuery = url.searchParams.get('lot');
        if (!lotQuery) {
          sendJson(400, { error: "Query parameter 'lot' (lot number or inventoryLotId) is required" });
          return;
        }

        const client = await pool.connect();
        try {
          const allLots = await inventoryRepo.listLots(client, orgId);
          const materials = await masterDataRepo.listMaterials(client, orgId);
          const matMap = new Map(materials.map(m => [m.materialId, m]));

          // Find root lot by ID or lot_number
          const rootLot = allLots.find(l => l.inventoryLotId === lotQuery || l.lotNumber.toLowerCase() === lotQuery.trim().toLowerCase());
          if (!rootLot) {
            sendJson(404, { error: `Inventory lot '${lotQuery}' not found in organization` });
            return;
          }

          const enrichLot = async (lot: any) => {
            const mat = matMap.get(lot.materialId);
            const val = await costingRepo.findLotValuation(client, orgId, lot.inventoryLotId);
            return {
              inventoryLotId: lot.inventoryLotId,
              lotNumber: lot.lotNumber,
              materialId: lot.materialId,
              materialCode: mat?.code ?? 'UNKNOWN',
              materialName: mat?.name ?? 'Unknown Material',
              materialCategory: mat?.category ?? 'RAW_MATERIAL',
              quantityOnHand: { amount: lot.quantityOnHand.amount.toString(), uom: lot.quantityOnHand.uom },
              reservedQuantity: { amount: lot.reservedQuantity.amount.toString(), uom: lot.reservedQuantity.uom },
              availableQuantity: { amount: lot.getAvailableQuantity().amount.toString(), uom: lot.quantityOnHand.uom },
              lotState: lot.lotState,
              receivedAt: lot.receivedAt,
              unitCost: val ? { unitPrice: val.unitCost.unitPrice.toString(), currency: val.unitCost.currency, perUom: val.unitCost.perUom } : undefined,
              totalLotCost: val ? { amount: val.totalLotCost.amount.toString(), currency: val.totalLotCost.currency } : undefined
            };
          };

          const rootLotEnriched = await enrichLot(rootLot);

          // 1. Traverse Upstream (Recursive backwards: targetLotId == currentLot)
          const upstreamTransformations: any[] = [];
          const upstreamSuppliers: any[] = [];
          const visitedUpstreamLots = new Set<string>();

          const traverseUpstream = async (currentLotId: string) => {
            if (visitedUpstreamLots.has(currentLotId)) return;
            visitedUpstreamLots.add(currentLotId);

            // Check if this lot came from a purchase receipt
            const receiptsRes = await client.query(
              `SELECT pr.*, sm.name as supplier_name, sm.supplier_code, po.po_number 
               FROM purchase_receipt pr
               JOIN supplier_master sm ON sm.organization_id = pr.organization_id AND sm.supplier_id = pr.supplier_id
               JOIN purchase_order po ON po.organization_id = pr.organization_id AND po.po_id = pr.po_id
               WHERE pr.organization_id = $1 AND pr.created_lot_id = $2`,
              [orgId, currentLotId]
            );

            for (const r of receiptsRes.rows) {
              upstreamSuppliers.push({
                supplierId: r.supplier_id,
                supplierCode: r.supplier_code,
                name: r.supplier_name,
                purchaseOrderId: r.po_id,
                poNumber: r.po_number,
                receiptId: r.receipt_id,
                receiptNumber: r.receipt_number,
                originLotReference: r.origin_lot_reference,
                receivedAt: r.received_at,
                forLotId: currentLotId
              });
            }

            // Find provenance edges where target is current lot
            const edges = await traceabilityRepo.findEdgesByTargetLot(client, orgId, currentLotId as any);
            for (const edge of edges) {
              const tx = await transformationRepo.findTransformationById(client, orgId, edge.transformationId);
              const batch = tx ? await transformationRepo.findBatchByTransformation(client, orgId, tx.transformationId) : null;
              const sourceLot = allLots.find(l => l.inventoryLotId === edge.sourceLotId);

              if (tx && sourceLot) {
                const enrichedSrc = await enrichLot(sourceLot);
                upstreamTransformations.push({
                  transformation: {
                    transformationId: tx.transformationId,
                    transformationNumber: tx.transformationNumber,
                    archetype: tx.archetype,
                    status: tx.status,
                    completedAt: tx.completedAt,
                    recipeOrProfileId: batch?.recipeOrProfileId
                  },
                  consumedLot: enrichedSrc,
                  consumedQuantity: { amount: edge.consumedQuantity.amount.toString(), uom: edge.consumedQuantity.uom },
                  resultingLotId: currentLotId
                });

                // Recurse to source lot
                await traverseUpstream(sourceLot.inventoryLotId);
              }
            }
          };

          await traverseUpstream(rootLot.inventoryLotId);

          // 2. Traverse Downstream (Recursive forwards: sourceLotId == currentLot)
          const downstreamTransformations: any[] = [];
          const downstreamCommercialFulfillments: any[] = [];
          const visitedDownstreamLots = new Set<string>();

          const traverseDownstream = async (currentLotId: string) => {
            if (visitedDownstreamLots.has(currentLotId)) return;
            visitedDownstreamLots.add(currentLotId);

            // Check if this lot was fulfilled in commercial orders (POS or Wholesale)
            const allocsRes = await client.query(
              `SELECT fa.*, col.sku_id, col.unit_price, sm.sku_code, sm.name as sku_name, co.order_id, co.order_number, co.channel, co.ordered_at, cust.name as customer_name, cust.customer_code
               FROM fulfillment_allocation fa
               JOIN commercial_order_line col ON col.organization_id = fa.organization_id AND col.order_line_id = fa.order_line_id
               JOIN sku_master sm ON sm.organization_id = col.organization_id AND sm.sku_id = col.sku_id
               JOIN commercial_order co ON co.organization_id = col.organization_id AND co.order_id = col.order_id
               LEFT JOIN customer_master cust ON cust.organization_id = co.organization_id AND cust.customer_id = co.customer_id
               WHERE fa.organization_id = $1 AND fa.inventory_lot_id = $2`,
              [orgId, currentLotId]
            );

            for (const a of allocsRes.rows) {
              downstreamCommercialFulfillments.push({
                orderId: a.order_id,
                orderNumber: a.order_number,
                channel: a.channel,
                customerName: a.customer_name ?? (a.channel === 'RETAIL_POS' ? 'Retail POS Counter' : 'Direct Customer'),
                customerCode: a.customer_code ?? 'N/A',
                skuId: a.sku_id,
                skuCode: a.sku_code,
                skuName: a.sku_name,
                fulfilledQuantity: { amount: a.allocated_quantity, uom: a.uom },
                fromLotId: currentLotId,
                allocatedAt: a.allocated_at
              });
            }

            // Find provenance edges where source is current lot
            const edges = await traceabilityRepo.findEdgesBySourceLot(client, orgId, currentLotId as any);
            for (const edge of edges) {
              const tx = await transformationRepo.findTransformationById(client, orgId, edge.transformationId);
              const batch = tx ? await transformationRepo.findBatchByTransformation(client, orgId, tx.transformationId) : null;
              const targetLot = allLots.find(l => l.inventoryLotId === edge.targetLotId);

              if (tx && targetLot) {
                const enrichedTgt = await enrichLot(targetLot);
                downstreamTransformations.push({
                  transformation: {
                    transformationId: tx.transformationId,
                    transformationNumber: tx.transformationNumber,
                    archetype: tx.archetype,
                    status: tx.status,
                    completedAt: tx.completedAt,
                    recipeOrProfileId: batch?.recipeOrProfileId
                  },
                  producedLot: enrichedTgt,
                  consumedQuantity: { amount: edge.consumedQuantity.amount.toString(), uom: edge.consumedQuantity.uom },
                  fromSourceLotId: currentLotId
                });

                // Recurse to target lot
                await traverseDownstream(targetLot.inventoryLotId);
              }
            }
          };

          await traverseDownstream(rootLot.inventoryLotId);

          sendJson(200, {
            data: {
              rootLot: rootLotEnriched,
              upstreamChain: {
                transformations: upstreamTransformations,
                suppliers: upstreamSuppliers
              },
              downstreamChain: {
                transformations: downstreamTransformations,
                commercialFulfillments: downstreamCommercialFulfillments
              }
            }
          });
          return;
        } finally {
          client.release();
        }
      }

      // Workstream 8: Operational Analytics & Cross-Module Intelligence (Phase 10 - Module 11)

      // 27. GET /api/analytics/inventory
      if (method === 'GET' && pathname === '/api/analytics/inventory') {
        const client = await pool.connect();
        try {
          const result = await analyticsService.getInventoryPosition(client, orgId);
          sendJson(200, { data: result });
          return;
        } finally {
          client.release();
        }
      }

      // 28. GET /api/analytics/transformations
      if (method === 'GET' && pathname === '/api/analytics/transformations') {
        const timeFilterKey = (url.searchParams.get('filter') || 'ALL') as any;
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');

        const filter = {
          filterKey: timeFilterKey,
          startDate: startDateParam ? new Date(startDateParam) : undefined,
          endDate: endDateParam ? new Date(endDateParam) : undefined
        };

        const client = await pool.connect();
        try {
          const result = await analyticsService.getTransformationPerformance(client, orgId, filter);
          sendJson(200, { data: result });
          return;
        } finally {
          client.release();
        }
      }

      // 29. GET /api/analytics/production-cost
      if (method === 'GET' && pathname === '/api/analytics/production-cost') {
        const client = await pool.connect();
        try {
          const result = await analyticsService.getProductionCostBreakdown(client, orgId);
          sendJson(200, { data: result });
          return;
        } finally {
          client.release();
        }
      }

      // 30. GET /api/analytics/commercial
      if (method === 'GET' && pathname === '/api/analytics/commercial') {
        const timeFilterKey = (url.searchParams.get('filter') || 'ALL') as any;
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');

        const filter = {
          filterKey: timeFilterKey,
          startDate: startDateParam ? new Date(startDateParam) : undefined,
          endDate: endDateParam ? new Date(endDateParam) : undefined
        };

        const client = await pool.connect();
        try {
          const result = await analyticsService.getCommercialPerformance(client, orgId, filter);
          sendJson(200, { data: result });
          return;
        } finally {
          client.release();
        }
      }

      // 31. GET /api/analytics/suppliers
      if (method === 'GET' && pathname === '/api/analytics/suppliers') {
        const timeFilterKey = (url.searchParams.get('filter') || 'ALL') as any;
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');

        const filter = {
          filterKey: timeFilterKey,
          startDate: startDateParam ? new Date(startDateParam) : undefined,
          endDate: endDateParam ? new Date(endDateParam) : undefined
        };

        const client = await pool.connect();
        try {
          const result = await analyticsService.getSupplierAnalytics(client, orgId, filter);
          sendJson(200, { data: result });
          return;
        } finally {
          client.release();
        }
      }

      // 32. GET /api/analytics/summary
      if (method === 'GET' && pathname === '/api/analytics/summary') {
        const timeFilterKey = (url.searchParams.get('filter') || 'ALL') as any;
        const client = await pool.connect();
        try {
          const result = await analyticsService.getGlobalSummary(client, orgId, timeFilterKey);
          sendJson(200, { data: result });
          return;
        } finally {
          client.release();
        }
      }

      // ----------------------------------------------------------------------
      // PHASE 11: OPERATIONAL INTELLIGENCE & DECISION SUPPORT ENDPOINTS
      // ----------------------------------------------------------------------

      // 33. GET /api/intelligence/summary
      if (method === 'GET' && pathname === '/api/intelligence/summary') {
        const client = await pool.connect();
        try {
          const result = await intelligenceService.getSummary(client, orgId);
          sendJson(200, { data: result });
          return;
        } finally {
          client.release();
        }
      }

      // 34. GET /api/intelligence/signals
      if (method === 'GET' && pathname === '/api/intelligence/signals') {
        const severityFilter = url.searchParams.get('severity');
        const domainFilter = url.searchParams.get('domain');

        const client = await pool.connect();
        try {
          let signals = await intelligenceService.evaluateSignals(client, orgId);
          if (severityFilter) {
            signals = signals.filter(s => s.severity === severityFilter.toUpperCase());
          }
          if (domainFilter) {
            signals = signals.filter(s => s.domain === domainFilter.toUpperCase());
          }
          sendJson(200, { data: signals });
          return;
        } finally {
          client.release();
        }
      }

      // 35. GET /api/intelligence/signals/:signalId
      if (method === 'GET' && pathname.startsWith('/api/intelligence/signals/')) {
        const signalId = pathname.replace('/api/intelligence/signals/', '');
        const client = await pool.connect();
        try {
          const signals = await intelligenceService.evaluateSignals(client, orgId);
          const matched = signals.find(s => s.signalId === signalId);
          if (!matched) {
            sendJson(404, { error: `Intelligence signal ${signalId} not found` });
            return;
          }
          sendJson(200, { data: matched });
          return;
        } finally {
          client.release();
        }
      }

      // ----------------------------------------------------------------------
      // PHASE 12: AI LAYER / OPERATIONAL REASONING ENDPOINTS
      // ----------------------------------------------------------------------

      // 36. POST /api/ai/query
      if (method === 'POST' && pathname === '/api/ai/query') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            if (!body.question || typeof body.question !== 'string') {
              sendJson(400, { error: 'Missing or invalid "question" field in request body' });
              return;
            }

            const client = await pool.connect();
            try {
              const result = await aiReasoningService.answerQuestion(client, orgId, {
                question: body.question,
                contextFilters: body.contextFilters
              });
              sendJson(200, { data: result });
              return;
            } finally {
              client.release();
            }
          } catch (e: any) {
            sendJson(400, { error: 'Malformed JSON payload: ' + e.message });
          }
        });
        return;
      }

      // 7. Static Frontend Files Serving

      const publicDir = getPublicDir();
      let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8'
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      sendJson(404, { error: `Route not found: ${method} ${pathname}` });
    } catch (err: any) {
      console.error('Server error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error: ' + err.message }));
    }
  });

  return server;
}
