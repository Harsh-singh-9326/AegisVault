// @ts-nocheck
import { ControlState } from './state';
export class AuditLog {
  constructor(private readonly state: ControlState) {}
  async record(severity: string, component: string, event: string, details: any = {}) { const item = { timestamp: new Date().toISOString(), severity, component, event, details }; await this.state.update(state => ({ ...state, audit: [...state.audit.slice(-999), item] })); return item; }
  async list() { return (await this.state.read()).audit; }
}
