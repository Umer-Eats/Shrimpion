// Vercel serverless function: POST /api/rpc → Turso game data (see server/rpc.js).
import { nodeHandler } from '../server/rpc.js';

export default function handler(req, res) {
  return nodeHandler(req, res);
}
