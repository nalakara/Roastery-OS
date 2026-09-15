import pg from 'pg';
import { PostgresConnectionPool } from './connection.js';

export class PostgresTransactionManager {
  /**
   * Executes a unit of work inside an atomic PostgreSQL transaction.
   * Automatically handles BEGIN, COMMIT, and ROLLBACK.
   */
  public static async withTransaction<T>(
    work: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const pool = PostgresConnectionPool.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
