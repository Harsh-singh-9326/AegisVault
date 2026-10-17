// @ts-nocheck
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { encrypt, keyFromSecret, decrypt, checksum } from './crypto';
import { transition } from './jobs';

async function files(root: string, dir = root): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(root, path)); else if (entry.isFile()) out.push(path);
  }
  return out.sort();
}

export class BackupService {
  private key: Buffer;
  constructor(private readonly metadata: any, private readonly repository: any, secret: string) { this.key = keyFromSecret(secret); }
  async register(source: string, name = 'fixture-backup') { const job = { id: createHash('sha256').update(`${name}:${source}`).digest('hex').slice(0, 16), name, source, status: 'registered', createdAt: new Date().toISOString() }; return this.metadata.add(job); }
  async run(jobId: string) {
    let job = await this.metadata.find(jobId); if (!job) throw new Error('job not found'); job = transition(job, 'running'); await this.metadata.save((await this.metadata.all()).map(x => x.id === job.id ? job : x));
    try { const entries = []; for (const path of await files(job.source)) { const plain = await readFile(path); const encrypted = encrypt(plain, this.key); const objectId = await this.repository.put(encrypted.ciphertext); entries.push({ path: relative(job.source, path).replaceAll('\\', '/'), objectId, plaintextChecksum: checksum(plain), ciphertextChecksum: encrypted.checksum, iv: encrypted.iv, tag: encrypted.tag, size: plain.length }); } const point = { id: `${job.id}-${Date.now()}`, jobId: job.id, source: job.source, createdAt: new Date().toISOString(), entries }; await this.metadata.add(point); job = transition(job, 'completed'); await this.metadata.save((await this.metadata.all()).map(x => x.id === job.id ? job : x)); return point; }
    catch (error) { job = { ...job, error: error.message }; job = transition(job, 'failed'); await this.metadata.save((await this.metadata.all()).map(x => x.id === job.id ? job : x)); throw error; }
  }
  async points() { return (await this.metadata.all()).filter(x => x.entries); }
  async verify(pointId: string) { const point = (await this.points()).find(x => x.id === pointId); if (!point) throw new Error('recovery point not found'); const results = []; for (const entry of point.entries) { const ciphertext = await this.repository.get(entry.objectId); if (checksum(ciphertext) !== entry.ciphertextChecksum) throw new Error(`checksum mismatch: ${entry.path}`); const plain = decrypt({ ciphertext, iv: entry.iv, tag: entry.tag }, this.key); results.push({ path: entry.path, ok: checksum(plain) === entry.plaintextChecksum }); } return { pointId, verified: results.every(x => x.ok), files: results }; }
  async restoreFixture(pointId: string, destination: string, allowedRoot: string) {
    const point = (await this.points()).find(x => x.id === pointId); if (!point) throw new Error('recovery point not found');
    if (!point.source?.split(/[\\/]/).pop()?.toLowerCase().includes('fixture')) throw new Error('only fixture recovery is supported');
    const root = resolve(allowedRoot); const target = resolve(destination); if (target === root || !target.startsWith(root + sep)) throw new Error('restore destination must be inside the configured restore root'); if (target === resolve(point.source)) throw new Error('restore destination must differ from source');
    const verification = await this.verify(pointId); if (!verification.verified) throw new Error('recovery point is not verified');
    for (const entry of point.entries) { const output = resolve(target, entry.path); if (!output.startsWith(target + sep)) throw new Error('invalid recovery path'); const plain = decrypt({ ciphertext: await this.repository.get(entry.objectId), iv: entry.iv, tag: entry.tag }, this.key); await mkdir(dirname(output), { recursive: true }); await writeFile(output, plain, { flag: 'wx', mode: 0o600 }); }
    return { pointId, destination: target, restoredFiles: point.entries.length, verified: true };
  }
}
