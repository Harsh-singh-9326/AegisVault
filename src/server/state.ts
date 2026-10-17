// @ts-nocheck
import { readJson, writeJsonAtomic } from '../atomic-json';
export class ControlState {
  constructor(private readonly file: string) {}
  async read() { return readJson(this.file, { agents: {}, audit: [] }); }
  async update(mutator: (state: any) => any) { const next = mutator(await this.read()); await writeJsonAtomic(this.file, next); return next; }
  async register(agent: any) { return this.update(state => ({ ...state, agents: { ...state.agents, [agent.id]: agent } })); }
  async agent(id: string) { return (await this.read()).agents[id]; }
  async agents(staleAfterMs = 60_000) {
    const now = Date.now();
    return Object.values((await this.read()).agents).map((agent: any) => ({
      ...agent,
      online: Boolean(agent.lastHeartbeat && now - Date.parse(agent.lastHeartbeat) <= staleAfterMs),
    }));
  }
}
