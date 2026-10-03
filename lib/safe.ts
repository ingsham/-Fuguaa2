/** Runs a database read; on failure logs the real error (visible in Vercel logs) and returns a fallback so public pages never crash. */
export async function safe<T>(label: string, fn: () => Promise<T>, fallback: NoInfer<T>): Promise<T> {
  try { return await fn(); } catch (e) { console.error(`[db error] ${label}`, e); return fallback as T; }
}
