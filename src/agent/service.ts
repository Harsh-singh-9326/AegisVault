// @ts-nocheck
import { statfs } from 'node:fs/promises';
import { homedir, hostname, platform, tmpdir } from 'node:os';
export class AgentService {
  constructor(private readonly backup: any, private readonly fixture: string, private readonly id = `${hostname()}-${platform()}`) {}
  identity() { return { id: this.id, hostname: hostname(), platform: platform(), version: '0.1.0' }; }
  async partitions() { const paths = [...new Set([homedir(), tmpdir(), this.fixture])]; return Promise.all(paths.map(async path => { try { const stats = await statfs(path); return { path, online: true, capacityBytes: Number(stats.blocks) * Number(stats.bsize), availableBytes: Number(stats.bavail) * Number(stats.bsize) }; } catch (error) { return { path, online: false, error: error.message }; } })); }
  async fixtureBackup() {
    const job = await this.backup.register(this.fixture, `agent-fixture-backup-${Date.now()}`);
    return this.backup.run(job.id);
  }
}
