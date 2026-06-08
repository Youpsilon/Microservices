import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { PackageCheck, Clock, ChefHat, Bike, CheckCircle, XCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  id: string;
  status: string;
  deliveryType: 'delivery' | 'pickup';
  total: number;
  subtotal: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  pending:   { label: 'Reçue',          color: '#FCD34D', icon: <Clock size={16} />,        description: 'Votre commande a bien été reçue et attend confirmation.' },
  confirmed: { label: 'Confirmée',      color: '#60A5FA', icon: <CheckCircle size={16} />,  description: 'Votre commande est confirmée, la cuisine va démarrer.' },
  preparing: { label: 'En préparation', color: '#F97316', icon: <ChefHat size={16} />,      description: 'Le chef prépare votre commande en ce moment.' },
  ready:     { label: 'Prête',          color: '#34D399', icon: <PackageCheck size={16} />, description: 'Votre commande est prête !' },
  delivered: { label: 'Livrée',         color: '#A78BFA', icon: <Bike size={16} />,         description: 'Votre commande a été livrée. Bon appétit !' },
  completed: { label: 'Terminée',       color: '#A78BFA', icon: <CheckCircle size={16} />,  description: 'Commande terminée.' },
  cancelled: { label: 'Annulée',        color: '#F87171', icon: <XCircle size={16} />,      description: 'Cette commande a été annulée.' },
};

// Order progress steps
const PROGRESS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

function OrderProgressBar({ status }: { status: string }) {
  const currentIdx = PROGRESS_STEPS.indexOf(status);
  if (currentIdx === -1) return null; // cancelled or completed

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '1.25rem' }}>
      {PROGRESS_STEPS.map((step, idx) => {
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const cfg = STATUS_CONFIG[step];
        return (
          <React.Fragment key={step}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', flex: '0 0 auto',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: isCompleted ? cfg.color : 'rgba(255,255,255,0.1)',
                border: isCurrent ? `2px solid ${cfg.color}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isCompleted ? '#0F172A' : 'var(--text-muted)',
                fontSize: '0.75rem',
                boxShadow: isCurrent ? `0 0 12px ${cfg.color}88` : 'none',
                transition: 'all 0.3s ease',
              }}>
                {cfg.icon}
              </div>
              <span style={{ fontSize: '0.65rem', color: isCompleted ? cfg.color : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>
                {cfg.label}
              </span>
            </div>
            {idx < PROGRESS_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: '2px',
                background: idx < currentIdx ? PROGRESS_STEPS[idx + 1] ? STATUS_CONFIG[PROGRESS_STEPS[idx + 1]]?.color : '#34D399' : 'rgba(255,255,255,0.1)',
                margin: '0 4px', marginBottom: '1.25rem',
                transition: 'all 0.3s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function MyOrders() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: result, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders?limit=50');
      return data as { data: Order[]; meta: any };
    },
    refetchInterval: 15000,
  });

  const orders = result?.data ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <ShoppingBag size={30} /> Mes Commandes
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Suivez l'état de vos commandes en temps réel</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={16} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          Chargement de vos commandes...
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <ShoppingBag size={56} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
          <h3 style={{ marginBottom: '0.75rem' }}>Aucune commande</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Vous n'avez pas encore passé de commande.
          </p>
          <Link to="/menu" className="btn btn-primary">
            Voir le Menu
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending'];
            const isExpanded = expandedId === order.id;
            const isActive = !['delivered', 'cancelled', 'completed'].includes(order.status);

            return (
              <div key={order.id} className="card" style={{
                borderLeft: `4px solid ${cfg.color}`,
                transition: 'all 0.3s ease',
              }}>
                {/* Order Header */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(prev => prev === order.id ? null : order.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '10px',
                      background: `${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: cfg.color,
                    }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                        {isActive && (
                          <span style={{
                            marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center',
                            background: `${cfg.color}22`, color: cfg.color,
                            borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700,
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, marginRight: '0.35rem', display: 'inline-block', animation: 'pulse 1.5s ease infinite' }} />
                            En cours
                          </span>
                        )}
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
                    {/* Progress bar */}
                    {order.status !== 'cancelled' && <OrderProgressBar status={order.status} />}

                    {/* Status description */}
                    <div style={{
                      background: `${cfg.color}11`, border: `1px solid ${cfg.color}33`,
                      borderRadius: '10px', padding: '0.75rem 1rem',
                      color: cfg.color, fontSize: '0.875rem', fontWeight: 500,
                      marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                      {cfg.icon} {cfg.description}
                    </div>

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {order.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.3rem 0' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>×{item.qty}</span> {item.name}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {(item.qty * item.unitPrice).toFixed(2)} €
                          </span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                        <span>Total</span>
                        <span style={{ color: 'var(--brand-primary)' }}>{Number(order.total).toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
