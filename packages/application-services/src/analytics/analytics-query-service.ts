import pg from 'pg';
import { 
  OrganizationId,
  InventoryPositionAnalyticsResponse,
  TransformationPerformanceAnalyticsResponse,
  ProductionCostAnalyticsResponse,
  CommercialPerformanceAnalyticsResponse,
  SupplierAnalyticsResponse,
  GlobalOperationalAnalyticsSummary
} from '@roastery-os/contracts';
import { 
  AnalyticsPostgresRepository, 
  AnalyticsTimeFilter 
} from '@roastery-os/infrastructure-postgres';

export class AnalyticsQueryService {
  constructor(
    private readonly analyticsRepo: AnalyticsPostgresRepository
  ) {}

  public async getInventoryPosition(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<InventoryPositionAnalyticsResponse> {
    return this.analyticsRepo.getInventoryPositionAnalytics(client, organizationId);
  }

  public async getTransformationPerformance(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filter?: AnalyticsTimeFilter
  ): Promise<TransformationPerformanceAnalyticsResponse> {
    return this.analyticsRepo.getTransformationPerformanceAnalytics(client, organizationId, filter);
  }

  public async getProductionCostBreakdown(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<ProductionCostAnalyticsResponse> {
    return this.analyticsRepo.getProductionCostAnalytics(client, organizationId);
  }

  public async getCommercialPerformance(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filter?: AnalyticsTimeFilter
  ): Promise<CommercialPerformanceAnalyticsResponse> {
    return this.analyticsRepo.getCommercialPerformanceAnalytics(client, organizationId, filter);
  }

  public async getSupplierAnalytics(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filter?: AnalyticsTimeFilter
  ): Promise<SupplierAnalyticsResponse> {
    return this.analyticsRepo.getSupplierAnalytics(client, organizationId, filter);
  }

  public async getGlobalSummary(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filterKey: 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' = 'ALL'
  ): Promise<GlobalOperationalAnalyticsSummary> {
    return this.analyticsRepo.getGlobalOperationalSummary(client, organizationId, filterKey);
  }
}
