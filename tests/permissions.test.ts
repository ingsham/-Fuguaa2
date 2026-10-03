import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageProduct, canToggleVisibility, canShipOrder, isOrderBuyer, disputeWindowOpen, canReview, canSuspend } from '../lib/permissions';

const buyer = { id: 'b1', role: 'BUYER' as const };
const sellerA = { id: 'sA', role: 'SELLER' as const };
const sellerB = { id: 'sB', role: 'SELLER' as const };
const admin = { id: 'ad', role: 'ADMIN' as const };

test('a buyer can never manage listings or ship orders', () => {
  assert.equal(canManageProduct(buyer, 'sA'), false);
  assert.equal(canManageProduct({ id: 'sA', role: 'BUYER' }, 'sA'), false); // even with the owner id
  assert.equal(canShipOrder(buyer, 'sA'), false);
});

test('a seller cannot touch another seller', () => {
  assert.equal(canManageProduct(sellerB, 'sA'), false);
  assert.equal(canShipOrder(sellerB, 'sA'), false);
  assert.equal(canManageProduct(sellerA, 'sA'), true);
});

test('admin has all seller powers', () => {
  assert.equal(canManageProduct(admin, 'sA'), true);
  assert.equal(canShipOrder(admin, 'sA'), true);
});

test('a listing hidden by an admin cannot be unhidden by its seller', () => {
  assert.equal(canToggleVisibility(sellerA, 'sA', true), false);
  assert.equal(canToggleVisibility(sellerA, 'sA', false), true);
  assert.equal(canToggleVisibility(admin, 'sA', true), true);
});

test('only the buyer who placed the order can confirm or report it', () => {
  assert.equal(isOrderBuyer(buyer, 'b1'), true);
  assert.equal(isOrderBuyer(sellerA, 'b1'), false);
  assert.equal(isOrderBuyer(admin, 'b1'), false);
});

test('dispute window: open while shipped, 72h after delivery, closed after', () => {
  const now = Date.now();
  assert.equal(disputeWindowOpen({ status: 'SHIPPED', deliveredAt: null }), true);
  assert.equal(disputeWindowOpen({ status: 'DELIVERED', deliveredAt: new Date(now - 71 * 3600_000) }, 72, now), true);
  assert.equal(disputeWindowOpen({ status: 'DELIVERED', deliveredAt: new Date(now - 73 * 3600_000) }, 72, now), false);
  assert.equal(disputeWindowOpen({ status: 'CONFIRMED', deliveredAt: null }), false);
});

test('reviews: verified purchase only, delivered, once, by the buyer', () => {
  assert.equal(canReview({ status: 'DELIVERED', buyerId: 'b1', hasReview: false }, 'b1'), true);
  assert.equal(canReview({ status: 'SHIPPED', buyerId: 'b1', hasReview: false }, 'b1'), false);
  assert.equal(canReview({ status: 'DELIVERED', buyerId: 'b1', hasReview: true }, 'b1'), false);
  assert.equal(canReview({ status: 'DELIVERED', buyerId: 'b1', hasReview: false }, 'other'), false);
});

test('admins cannot suspend themselves or each other; non-admins cannot suspend anyone', () => {
  assert.equal(canSuspend(admin, buyer), true);
  assert.equal(canSuspend(admin, admin), false);
  assert.equal(canSuspend(admin, { id: 'ad2', role: 'ADMIN' }), false);
  assert.equal(canSuspend(sellerA, buyer), false);
});
