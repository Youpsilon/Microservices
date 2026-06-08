import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Plus, Package } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  stock: number;
}

const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await api.get('/menu/categories');
  return data;
};

const fetchItems = async (categoryId?: string): Promise<MenuItem[]> => {
  // Fetch ALL items (including unavailable) so we can show them grayed out
  const { data } = await api.get('/menu/items', { params: { categoryId } });
  return data;
};

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string>('');
  const cart = useCartStore();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['items', activeCategory],
    queryFn: () => fetchItems(activeCategory),
  });

  if (catsLoading || itemsLoading) {
    return <div className="text-center" style={{ padding: '4rem' }}>Chargement du menu...</div>;
  }

  const getStockBadge = (item: MenuItem) => {
    if (!item.available || item.stock === 0) {
      return { label: 'Épuisé', color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)' };
    }
    if (item.stock <= 5) {
      return { label: `Plus que ${item.stock} !`, color: '#FCD34D', bg: 'rgba(252, 211, 77, 0.15)' };
    }
    return null;
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }} className="text-gradient">Notre Menu</h1>
      
      {/* Category Filter */}
      <div className="categories-filter">
        <button 
          className={`btn ${!activeCategory ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveCategory(undefined)}
        >
          Tout voir
        </button>
        {categories?.map(cat => (
          <button 
            key={cat.id}
            className={`btn ${activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-2">
        {items?.map(item => {
          const isOutOfStock = !item.available || item.stock === 0;
          const stockBadge = getStockBadge(item);

          return (
            <div key={item.id} className={`card ${!isOutOfStock ? 'card-hover' : ''}`} style={{
              display: 'flex', flexDirection: 'column',
              opacity: isOutOfStock ? 0.5 : 1,
              filter: isOutOfStock ? 'grayscale(60%)' : 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}>
              {/* Out-of-stock badge */}
              {isOutOfStock && (
                <div style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  background: 'rgba(239, 68, 68, 0.9)', color: '#fff',
                  padding: '0.3rem 0.85rem', borderRadius: '999px',
                  fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em',
                  zIndex: 2, backdropFilter: 'blur(4px)',
                }}>
                  ÉPUISÉ
                </div>
              )}

              {item.imageUrl && (
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} 
                />
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3>{item.name}</h3>
                <span style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '1.25rem', textShadow: isOutOfStock ? 'none' : '0 0 10px rgba(249, 115, 22, 0.4)' }}>
                  {Number(item.price).toFixed(2)} €
                </span>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', flex: 1 }}>
                {item.description}
              </p>

              {/* Stock Badge */}
              {stockBadge && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: stockBadge.bg, color: stockBadge.color,
                  border: `1px solid ${stockBadge.color}44`,
                  borderRadius: '999px', padding: '0.3rem 0.85rem',
                  fontSize: '0.78rem', fontWeight: 700, marginBottom: '1rem',
                  width: 'fit-content',
                }}>
                  <Package size={13} /> {stockBadge.label}
                </div>
              )}
              
              <button 
                className={`btn ${isOutOfStock ? 'btn-secondary' : 'btn-primary'}`}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                disabled={isOutOfStock || !isAuthenticated}
                onClick={(e) => {
                  if (isOutOfStock) return;
                  cart.addItem({ menuItemId: item.id, name: item.name, qty: 1, unitPrice: Number(item.price) });
                  
                  const btn = e.currentTarget;
                  btn.style.transform = 'scale(0.95)';
                  setTimeout(() => btn.style.transform = 'scale(1)', 100);

                  setToastMessage(`✓ ${item.name} ajouté au panier`);
                  setTimeout(() => setToastMessage(''), 3000);
                }}
              >
                {isOutOfStock ? (
                  <><Package size={16} /> Indisponible</>
                ) : (
                  <><Plus size={18} /> Ajouter au panier</>
                )}
              </button>
            </div>
          );
        })}
      </div>
      
      {items?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Aucun plat dans cette catégorie pour le moment.
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: 'white', padding: '1rem 2rem', borderRadius: '999px', boxShadow: 'var(--shadow-md)', zIndex: 100, animation: 'fadeIn 0.3s ease, slideUp 0.3s ease' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Menu;
