import pg from 'pg';
import { PostgresConnectionPool } from './connection.js';
import { INITIAL_SCHEMA_DDL } from './schema-ddl.js';

export class SchemaMigrationRunner {
  public static async runMigrations(clientOrPool?: pg.PoolClient | pg.Pool): Promise<void> {
    const db = clientOrPool ?? PostgresConnectionPool.getPool();
    await db.query(INITIAL_SCHEMA_DDL);
  }
}
