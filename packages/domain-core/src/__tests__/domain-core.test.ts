import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  Quantity, 
  Money, 
  UnitCost, 
  DecimalValue, 
  InventoryLot,
  IncompatibleUomDimensionError,
  NegativeQuantityError,
  ReservationExceedsBalanceError
} from '../index.js';
import { OrganizationId, MaterialId, InventoryLotId } from '@roastery-os/contracts';

describe('Domain Core Foundation Tests', () => {
  describe('DecimalValue', () => {
    it('should maintain exact decimal precision and avoid float drift', () => {
      const a = DecimalValue.from('0.1');
      const b = DecimalValue.from('0.2');
      const sum = a.add(b);
      assert.equal(sum.toString(), '0.3');
      assert.equal(sum.toFixed(2), '0.30');
    });
  });

  describe('Quantity & UOM Dimension Compatibility', () => {
    it('should add same-UOM quantities correctly', () => {
      const q1 = Quantity.of('5.5', 'KG');
      const q2 = Quantity.of('4.5', 'KG');
      const result = q1.add(q2);
      assert.equal(result.amount.toString(), '10');
      assert.equal(result.uom, 'KG');
    });

    it('should add compatible mass UOMs (KG and G)', () => {
      const q1 = Quantity.of('1.5', 'KG');
      const q2 = Quantity.of('500', 'G');
      const result = q1.add(q2);
      assert.equal(result.amount.toString(), '2');
      assert.equal(result.uom, 'KG');
    });

    it('should reject arithmetic between incompatible dimensions (KG and UNIT)', () => {
      const mass = Quantity.of('10', 'KG');
      const count = Quantity.of('5', 'UNIT');
      assert.throws(() => mass.add(count), IncompatibleUomDimensionError);
    });

    it('should reject arithmetic between incompatible dimensions (L and KG)', () => {
      const volume = Quantity.of('10', 'L');
      const mass = Quantity.of('5', 'KG');
      assert.throws(() => volume.sub(mass), IncompatibleUomDimensionError);
    });

    it('should reject negative physical quantities for state balances', () => {
      assert.throws(() => Quantity.of('-1', 'KG'), NegativeQuantityError);
    });
  });

  describe('Money & Financial Precision', () => {
    it('should add monetary values with matching currencies', () => {
      const m1 = Money.of('150000', 'IDR');
      const m2 = Money.of('25000', 'IDR');
      const total = m1.add(m2);
      assert.equal(total.amount.toString(), '175000');
      assert.equal(total.currency, 'IDR');
    });

    it('should scale monetary values exactly', () => {
      const m = Money.of('100000', 'IDR');
      const scaled = m.scale('1.11'); // e.g. 11% tax
      assert.equal(scaled.amount.toString(), '111000');
    });
  });

  describe('UnitCost & Valuation Logic', () => {
    it('should calculate total cost for matching UOM', () => {
      const unitCost = UnitCost.of('120000', 'IDR', 'KG');
      const qty = Quantity.of('2.5', 'KG');
      const total = unitCost.totalCostFor(qty);
      assert.equal(total.amount.toString(), '300000');
      assert.equal(total.currency, 'IDR');
    });

    it('should calculate total cost for compatible UOM (G to KG unit cost)', () => {
      const unitCost = UnitCost.of('120000', 'IDR', 'KG');
      const qty = Quantity.of('500', 'G');
      const total = unitCost.totalCostFor(qty);
      assert.equal(total.amount.toString(), '60000');
      assert.equal(total.currency, 'IDR');
    });
  });

  describe('InventoryLot Invariants & Availability', () => {
    const orgId = 'org-1' as OrganizationId;
    const matId = 'mat-1' as MaterialId;
    const lotId = 'lot-1' as InventoryLotId;

    it('should calculate available quantity accurately', () => {
      const lot = new InventoryLot({
        organizationId: orgId,
        inventoryLotId: lotId,
        lotNumber: 'LOT-2026-001',
        materialId: matId,
        quantityOnHand: Quantity.of('100', 'KG'),
        reservedQuantity: Quantity.of('30', 'KG'),
        lotState: 'ACTIVE',
        receivedAt: new Date()
      });

      assert.equal(lot.getAvailableQuantity().amount.toString(), '70');
    });

    it('should enforce reservation invariant: reserved <= onHand', () => {
      assert.throws(
        () => new InventoryLot({
          organizationId: orgId,
          inventoryLotId: lotId,
          lotNumber: 'LOT-2026-001',
          materialId: matId,
          quantityOnHand: Quantity.of('50', 'KG'),
          reservedQuantity: Quantity.of('60', 'KG'),
          lotState: 'ACTIVE',
          receivedAt: new Date()
        }),
        ReservationExceedsBalanceError
      );
    });
  });
});
