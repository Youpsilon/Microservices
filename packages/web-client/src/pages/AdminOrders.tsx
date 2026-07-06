import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, ChefHat, Bike, PackageCheck } from 'lucide-react';
import api from '../services/api';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivering' | 'delivered' | 'completed' | 'cancelled';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  deliveryType: 'delivery' | 'pickup';
  total: number;
  subtotal: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'En attente',    color: '#FCD34D', icon: <Clock size={14} /> },
  confirmed:  { label: 'Confirmée',     color: '#60A5FA', icon: <CheckCircle size={14} /> },
  preparing:  { label: 'En préparation', color: '#F97316', icon: <ChefHat size={14} /> },
  ready:      { label: 'Prête',         color: '#34D399', icon: <PackageCheck size={14} /> },
  picked_up:  { label: 'Récupérée',     color: '#F59E0B', icon: <Bike size={14} /> },
  delivering: { label: 'En livraison',  color: '#8B5CF6', icon: <Bike size={14} /> },
  delivered:  { label: 'Livrée',        color: '#A78BFA', icon: <CheckCircle size={14} /> },
  completed:  { label: 'Terminée',      color: '#10B981', icon: <CheckCircle size={14} /> },
  cancelled:  { label: 'Annulée',       color: '#F87171', icon: <XCircle size={14} /> },
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['preparing', 'cancelled'],
  preparing:  ['ready'],
  ready:      ['picked_up'],
  picked_up:  ['delivering'],
  delivering: ['delivered'],
  delivered:  ['completed'],
  completed:  [],
  cancelled:  [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/orders?limit=1000');
      setOrders(res.data.data || []);
    } catch {
      setError('Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // auto-refresh
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showToast(`Commande mise à jour → ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const allStatuses = Object.keys(STATUS_CONFIG) as OrderStatus[];
  const filteredOrders = orders.filter(o => !filterStatus || o.status === filterStatus);

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: '#fff', padding: '0.85rem 1.5rem', borderRadius: '12px',
          fontWeight: 600, backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.25rem' }}>Dashboard Admin</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestion des commandes en temps réel</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchOrders} disabled={loading}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Filter Pills */}
      <div className="categories-filter" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
        <button className={`btn ${filterStatus === '' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
          onClick={() => setFilterStatus('')}>
          Toutes
        </button>
        {allStatuses.map(s => (
          <button key={s}
            className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: filterStatus !== s ? STATUS_CONFIG[s].color : undefined }}
            onClick={() => setFilterStatus(prev => prev === s ? '' : s)}>
            {STATUS_CONFIG[s].icon}
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#F87171', textAlign: 'center', padding: '2rem' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && orders.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem' }}>
          Chargement des commandes...
        </div>
      )}

      {/* Orders List */}
      {!loading && filteredOrders.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          Aucune commande trouvée.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredOrders.map(order => {
          const cfg = STATUS_CONFIG[order.status] || { label: order.status || 'Inconnu', color: '#9CA3AF', icon: <Clock size={14} /> };
          const transitions = STATUS_TRANSITIONS[order.status] || [];
          const isExpanded = expandedId === order.id;

          return (
            <div key={order.id} className="card" style={{
              border: '1px solid var(--border-light)',
              transition: 'all 0.3s ease',
              ...(updatingId === order.id ? { opacity: 0.6 } : {}),
            }}>
              {/* Order Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(prev => prev === order.id ? null : order.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.15rem' }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleString('fr-FR')} · {order.deliveryType === 'delivery' ? '🛵 Livraison' : '🏃 À emporter'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-primary)' }}>
                    {Number(order.total).toFixed(2)} €
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    background: `${cfg.color}22`, color: cfg.color,
                    border: `1px solid ${cfg.color}44`,
                    borderRadius: '999px', padding: '0.35rem 0.9rem',
                    fontSize: '0.8rem', fontWeight: 700,
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>x{item.qty}</span> {item.name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{(item.qty * item.unitPrice).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  {transitions.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {transitions.map(nextStatus => {
                        const nextCfg = STATUS_CONFIG[nextStatus];
                        const isDanger = nextStatus === 'cancelled';
                        return (
                          <button
                            key={nextStatus}
                            className={`btn ${isDanger ? 'btn-secondary' : 'btn-primary'}`}
                            style={{
                              fontSize: '0.85rem', padding: '0.5rem 1.25rem',
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              ...(isDanger ? { color: '#F87171', borderColor: 'rgba(248,113,113,0.3)' } : {}),
                            }}
                            disabled={updatingId === order.id}
                            onClick={() => updateStatus(order.id, nextStatus)}
                          >
                            {nextCfg.icon}
                            → {nextCfg.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {transitions.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Commande terminée — aucune action possible.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
