// @ts-nocheck
export interface LibvirtAdapter { listDomains(): Promise<unknown[]>; createSnapshot(domain: string): Promise<never>; }
export class NotConfiguredLibvirtAdapter implements LibvirtAdapter {
  async listDomains(): Promise<unknown[]> { throw new Error('libvirt adapter is not configured; fixture mode is the supported initial slice'); }
  async createSnapshot(_domain: string): Promise<never> { throw new Error('live libvirt snapshots are not implemented'); }
}
