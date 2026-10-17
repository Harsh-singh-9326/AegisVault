// @ts-nocheck
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { checksum } from './crypto';
export class ContentAddressedRepository {
  constructor(readonly root: string) {}
  async init() { await mkdir(join(this.root, 'objects'), { recursive: true }); }
  async put(data: Buffer): Promise<string> { const id = checksum(data); const path = join(this.root, 'objects', id); try { await readFile(path); } catch { const { writeFile } = await import('node:fs/promises'); await writeFile(path, data, { flag: 'wx', mode: 0o600 }).catch((e) => { if (e.code !== 'EEXIST') throw e; }); } return id; }
  async get(id: string): Promise<Buffer> { return readFile(join(this.root, 'objects', id)); }
  async list(): Promise<string[]> { return (await readdir(join(this.root, 'objects'))).sort(); }
}
