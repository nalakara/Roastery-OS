import pg from 'pg';

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  max?: number;
}

export class PostgresConnectionPool {
  private static pool: pg.Pool | null = null;

  public static initialize(config: DatabaseConfig): pg.Pool {
    if (!this.pool) {
      this.pool = new pg.Pool({
        ...config,
        max: config.max ?? 20
      });
    }
    return this.pool;
  }

  public static getPool(): pg.Pool {
    if (!this.pool) {
      this.pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/roastery_os'
      });
    }
    return this.pool;
  }

  public static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
