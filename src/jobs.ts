// @ts-nocheck
const transitions = { registered: ['running'], running: ['completed', 'failed'], failed: ['running'], completed: [] };
export function transition(job: any, next: string) { if (!transitions[job.status]?.includes(next)) throw new Error(`invalid job transition ${job.status} -> ${next}`); return { ...job, status: next, updatedAt: new Date().toISOString() }; }
