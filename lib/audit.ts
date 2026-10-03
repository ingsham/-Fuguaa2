import { db } from './db';

/** Records an admin action. Never throws: a logging failure must not block the action itself. Never put ID numbers in meta. */
export async function audit(actorId: string, action: string, targetType: string, targetId: string, meta?: Record<string, unknown>) {
  try {
    await db.auditLog.create({ data: { actorId, action, targetType, targetId, meta: meta ? JSON.stringify(meta).slice(0, 1000) : null } });
  } catch (e) {
    console.error('audit log failed', action, e);
  }
}
