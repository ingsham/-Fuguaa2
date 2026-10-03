import { db } from './db';
import { sendEmail, sendSms, ghs } from './notify';

/**
 * Idempotent: marks every order under a payment reference as paid + escrow HELD,
 * reduces stock, and notifies buyer, each seller and the admin. Safe to call from
 * both the Paystack webhook and the browser callback.
 */
export async function markPaid(reference: string) {
  const orders = await db.order.findMany({
    where: { paymentRef: reference, paymentStatus: 'UNPAID' },
    include: { items: true, buyer: true, seller: { include: { user: true } } },
  });
  if (!orders.length) return 0;

  for (const o of orders) {
    // claim the order atomically so double calls don't double-notify
    const claimed = await db.order.updateMany({
      where: { id: o.id, paymentStatus: 'UNPAID' },
      data: { paymentStatus: 'PAID', status: 'CONFIRMED', escrowStatus: 'HELD', paidAt: new Date() },
    });
    if (claimed.count === 0) continue;

    for (const it of o.items) {
      await db.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });
    }
    await notifyNewOrder(o);
  }
  return orders.length;
}

async function notifyNewOrder(o: any) {
  const lines = o.items.map((i: any) => `${i.quantity} x ${i.title}${i.size ? ` (${i.size})` : ''}${i.color ? ` ${i.color}` : ''}`).join('<br/>');
  const ref = o.id.slice(-8).toUpperCase();
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE;

  const sellerHtml = `<h2>New order #${ref}</h2><p>${lines}</p><p><b>Total ${ghs(o.total)}</b></p>
    <p>Ship to: ${o.shippingName}, ${o.shippingPhone}<br/>${o.shippingAddress}</p>
    <p>Payment is held safely until the buyer confirms receipt. Mark it shipped in <a href="${site}/dashboard/seller?tab=orders">your dashboard</a>.</p>`;

  await Promise.all([
    sendEmail(o.seller.user.email, `New Fuguaa order #${ref}`, sellerHtml),
    sendSms(o.seller.user.phone, `Fuguaa: new order #${ref}, ${ghs(o.total)}. Ship to ${o.shippingName} (${o.shippingPhone}). Check your dashboard.`),
    adminEmail && sendEmail(adminEmail, `Order #${ref} placed at ${o.seller.shopName}`, `<p>${o.seller.shopName} received order #${ref} worth ${ghs(o.total)}.</p><p>${lines}</p>`),
    adminPhone && sendSms(adminPhone, `Fuguaa admin: order #${ref}, ${ghs(o.total)} at ${o.seller.shopName}.`),
    sendEmail(o.buyer.email, `Your Fuguaa order #${ref} is confirmed`, `<h2>Thank you, ${o.buyer.name}</h2><p>${lines}</p><p><b>Total ${ghs(o.total)}</b></p><p>Track it any time at <a href="${site}/orders">${site}/orders</a>.</p>`),
  ]);
}
