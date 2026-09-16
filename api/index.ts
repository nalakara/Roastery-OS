import type { IncomingMessage, ServerResponse } from 'node:http';
import { getVercelApiHandler } from '../packages/app-api/src/vercel-handler.js';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiHandler = await getVercelApiHandler();
  return apiHandler(req, res);
}
