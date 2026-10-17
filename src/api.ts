// @ts-nocheck
import { createServer } from 'node:http';
export function startApi(service: any, port = 8080) { const server = createServer(async (req, res) => { try { if (req.method === 'GET' && req.url === '/recovery-points') return json(res, 200, await service.points()); const match = req.url?.match(/^\/recovery-points\/([^/]+)\/verify$/); if (req.method === 'POST' && match) return json(res, 200, await service.verify(match[1])); res.writeHead(404); res.end(); } catch (e) { json(res, 400, { error: e.message }); } }); return new Promise(resolve => server.listen(port, () => resolve(server))); }
function json(res: any, status: number, value: unknown) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); }
