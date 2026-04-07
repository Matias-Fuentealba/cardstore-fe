import { create } from 'zustand';
import { api } from '../api';

export const useCartStore = create((set) => ({
  count: 0,
  items: [],

  refresh: async () => {
    try {
      const cart = await api.cart.get();
      const items = cart?.items ?? [];
      const count = items.reduce((sum, i) => sum + (i.qty || 0), 0);
      set({ count, items });
    } catch {
      set({ count: 0, items: [] });
    }
  },

  addItem: async (cardId, condition, qty = 1, language) => {
    await api.cart.addItem(cardId, condition, qty, language);
    // refresh badge after adding
    const cart = await api.cart.get().catch(() => null);
    if (cart) {
      const items = cart.items ?? [];
      const count = items.reduce((sum, i) => sum + (i.qty || 0), 0);
      set({ count, items });
    }
  },
}));
