// @ts-nocheck
import { readJson, writeJsonAtomic } from './atomic-json';
export class MetadataRepository {
  constructor(private readonly file: string) {}
  async all(): Promise<any[]> { return readJson(this.file, []); }
  async save(value: any): Promise<void> { await writeJsonAtomic(this.file, value); }
  async add<T extends { id: string }>(item: T): Promise<T> { const rows = await this.all(); rows.push(item); await this.save(rows); return item; }
  async find(id: string): Promise<any | undefined> { return (await this.all()).find((x) => x.id === id); }
}
