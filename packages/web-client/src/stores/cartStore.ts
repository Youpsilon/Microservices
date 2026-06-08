import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../services/api';

export interface CartItem {
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  clearCart: () => void;
  placeOrder: (deliveryType: 'delivery'|'pickup') => Promise<{ status: string, message: string }>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.menuItemId === item.menuItemId);
        if (existing) {
          return {
            items: state.items.map(i => i.menuItemId === item.menuItemId ? { ...i, qty: i.qty + 1 } : i)
          };
        }
        return { items: [...state.items, { ...item, qty: 1 }] };
      }),
      clearCart: () => set({ items: [] }),
      placeOrder: async (deliveryType) => {
        const items = get().items;
        if (items.length === 0) throw new Error("Cart is empty");
        
        try {
          // POST directly to order-service (proxied via vite to port 3003)
          const response = await api.post('/orders', {
            // Force-cast to numbers in case localStorage stored them as strings
            items: items.map(i => ({
              ...i,
              qty: Number(i.qty),
              unitPrice: Number(i.unitPrice),
            })),
            deliveryType,
          });
          
          // Order service returns 202 Accepted on success
          if (response.status === 202 || response.status === 200) {
            set({ items: [] });
            return {
              status: response.data.status ?? 'pending',
              message: response.data.message ?? 'Commande reçue !',
            };
          }
          throw new Error("Failed to place order");
        } catch (err: any) {
          throw new Error(err.response?.data?.message || err.message);
        }
      }
    }),
    {
      name: 'restaurant-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
