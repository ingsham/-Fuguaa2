/** A seller is publicly visible only if verified and not suspended. Use this everywhere products or shops are shown or bought. */
export const liveSeller = { verificationStatus: 'VERIFIED' as const, user: { suspended: false } };
