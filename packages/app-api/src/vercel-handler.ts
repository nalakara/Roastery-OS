import type { IncomingMessage, ServerResponse } from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { PostgresConnectionPool } from '@roastery-os/infrastructure-postgres';
import { createApiHandler, ApiRequestHandler } from './server.js';
import { seedDatabase } from './seed-data.js';

let cachedHandler: ApiRequestHandler | null = null;
let initPromise: Promise<ApiRequestHandler> | null = null;

export async function getVercelApiHandler(): Promise<ApiRequestHandler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  if (!initPromise) {
    initPromise = (async () => {
      let pool: pg.Pool;

      if (process.env.DATABASE_URL) {
        pool = PostgresConnectionPool.getPool();
        await seedDatabase(pool);
      } else {
        const db = newDb();
        db.public.registerFunction({
          name: 'uuid_generate_v4',
          returns: db.public.getType('uuid' as any),
          implementation: () => '00000000-0000-0000-0000-000000000000'
        });
        const adapter = db.adapters.createPg();
        pool = new adapter.Pool();
        await seedDatabase(pool);
      }

      cachedHandler = createApiHandler({ pool });
      return cachedHandler;
    })();
  }

  return initPromise;
}

export default async function vercelHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const handler = await getVercelApiHandler();
  return handler(req, res);
}
