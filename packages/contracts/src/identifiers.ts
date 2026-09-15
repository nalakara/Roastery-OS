// Core Tenant Identifier
export type OrganizationId = string & { readonly __brand: unique symbol };

// Master Data Identifiers (01_MASTER_DATA)
export type MaterialId = string & { readonly __brand: unique symbol };
export type ProductId = string & { readonly __brand: unique symbol };
export type SkuId = string & { readonly __brand: unique symbol };

// Physical Inventory Identifiers (02_INVENTORY_ENGINE)
export type InventoryLotId = string & { readonly __brand: unique symbol };
export type MovementId = string & { readonly __brand: unique symbol };
export type StorageLocationId = string & { readonly __brand: unique symbol };

// Core Transformation & Execution Identifiers
export type TransformationId = string & { readonly __brand: unique symbol };
export type TransformationInputId = string & { readonly __brand: unique symbol };
export type TransformationOutputId = string & { readonly __brand: unique symbol };
export type BatchId = string & { readonly __brand: unique symbol };
export type EquipmentId = string & { readonly __brand: unique symbol };
export type OperatorId = string & { readonly __brand: unique symbol };

// Economic Costing Identifiers (07_COSTING_ENGINE)
export type CostEventId = string & { readonly __brand: unique symbol };
export type ValuationRecordId = string & { readonly __brand: unique symbol };
export type CogsRecordId = string & { readonly __brand: unique symbol };

// Traceability Identifiers (08_BATCH_TRACEABILITY)
export type ProvenanceEdgeId = string & { readonly __brand: unique symbol };

// Supplier System Identifiers (09_SUPPLIER_SYSTEM)
export type SupplierId = string & { readonly __brand: unique symbol };
export type PurchaseOrderId = string & { readonly __brand: unique symbol };
export type PurchaseOrderLineId = string & { readonly __brand: unique symbol };
export type PurchaseReceiptId = string & { readonly __brand: unique symbol };

// Commercial Sales & Fulfillment Identifiers (06_POS_ENGINE / 10_CUSTOMER_WHOLESALE)
export type CommercialOrderId = string & { readonly __brand: unique symbol };
export type CommercialOrderLineId = string & { readonly __brand: unique symbol };
export type FulfillmentAllocationId = string & { readonly __brand: unique symbol };
export type CustomerId = string & { readonly __brand: unique symbol };

// Blend Engine Identifiers (04_BLEND_ENGINE)
export type BlendRecipeId = string & { readonly __brand: unique symbol };
export type BlendRecipeComponentId = string & { readonly __brand: unique symbol };

