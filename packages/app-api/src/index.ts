import { newDb } from 'pg-mem';
import pg from 'pg';
import { PostgresConnectionPool } from '@roastery-os/infrastructure-postgres';
import { createApiServer } from './server.js';
import { seedDatabase } from './seed-data.js';

export * from './server.js';
export * from './seed-data.js';
export * from './vercel-handler.js';

async function bootstrap() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  let pool: pg.Pool;

  if (process.env.DATABASE_URL) {
    console.log(`Connecting to real PostgreSQL instance via DATABASE_URL...`);
    pool = PostgresConnectionPool.getPool();
    await seedDatabase(pool);
  } else {
    console.log(`No DATABASE_URL supplied. Starting embedded in-memory PostgreSQL engine with realistic seed data...`);
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

  const server = createApiServer({ pool, port });
  server.listen(port, () => {
    console.log(`Roastery OS : Operational Console listening on http://localhost:${port}`);
    console.log(`Console URL: http://localhost:${port}/index.html\n`);
  });
}

// If run directly
if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.ts'))) {
  bootstrap().catch(err => {
    console.error('Failed to start Roastery OS App API Server:', err);
    process.exit(1);
  });
}
