// Pure authorization rules, kept free of the database so they can be unit tested.
export type Role = 'BUYER' | 'SELLER' | 'ADMIN';
export type Actor = { id: string; role: Role };

export const isStaff = (r: Role) => r === 'SELLER' || r === 'ADMIN';

/** Edit or delete a listing: its own seller, or any admin. Never a buyer or another seller. */
export const canManageProduct = (a: Actor, ownerUserId: string) => a.role === 'ADMIN' || (a.role === 'SELLER' && a.id === ownerUserId);

/** Hide/unhide. A listing hidden by an admin can only be unhidden by an admin. */
export const canToggleVisibility = (a: Actor, ownerUserId: string, hiddenByAdmin: boolean) =>
  canManageProduct(a, ownerUserId) && (a.role === 'ADMIN' || !hiddenByAdmin);

/** Mark shipped: the seller who owns the order, or an admin. */
export const canShipOrder = (a: Actor, sellerUserId: string) => a.role === 'ADMIN' || (a.role === 'SELLER' && a.id === sellerUserId);

/** Only the buyer who placed the order may confirm receipt, report, or review it. */
export const isOrderBuyer = (a: Actor, buyerId: string) => a.id === buyerId;

export function disputeWindowOpen(o: { status: string; deliveredAt: Date | null }, hours = 72, now = Date.now()) {
  if (o.status === 'SHIPPED') return true;
  return o.status === 'DELIVERED' && !!o.deliveredAt && now - o.deliveredAt.getTime() < hours * 3600_000;
}

export const canReview = (o: { status: string; buyerId: string; hasReview: boolean }, userId: string) =>
  o.buyerId === userId && o.status === 'DELIVERED' && !o.hasReview;

/** Admin actions on accounts: never on yourself, never on another admin. */
export const canSuspend = (actor: Actor, target: Actor) => actor.role === 'ADMIN' && actor.id !== target.id && target.role !== 'ADMIN';
