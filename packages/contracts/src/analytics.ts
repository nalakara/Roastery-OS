import { 
  MaterialId, 
  SkuId, 
  InventoryLotId, 
  SupplierId, 
  TransformationId 
} from './identifiers.js';
import { 
  MaterialCategory, 
  LotState, 
  TransformationArchetype, 
  CommercialSalesChannel
} from './vocabularies.js';
import { Uom } from './value-objects.js';

// Clean String/JSON-serializable Read Model Contracts for Analytics

export interface AnalyticsQuantityDto {
  readonly amount: string;
  readonly uom: Uom | string;
}

export interface AnalyticsMoneyDto {
  readonly amount: string;
  readonly currency: string;
}

export interface AnalyticsUnitCostDto {
  readonly unitPrice: string;
  readonly currency: string;
  readonly perUom: Uom | string;
}

// 1. Inventory Position Read Models
export interface InventoryLotPositionSummary {
  readonly inventoryLotId: InventoryLotId;
  readonly lotNumber: string;
  readonly materialId: MaterialId;
  readonly materialCode: string;
  readonly materialName: string;
  readonly materialCategory: MaterialCategory;
  readonly quantityOnHand: AnalyticsQuantityDto;
  readonly reservedQuantity: AnalyticsQuantityDto;
  readonly availableQuantity: AnalyticsQuantityDto;
  readonly lotState: LotState;
  readonly receivedAt: Date;
  readonly ageDays: number;
  readonly unitCost?: AnalyticsUnitCostDto;
  readonly totalLotCost?: AnalyticsMoneyDto;
}

export interface InventoryCategorySummary {
  readonly category: MaterialCategory;
  readonly lotCount: number;
  readonly totalValuation: AnalyticsMoneyDto;
}

export interface InventoryPositionAnalyticsResponse {
  readonly totalLots: number;
  readonly activeLotsCount: number;
  readonly depletedLotsCount: number;
  readonly quarantinedLotsCount: number;
  readonly totalValuation: AnalyticsMoneyDto;
  readonly categorySummaries: readonly InventoryCategorySummary[];
  readonly lots: readonly InventoryLotPositionSummary[];
}

// 2. Transformation Performance Read Models
export interface TransformationPerformanceItem {
  readonly transformationId: TransformationId;
  readonly transformationNumber: string;
  readonly archetype: TransformationArchetype;
  readonly status: string;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly recipeOrProfileId?: string;
  
  // Physical Yield (separated by compatible UOM)
  readonly primaryInputQuantity?: AnalyticsQuantityDto;
  readonly primaryOutputQuantity?: AnalyticsQuantityDto;
  readonly unrecoverableWasteQuantity?: AnalyticsQuantityDto;
  readonly yieldRatio?: string; // e.g. "0.8333" for 83.33%
  
  // Economic Conversion
  readonly consumedMaterialCost?: AnalyticsMoneyDto;
  readonly directConversionCost: AnalyticsMoneyDto;
  readonly totalOutputCost?: AnalyticsMoneyDto;
}

export interface TransformationArchetypeSummary {
  readonly archetype: TransformationArchetype;
  readonly completedCount: number;
  readonly totalConversionCost: AnalyticsMoneyDto;
}

export interface TransformationPerformanceAnalyticsResponse {
  readonly totalTransformations: number;
  readonly completedCount: number;
  readonly inProgressCount: number;
  readonly totalConversionCosts: AnalyticsMoneyDto;
  readonly archetypeSummaries: readonly TransformationArchetypeSummary[];
  readonly transformations: readonly TransformationPerformanceItem[];
}

// 3. Production Cost Read Models
export interface ProducedLotCostItem {
  readonly inventoryLotId: InventoryLotId;
  readonly lotNumber: string;
  readonly materialId: MaterialId;
  readonly materialCode: string;
  readonly materialName: string;
  readonly materialCategory: MaterialCategory;
  readonly transformationId?: TransformationId;
  readonly transformationNumber?: string;
  readonly archetype?: TransformationArchetype;
  readonly quantityOnHand: AnalyticsQuantityDto;
  readonly materialCost: AnalyticsMoneyDto;
  readonly conversionCost: AnalyticsMoneyDto;
  readonly totalLotCost: AnalyticsMoneyDto;
  readonly unitCost: AnalyticsUnitCostDto;
  readonly calculatedAt: Date;
}

