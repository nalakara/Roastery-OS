// 1. Material Classification [FROZEN]
export type MaterialCategory = 
  | 'RAW_MATERIAL'
  | 'INTERMEDIARY_COFFEE'
  | 'PACKAGING_MATERIAL'
  | 'CONSUMABLE'
  | 'FINISHED_GOOD';

// 2. Packaging Format Classification [PROPOSED]
export type PackagingType = 
  | 'BAG_250G'
  | 'BAG_1KG'
  | 'DRIP_BOX_10CT'
  | 'BOTTLE_250ML'
  | 'BULK_TUB'
  | 'CUSTOM';

// 3. Physical Lot Availability State [FROZEN]
export type LotState = 
  | 'ACTIVE'
  | 'QUARANTINED'
  | 'DEPLETED';

// 4. Authoritative Physical Ledger Movement Types [FROZEN]
export type StockLedgerMovementType = 
  | 'PURCHASE_RECEIPT'
  | 'TRANSFORMATION_CONSUME'
  | 'TRANSFORMATION_YIELD'
  | 'COMMERCIAL_DISPATCH'
  | 'RESTOCK'
  | 'ADJUSTMENT_LOSS'
  | 'ADJUSTMENT_GAIN';

// 5. Transformation Archetypes [FROZEN]
export type TransformationArchetype = 
  | 'ROASTING'
  | 'BLENDING'
  | 'EXTRACTION_COLD_BREW'
  | 'GRINDING'
  | 'ASSEMBLY_PACKAGING'
  | 'REPACKAGING';

// 6. Transformation Lifecycle State [PROPOSED]
export type TransformationStatus = 
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

// 7. Transformation Output Classifications [FROZEN]
export type TransformationOutputType = 
  | 'PRIMARY_PRODUCT'
  | 'CO_PRODUCT'
  | 'BY_PRODUCT'
  | 'RECOVERABLE_RESIDUE'
  | 'UNRECOVERABLE_WASTE';

// 8. Batch Execution Context Types [PROPOSED]
export type BatchType = 
  | 'ROAST_BATCH'
  | 'BLEND_BATCH'
  | 'PRODUCTION_BATCH'
  | 'PACKAGING_BATCH';

// 9. Batch Execution Status [PROPOSED]
export type BatchStatus = 
  | 'PLANNED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'ABORTED';

// 10. Non-Inventory Conversion Expense Categories [FROZEN]
export type CostEventCategory = 
  | 'DIRECT_LABOR'
  | 'ENERGY_UTILITIES'
  | 'MACHINE_USAGE'
  | 'DIRECT_SERVICE_FEE'
  | 'DIRECT_OVERHEAD';

// 11. Cost Allocation Policies across Transformation Outputs [FROZEN]
export type CostAllocationPolicy = 
  | 'FULL_ABSORPTION'
  | 'MASS_PRO_RATA'
  | 'VOLUME_PRO_RATA'
  | 'NET_REALIZABLE_VALUE'
  | 'NOMINAL_SECONDARY_CREDIT'
  | 'FIXED_RATIO';

// 12. Direct Cost Distribution Driver for CostEvents [PROPOSED]
export type CostAllocationBasis = 
  | 'BATCH_FIXED'
  | 'MASS_PROPORTIONAL'
  | 'VOLUME_PROPORTIONAL'
  | 'TIME_DURATION';

// 13. Traceability Edge Classification [PROPOSED]
export type ProvenanceEdgeType = 
  | 'MATERIAL_CONSUMPTION'
  | 'ASSEMBLY_COMPONENT'
  | 'SPLIT_OUTPUT';

// 14. Commercial Sales Channels [PROPOSED]
export type CommercialSalesChannel = 
  | 'RETAIL_POS'
  | 'WHOLESALE_CONTRACT'
  | 'ECOMMERCE';

// 15. Commercial Order Lifecycle State [PROPOSED]
export type CommercialOrderStatus = 
  | 'DRAFT'
  | 'CONFIRMED'
  | 'RESERVED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

// 16. Commercial Order Line Status [PROPOSED]
export type CommercialOrderLineStatus = 
  | 'PENDING'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'CANCELLED';
