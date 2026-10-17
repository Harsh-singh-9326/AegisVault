const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { startServer } = require('../dist/server');

async function request(server, route, options = {}) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${route}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  return { status: response.status, body: await response.json() };
}

test('management server reports health, partitions, logs, backup, verification and safe restore', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aegis-management-'));
  const server = await startServer(root, 0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const health = await request(server, '/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');

  const partitions = await request(server, '/partitions');
  assert.equal(partitions.status, 200);
  assert.ok(partitions.body.some((partition) => partition.online));
  assert.ok(partitions.body.every((partition) => 'path' in partition && 'online' in partition));

  const registration = await request(server, '/agents/register', {
    method: 'POST',
    body: JSON.stringify({ id: 'test-agent', capabilities: ['fixture-backup'] }),
  });
  assert.equal(registration.status, 201);
  const status = await request(server, '/status');
  assert.equal(status.status, 200);
  assert.equal(status.body.agents[0].id, 'test-agent');
  assert.equal(status.body.agents[0].online, true);

  const heartbeat = await request(server, '/agents/test-agent/heartbeat', { method: 'POST', body: '{}' });
  assert.equal(heartbeat.status, 200);

  const firstBackup = await request(server, '/backups', { method: 'POST', body: '{}' });
  assert.equal(firstBackup.status, 201);
  assert.ok(firstBackup.body.id);

  const secondBackup = await request(server, '/backups', { method: 'POST', body: '{}' });
  assert.equal(secondBackup.status, 201);
  assert.notEqual(secondBackup.body.id, firstBackup.body.id);

  const verification = await request(server, `/recovery-points/${firstBackup.body.id}/verify`, { method: 'POST' });
  assert.equal(verification.status, 200);
  assert.equal(verification.body.verified, true);

  const destination = path.join(root, 'restores', 'test-restore');
  const restore = await request(server, `/recovery-points/${firstBackup.body.id}/restore`, {
    method: 'POST',
    body: JSON.stringify({ destination }),
  });
  assert.equal(restore.status, 200);
  assert.equal(restore.body.restoredFiles, 1);
  assert.equal(await fs.readFile(path.join(destination, 'etc', 'vm.conf'), 'utf8'), 'deterministic fixture\n');

  const logs = await request(server, '/logs');
  assert.equal(logs.status, 200);
  assert.ok(logs.body.some((entry) => entry.event === 'completed'));
  assert.ok(logs.body.some((entry) => entry.event === 'fixture-restored'));

  const unsafeRestore = await request(server, `/recovery-points/${firstBackup.body.id}/restore`, {
    method: 'POST',
    body: JSON.stringify({ destination: path.join(root, 'outside') }),
  });
  assert.equal(unsafeRestore.status, 400);
  assert.match(unsafeRestore.body.error, /inside the configured restore root/);
});