export interface ProductionCostAnalyticsResponse {
  readonly totalProducedLots: number;
  readonly totalMaterialCostAccumulated: AnalyticsMoneyDto;
  readonly totalConversionCostAccumulated: AnalyticsMoneyDto;
  readonly grandTotalCostAccumulated: AnalyticsMoneyDto;
  readonly producedLots: readonly ProducedLotCostItem[];
}

// 4. Commercial Performance Read Models
export interface CommercialSkuSalesSummary {
  readonly skuId: SkuId;
  readonly skuCode: string;
  readonly skuName: string;
  readonly totalUnitsSold: AnalyticsQuantityDto;
  readonly totalRevenue: AnalyticsMoneyDto;
  readonly totalCogs: AnalyticsMoneyDto;
  readonly grossMarginAmount: AnalyticsMoneyDto;
  readonly grossMarginPercentage: string; // e.g. "40.50"
}

export interface CommercialChannelSummary {
  readonly channel: CommercialSalesChannel;
  readonly orderCount: number;
  readonly totalRevenue: AnalyticsMoneyDto;
  readonly totalCogs: AnalyticsMoneyDto;
  readonly grossMarginAmount: AnalyticsMoneyDto;
  readonly grossMarginPercentage: string;
}

export interface CommercialPerformanceAnalyticsResponse {
  readonly totalOrders: number;
  readonly completedOrdersCount: number;
  readonly totalRevenue: AnalyticsMoneyDto;
  readonly totalCogs: AnalyticsMoneyDto;
  readonly totalGrossMargin: AnalyticsMoneyDto;
  readonly overallGrossMarginPercentage: string;
  readonly channelSummaries: readonly CommercialChannelSummary[];
  readonly skuSummaries: readonly CommercialSkuSalesSummary[];
}

// 5. Supplier Contribution Read Models
export interface SupplierMaterialSpendItem {
  readonly supplierId: SupplierId;
  readonly supplierCode: string;
  readonly supplierName: string;
  readonly materialId: MaterialId;
  readonly materialCode: string;
  readonly materialName: string;
  readonly totalReceivedQuantity: AnalyticsQuantityDto;
  readonly totalSpendAmount: AnalyticsMoneyDto;
  readonly receiptCount: number;
  readonly lastReceivedAt: Date;
}

export interface SupplierContributionSummary {
  readonly supplierId: SupplierId;
  readonly supplierCode: string;
  readonly supplierName: string;
  readonly totalReceipts: number;
  readonly totalSpend: AnalyticsMoneyDto;
  readonly suppliedMaterials: readonly {
    readonly materialCode: string;
    readonly materialName: string;
    readonly quantity: AnalyticsQuantityDto;
  }[];
}

export interface SupplierAnalyticsResponse {
  readonly totalSuppliers: number;
  readonly totalReceiptsCount: number;
  readonly totalProcurementSpend: AnalyticsMoneyDto;
  readonly supplierSummaries: readonly SupplierContributionSummary[];
  readonly materialBreakdown: readonly SupplierMaterialSpendItem[];
}

// 6. Global Operational Summary Response (Combined Read Model)
export interface GlobalOperationalAnalyticsSummary {
  readonly asOfDate: Date;
  readonly timeFilter: string; // 'ALL', 'TODAY', 'LAST_7_DAYS', 'THIS_MONTH'
  readonly inventory: {
    readonly totalActiveLots: number;
    readonly totalValuation: AnalyticsMoneyDto;
  };
  readonly production: {
    readonly completedTransformations: number;
    readonly totalConversionCost: AnalyticsMoneyDto;
  };
  readonly commercial: {
    readonly totalOrders: number;
    readonly totalRevenue: AnalyticsMoneyDto;
    readonly totalCogs: AnalyticsMoneyDto;
    readonly grossMargin: AnalyticsMoneyDto;
    readonly grossMarginPercentage: string;
  };
  readonly procurement: {
    readonly totalReceipts: number;
    readonly totalSpend: AnalyticsMoneyDto;
  };
}
