"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { WishlistItem } from "@/lib/plan-engine";

const STORAGE_KEY = "cotswold-wishlist";
const DEBOUNCE_MS = 300;

export function useWishlistStorage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch { /* ignore */ }
    }, DEBOUNCE_MS);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [items, hydrated]);

  const addItem = useCallback((item: WishlistItem) => {
    setItems(prev => {
      if (prev.some(i => i.slug === item.slug)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((slug: string) => {
    setItems(prev => prev.filter(i => i.slug !== slug));
  }, []);

  const clearWishlist = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { items, addItem, removeItem, clearWishlist, hydrated };
}
