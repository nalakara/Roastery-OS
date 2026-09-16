# VERCEL DEPLOYMENT DISCOVERY — ROASTERY OS

## 1. Current Runtime Architecture

Roastery OS is built as a TypeScript monorepo using npm workspaces (`@roastery-os/contracts`, `@roastery-os/domain-core`, `@roastery-os/infrastructure-postgres`, `@roastery-os/application-services`, `@roastery-os/app-api`).

The runtime presentation and API tier resides in `packages/app-api`:
- **API Server Factory (`packages/app-api/src/server.ts`)**: Defines `createApiServer({ pool, defaultOrgId })` which wraps a native Node.js HTTP request handler (`http.createServer(async (req, res) => ...)`).
- **Static Assets (`packages/app-api/public/`)**: Contains `index.html`, `app.js`, `app.css`. The Node HTTP request handler in `server.ts` handles `/` and non-API paths by streaming static files from `packages/app-api/public`.
- **Standalone Bootstrap (`packages/app-api/src/index.ts`)**: When executed directly via `node dist/index.js` or `npm start`, it detects whether `DATABASE_URL` is set:
  - If `DATABASE_URL` is provided, it connects to PostgreSQL and runs `seedDatabase(pool)`.
  - If `DATABASE_URL` is absent, it spins up an embedded `pg-mem` in-memory database with synthetic operational seed data.
  - It then calls `server.listen(port)` on a long-running TCP port.

## 2. Why `server.listen()` is Incompatible with Vercel

Vercel is a serverless execution platform:
- Vercel does not run long-running stateful Node daemon processes listening on arbitrary TCP sockets via `server.listen()`.
- Instead, incoming HTTP requests to Vercel Serverless Functions invoke a request listener handler conforming to `(req: IncomingMessage, res: ServerResponse) => void | Promise<void>` (or exported as a default handler in an `api/` endpoint).
- Calling `server.listen()` in a serverless environment either throws a port binding error or causes the invocation to hang/timeout without responding.

## 3. Proposed Vercel Entrypoint

We preserve `packages/app-api/src/server.ts` and `packages/app-api/src/index.ts` completely for local development, while exposing the underlying HTTP request listener as `createApiHandler({ pool, defaultOrgId })`.

We then provide a clean root-level Vercel Serverless Function entrypoint at `api/index.ts`:
```typescript
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getVercelApiHandler } from '../packages/app-api/src/vercel-handler.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const apiHandler = await getVercelApiHandler();
  return apiHandler(req, res);
}
```
Where `getVercelApiHandler()` lazily initializes and reuses a cached database pool (connecting via `DATABASE_URL` with automatic schema initialization/seeding or fallback to embedded `pg-mem`), avoiding connection storming across warm serverless invocations.

## 4. Static Asset Strategy

- The frontend static files live in `packages/app-api/public` (`index.html`, `app.js`, `app.css`).
- On Vercel, static files can be served natively at the edge via standard Vercel configuration or copied/symlinked/routed so that requests for `/`, `/app.js`, `/app.css`, `/index.html` are handled directly as high-performance static assets without spinning up a serverless function invocation.
- In `vercel.json`, we configure clean routing:
  - Static requests (`/`, `/app.js`, `/app.css`, `/index.html`) resolve to the static output directory `packages/app-api/public`.
  - All API routes (`/api/(.*)`) route to `/api/index.ts` (the serverless function).

## 5. API Routing Strategy

- All frontend fetch calls in `packages/app-api/public/app.js` target `/api/*` endpoints (e.g., `/api/today`, `/api/inventory-lots`, `/api/transformations`, `/api/purchase-orders`, `/api/commercial-orders`, `/api/ai/query`).
- In `vercel.json`:
  ```json
  {
    "version": 2,
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api/index.ts" }
    ]
  }
  ```
- The API handler receives the original `req.url` (e.g. `/api/today`), strips or preserves the pathname, and matches the exact same routes defined in `server.ts`.

## 6. Build Strategy

- **Root Build**: `tsc -b tsconfig.json` compiles the entire monorepo in topological order (`contracts` -> `domain-core` -> `infrastructure-postgres` -> `application-services` -> `app-api`).
- **Root `tsconfig.json`**: Add `{ "path": "./api" }` or configure `api/tsconfig.json` extending `tsconfig.base.json` so that `api/index.ts` is type-checked and compiled as part of the standard monorepo composite build without weakening any strictness flags.

## 7. Required Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Optional | Connection string for live PostgreSQL (e.g. Neon, Supabase, Vercel Postgres). If not provided, fallback in-memory engine `pg-mem` initializes automatically so the preview works out of the box. |
| `NODE_ENV` | Optional | Defaults to `production` in Vercel. |

## 8. Local Development Preservation

- Running `npm run build` from root builds all packages.
- Running `npm start` in `packages/app-api` (or `npm run start --workspace=@roastery-os/app-api`) still executes `node dist/index.js`, which starts the HTTP server with `server.listen(port)` on `http://localhost:3000`.
- All existing tests (`npm test`) continue to instantiate `createApiServer` and verify HTTP endpoints identically.

## 9. PostgreSQL & Persistent Server State Considerations

1. **Connection Pooling in Serverless**:
   In serverless environments (Vercel Functions), each function container may spin up independently. Reusing the pool instance at module scope in `getVercelApiHandler()` ensures persistent connections per warm container.
2. **Database Schema & Migrations**:
   When connecting to a real `DATABASE_URL`, `seedDatabase(pool)` ensures table DDL idempotency (`CREATE TABLE IF NOT EXISTS`) and seeds initial sample records if absent.
3. **In-Memory Fallback (`pg-mem`)**:
   If no `DATABASE_URL` is set in Vercel, `pg-mem` will initialize in memory per container. Any mutations (e.g. receiving a new PO) will persist during the life of that serverless container. For production persistence across all instances, `DATABASE_URL` should be configured in Vercel Project Settings.
