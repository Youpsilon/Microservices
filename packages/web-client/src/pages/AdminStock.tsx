import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Package, Plus, Minus, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  available: boolean;
  stock: number;
}

const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await api.get('/menu/categories');
  return data;
};

const fetchItems = async (): Promise<MenuItem[]> => {
  const { data } = await api.get('/menu/items');
  return data;
};

export default function AdminStock() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [filterCatId, setFilterCatId] = useState<string>('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: items, isLoading } = useQuery({ queryKey: ['all-items'], queryFn: fetchItems });

  const stockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      api.patch(`/menu/items/${id}/stock`, { stock }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['all-items'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setEditingId(null);
      showToast(`Stock mis à jour → ${vars.stock} unité(s)`);
    },
    onError: () => showToast('Erreur lors de la mise à jour du stock', 'error'),
  });

  const filteredItems = items?.filter(i => !filterCatId || i.categoryId === filterCatId) ?? [];

  const getCatName = (catId: string) => categories?.find(c => c.id === catId)?.name ?? '—';

  const getStockStatus = (item: MenuItem) => {
    if (!item.available || item.stock === 0) return { label: 'Épuisé', color: '#F87171', icon: <AlertTriangle size={14} /> };
    if (item.stock <= 5) return { label: 'Faible', color: '#FCD34D', icon: <AlertTriangle size={14} /> };
    return { label: 'En stock', color: '#34D399', icon: <CheckCircle size={14} /> };
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: '#fff', padding: '0.85rem 1.5rem', borderRadius: '12px',
          fontWeight: 600, backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Package size={22} style={{ color: 'var(--brand-primary)' }} />
            Gestion des Stocks
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Modifiez le stock de chaque article. Un stock à 0 le rend automatiquement indisponible.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total articles', value: items?.length ?? 0, color: 'var(--text-primary)' },
          { label: 'En rupture', value: items?.filter(i => i.stock === 0 || !i.available).length ?? 0, color: '#F87171' },
          { label: 'Stock faible (≤5)', value: items?.filter(i => i.available && i.stock > 0 && i.stock <= 5).length ?? 0, color: '#FCD34D' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter by Category */}
      <div className="categories-filter" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
        <button className={`btn ${!filterCatId ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
          onClick={() => setFilterCatId('')}>Toutes</button>
        {categories?.map(cat => (
          <button key={cat.id}
            className={`btn ${filterCatId === cat.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
            onClick={() => setFilterCatId(cat.id)}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem' }}>Chargement...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map(item => {
            const status = getStockStatus(item);
            const isEditing = editingId === item.id;

            return (
              <div key={item.id} className="card" style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: '1.5rem',
                padding: '1.1rem 1.5rem',
              }}>
                {/* Item info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{item.name}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      background: `${status.color}22`, color: status.color,
                      border: `1px solid ${status.color}44`,
                      borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {getCatName(item.categoryId)} · {Number(item.price).toFixed(2)} €
                  </span>
                </div>

                {/* Stock display / edit */}
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', minWidth: 'auto' }}
                      onClick={() => setEditValue(v => Math.max(0, v - 1))}>
                      <Minus size={14} />
                    </button>
                    <input
                      type="number" min={0} value={editValue}
                      onChange={e => setEditValue(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input-field"
                      style={{ width: '70px', textAlign: 'center', padding: '0.4rem 0.6rem' }}
                    />
                    <button className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', minWidth: 'auto' }}
                      onClick={() => setEditValue(v => v + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1.5rem', fontWeight: 800,
                      color: item.stock === 0 ? '#F87171' : item.stock <= 5 ? '#FCD34D' : 'var(--text-primary)',
                    }}>
                      {item.stock}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>en stock</div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {isEditing ? (
                    <>
                      <button className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        disabled={stockMutation.isPending}
                        onClick={() => stockMutation.mutate({ id: item.id, stock: editValue })}>
                        Valider
                      </button>
                      <button className="btn btn-secondary"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => setEditingId(null)}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        onClick={() => { setEditingId(item.id); setEditValue(item.stock); }}>
                        Modifier
                      </button>
                      {item.stock === 0 && (
                        <button className="btn btn-primary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          onClick={() => stockMutation.mutate({ id: item.id, stock: 10 })}>
                          <RotateCcw size={14} /> Restoc.
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
