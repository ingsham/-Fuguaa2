export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const OCCASIONS = ['wedding', 'funeral', 'festival', 'everyday', 'children'] as const;
export const REGIONS = ['Greater Accra', 'Ashanti', 'Northern', 'Upper East', 'Upper West', 'Volta', 'Central', 'Western', 'Eastern', 'Bono', 'Savannah', 'North East', 'Oti', 'Ahafo', 'Bono East', 'Western North'];
export const ghsFormat = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
export const DISPUTE_WINDOW_HOURS = 72;
export const AUTO_RELEASE_DAYS = 14;
export const firstName = (n: string) => n.trim().split(/\s+/)[0] || 'Buyer';
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
