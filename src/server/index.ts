// @ts-nocheck
import { mkdir, writeFile } from 'node:fs/promises'; import { join } from 'node:path';
import { BackupService } from '../backup'; import { MetadataRepository } from '../metadata'; import { ContentAddressedRepository } from '../repository'; import { AgentService } from '../agent/service'; import { AuditLog } from './audit'; import { ControlState } from './state'; import { startManagementServer } from './management';
export async function startServer(root = join(process.cwd(), '.aegisvault'), port = Number(process.env.PORT || 8080)) {
  const fixture = join(root, 'fixture');
  await mkdir(join(fixture, 'etc'), { recursive: true });
  await writeFile(join(fixture, 'etc', 'vm.conf'), 'deterministic fixture\n');
  const repo = new ContentAddressedRepository(join(root, 'repository'));
  await repo.init();
  const backup = new BackupService(new MetadataRepository(join(root, 'metadata.json')), repo, process.env.AEGIS_SECRET || 'development-only-secret');
  const state = new ControlState(join(root, 'control.json'));
  const audit = new AuditLog(state);
  const agent = new AgentService(backup, fixture);
  const server = await startManagementServer({ backup, agent, state, audit, restoreRoot: join(root, 'restores') }, port);
  await audit.record('info', 'server', 'started', { port });
  return server;
}
