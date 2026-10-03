const MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape user-supplied text before putting it in an HTML email. */
export const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

/** JSON for <script type="application/ld+json">. Escapes "<" so a title like "</script>" cannot break out. */
export const jsonLd = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
