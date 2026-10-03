'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type CartLine = {
  key: string; productId: string; title: string; price: number; photo?: string;
  size?: string; color?: string; quantity: number; stock: number; shopName: string;
};
type Ctx = {
  lines: CartLine[]; count: number; total: number;
  add: (l: Omit<CartLine, 'key'>) => void;
  setQty: (key: string, q: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  syncPrices: (prices: Record<string, number>) => void;
};
const CartCtx = createContext<Ctx | null>(null);
const STORAGE = 'fuguaa-cart-v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setLines(JSON.parse(localStorage.getItem(STORAGE) || '[]')); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE, JSON.stringify(lines)); }, [lines, ready]);

  const add = useCallback((l: Omit<CartLine, 'key'>) => {
    const key = `${l.productId}|${l.size || ''}|${l.color || ''}`;
    setLines((prev) => {
      const found = prev.find((p) => p.key === key);
      if (found) return prev.map((p) => (p.key === key ? { ...p, quantity: Math.min(p.quantity + l.quantity, p.stock) } : p));
      return [...prev, { ...l, key }];
    });
  }, []);
  const setQty = (key: string, q: number) =>
    setLines((prev) => prev.map((p) => (p.key === key ? { ...p, quantity: Math.max(1, Math.min(q || 1, p.stock)) } : p)));
  const remove = (key: string) => setLines((prev) => prev.filter((p) => p.key !== key));
  const clear = () => setLines([]);
  const syncPrices = (prices: Record<string, number>) => setLines((prev) => prev.map((l) => (prices[l.productId] !== undefined ? { ...l, price: prices[l.productId] } : l)));

  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const total = lines.reduce((s, l) => s + l.quantity * l.price, 0);
  return <CartCtx.Provider value={{ lines, count, total, add, setQty, remove, clear, syncPrices }}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
};
