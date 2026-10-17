// @ts-nocheck
import { createServer } from 'node:http';
function json(res: any, status: number, value: unknown) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); }
async function body(req: any) { let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 1024 * 1024) throw new Error('request body too large'); } return data ? JSON.parse(data) : {}; }
export function startManagementServer(options: any, port = 8080) {
  const { backup, agent, state, audit, restoreRoot } = options;
  const server = createServer(async (req, res) => { const url = new URL(req.url || '/', 'http://localhost'); const parts = url.pathname.split('/').filter(Boolean); try {
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'aegisvault-management' });
    if (req.method === 'GET' && url.pathname === '/status') return json(res, 200, { status: 'ok', agents: await state.agents(), partitions: await agent.partitions() });
    if (req.method === 'GET' && url.pathname === '/partitions') return json(res, 200, await agent.partitions());
    if (req.method === 'GET' && url.pathname === '/logs') return json(res, 200, await audit.list());
    if (req.method === 'GET' && url.pathname === '/recovery-points') return json(res, 200, await backup.points());
    if (req.method === 'POST' && url.pathname === '/agents/register') { const item = { ...agent.identity(), ...(await body(req)), lastHeartbeat: new Date().toISOString(), online: true }; await state.register(item); await audit.record('info', 'agent', 'registered', { agentId: item.id }); return json(res, 201, item); }
    if (req.method === 'POST' && parts[0] === 'agents' && parts[2] === 'heartbeat') { const item = await state.agent(parts[1]); if (!item) return json(res, 404, { error: 'agent not found' }); item.lastHeartbeat = new Date().toISOString(); item.online = true; await state.register(item); await audit.record('info', 'agent', 'heartbeat', { agentId: item.id }); return json(res, 200, item); }
    if (req.method === 'POST' && url.pathname === '/backups') { const point = await agent.fixtureBackup(); await audit.record('info', 'backup', 'completed', { pointId: point.id }); return json(res, 201, point); }
    if (req.method === 'POST' && parts[0] === 'recovery-points' && parts[2] === 'verify') { const result = await backup.verify(parts[1]); await audit.record('info', 'integrity', 'verified', { pointId: parts[1], verified: result.verified }); return json(res, 200, result); }
    if (req.method === 'POST' && parts[0] === 'recovery-points' && parts[2] === 'restore') { const input = await body(req); const result = await backup.restoreFixture(parts[1], input.destination, restoreRoot); await audit.record('info', 'restore', 'fixture-restored', { pointId: parts[1], destination: result.destination }); return json(res, 200, result); }
    return json(res, 404, { error: 'not found' });
  } catch (error) { await audit.record('error', 'management', 'request-failed', { method: req.method, path: url.pathname, message: error.message }); return json(res, 400, { error: error.message }); } });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}
