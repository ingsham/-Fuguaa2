import { db } from './db';
import { sendEmail, sendSms, ghs } from './notify';
import { escapeHtml as e } from './html';

class Oversold extends Error { constructor(public titles: string[]) { super('oversold'); } }

/**
 * Called by BOTH the Paystack webhook and the browser callback, so it must be idempotent.
 * - Verifies the amount Paystack actually collected equals the sum of the orders (and is GHS).
 * - Claims each order atomically (UNPAID -> PAID) so a double call never double-notifies.
 * - Decrements stock with a guard (never below zero). If an item sold out while the buyer was paying,
 *   the order is marked DISPUTED with an automatic refund task for the admin instead of overselling.
 */
export async function markPaid(reference: string, paid: { amountPesewas: number; currency: string }): Promise<number> {
  if (paid.currency !== 'GHS') return 0;
  const orders = await db.order.findMany({
    where: { paymentRef: reference },
    include: { items: true, buyer: true, seller: { include: { user: true } } },
  });
  if (!orders.length) return 0;
  const expected = Math.round(orders.reduce((s, o) => s + o.total, 0) * 100);
  if (expected !== paid.amountPesewas) {
    console.error(`[payment mismatch] ref=${reference} expected=${expected} paid=${paid.amountPesewas}`);
    return 0;
  }

  let processed = 0;
  for (const o of orders) {
    if (o.paymentStatus === 'PAID') continue;
    const paidData = { paymentStatus: 'PAID' as const, status: 'CONFIRMED' as const, escrowStatus: 'HELD' as const, paidAt: new Date() };
    let oversold: string[] = [];
    let claimedNow = false;
    try {
      claimedNow = await db.$transaction(async (tx) => {
        const claim = await tx.order.updateMany({ where: { id: o.id, paymentStatus: 'UNPAID' }, data: paidData });
        if (claim.count === 0) return false;
        const short: string[] = [];
        for (const it of o.items) {
          const r = await tx.product.updateMany({ where: { id: it.productId, stock: { gte: it.quantity } }, data: { stock: { decrement: it.quantity } } });
          if (r.count === 0) short.push(it.title);
        }
        if (short.length) throw new Oversold(short); // rolls back the claim and every decrement
        return true;
      });
    } catch (err) {
      if (!(err instanceof Oversold)) { console.error('[markPaid failed]', err); continue; }
      oversold = err.titles;
      claimedNow = await db.$transaction(async (tx) => {
        const claim = await tx.order.updateMany({ where: { id: o.id, paymentStatus: 'UNPAID' }, data: { ...paidData, status: 'DISPUTED' } });
        if (claim.count === 0) return false;
        await tx.dispute.create({ data: { orderId: o.id, reason: `Automatic: sold out before payment completed (${oversold.join(', ')}). Refund the buyer.` } });
        return true;
      });
    }
    if (!claimedNow) continue;
    processed++;
    await notifyNewOrder(o, oversold).catch((err) => console.error('[notify failed]', err));
  }
  return processed;
}

async function notifyNewOrder(o: any, oversold: string[]) {
  const lines = o.items.map((i: any) => `${i.quantity} x ${e(i.title)}${i.size ? ` (${e(i.size)})` : ''}${i.color ? ` ${e(i.color)}` : ''}`).join('<br/>');
  const ref = o.id.slice(-8).toUpperCase();
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE;

  if (oversold.length) {
    // Do not ask the seller to ship something they no longer have.
    await Promise.all([
      sendEmail(o.buyer.email, `Order #${ref}: we need to refund you`, `<p>Sorry ${e(o.buyer.name)}, ${e(oversold.join(', '))} sold out while you were paying. We will refund ${ghs(o.total)}.</p>`),
      adminEmail && sendEmail(adminEmail, `Refund needed: order #${ref}`, `<p>${e(o.seller.shopName)} order #${ref} (${ghs(o.total)}) was paid but sold out: ${e(oversold.join(', '))}. Refund the buyer in Paystack, then resolve the dispute.</p>`),
      adminPhone && sendSms(adminPhone, `Fuguaa admin: order #${ref} paid but sold out. Refund needed.`),
    ]);
    return;
  }

  const sellerHtml = `<h2>New order #${ref}</h2><p>${lines}</p><p><b>Total ${ghs(o.total)}</b></p>
    <p>Ship to: ${e(o.shippingName)}, ${e(o.shippingPhone)}<br/>${e(o.shippingAddress)}</p>
    <p>Payment is held safely until the buyer confirms receipt. Mark it shipped in <a href="${site}/dashboard/seller?tab=orders">your dashboard</a>.</p>`;
  await Promise.all([
    sendEmail(o.seller.user.email, `New Fuguaa order #${ref}`, sellerHtml),
    sendSms(o.seller.user.phone, `Fuguaa: new order #${ref}, ${ghs(o.total)}. Ship to ${o.shippingName} (${o.shippingPhone}). Check your dashboard.`),
    adminEmail && sendEmail(adminEmail, `Order #${ref} placed at ${o.seller.shopName}`, `<p>${e(o.seller.shopName)} received order #${ref} worth ${ghs(o.total)}.</p><p>${lines}</p>`),
    adminPhone && sendSms(adminPhone, `Fuguaa admin: order #${ref}, ${ghs(o.total)} at ${o.seller.shopName}.`),
    sendEmail(o.buyer.email, `Your Fuguaa order #${ref} is confirmed`, `<h2>Thank you, ${e(o.buyer.name)}</h2><p>${lines}</p><p><b>Total ${ghs(o.total)}</b></p><p>Track it any time at <a href="${site}/orders">${site}/orders</a>.</p>`),
  ]);
}
