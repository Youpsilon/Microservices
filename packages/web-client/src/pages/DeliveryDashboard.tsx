import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Bike, MapPin, CheckCircle2, Clock, RefreshCw, Package, User } from 'lucide-react';

interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'available' | 'busy' | 'offline';
  currentLocation?: { lat: number; lng: number };
}

interface Delivery {
  id: string;
  orderId: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'completed';
  courierId?: string;
  eta?: string;
  createdAt: string;
  courier?: Courier;
}

const DELIVERY_STATUS_CONFIG = {
  pending:    { label: 'En attente',   color: '#FCD34D', icon: <Clock size={14} /> },
  assigned:   { label: 'Assignée',     color: '#60A5FA', icon: <User size={14} /> },
  picked_up:  { label: 'Récupérée',    color: '#F97316', icon: <Bike size={14} /> },
  in_transit: { label: 'En livraison', color: '#A78BFA', icon: <MapPin size={14} /> },
  completed:  { label: 'Livrée',       color: '#34D399', icon: <CheckCircle2 size={14} /> },
};

const COURIER_STATUS_CONFIG = {
  available: { label: 'Disponible', color: '#34D399' },
  busy:      { label: 'En mission', color: '#F97316' },
  offline:   { label: 'Hors ligne', color: '#64748B' },
};

const STATUS_TRANSITIONS: Record<string, string | null> = {
  pending:    null,
  assigned:   'picked_up',
  picked_up:  'completed',
  in_transit: 'completed',
  completed:  null,
};

const STATUS_TRANSITION_LABELS: Record<string, string> = {
  picked_up:  '📦 Marquer récupérée',
  completed:  '✅ Marquer livrée',
};

export default function DeliveryDashboard() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('assigned,picked_up');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: deliveries = [], isLoading: deliveriesLoading, refetch, isFetching } = useQuery({
    queryKey: ['deliveries', statusFilter],
    queryFn: async () => {
      const params = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/deliveries${params}`);
      return data as Delivery[];
    },
    refetchInterval: 10000,
  });

  const { data: couriers = [] } = useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const { data } = await api.get('/couriers');
      return data as Courier[];
    },
    refetchInterval: 15000,
  });

  const deliveryStatusMutation = useMutation({
    mutationFn: ({ deliveryId, status }: { deliveryId: string; status: string }) =>
      api.patch(`/deliveries/${deliveryId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      showToast('Statut mis à jour !');
    },
    onError: () => showToast('Erreur lors de la mise à jour', 'error'),
  });

  const courierStatusMutation = useMutation({
    mutationFn: ({ courierId, status }: { courierId: string; status: string }) =>
      api.patch(`/couriers/${courierId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      showToast('Statut livreur mis à jour !');
    },
    onError: () => showToast('Erreur', 'error'),
  });

  const pendingCount   = deliveries.filter(d => d.status === 'pending').length;
  const activeCount    = deliveries.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status)).length;
  const completedCount = deliveries.filter(d => d.status === 'completed').length;
  const availableCouriers = couriers.filter(c => c.status === 'available').length;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Bike size={32} /> Tableau de Bord Livraison
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez les livraisons en cours — auto-rafraîchi toutes les 10s</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={16} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'En attente',   value: pendingCount,   color: '#FCD34D' },
          { label: 'En cours',     value: activeCount,    color: '#F97316' },
          { label: 'Livrées',      value: completedCount, color: '#34D399' },
          { label: 'Livreurs dispo', value: availableCouriers, color: '#60A5FA' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        {/* Deliveries List */}
        <div>
          {/* Filter Pills */}
          <div className="categories-filter" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
            {[
              { value: 'assigned,picked_up',  label: 'En cours' },
              { value: 'pending',              label: 'En attente' },
              { value: 'completed',            label: 'Terminées' },
              { value: 'all',                  label: 'Toutes' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`btn ${statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {deliveriesLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              Chargement des livraisons...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>Aucune livraison pour ce filtre.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deliveries.map(delivery => {
                const cfg = DELIVERY_STATUS_CONFIG[delivery.status] ?? DELIVERY_STATUS_CONFIG.pending;
                const nextStatus = STATUS_TRANSITIONS[delivery.status];

                return (
                  <div key={delivery.id} className="card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.3rem' }}>
                          Commande #{delivery.orderId.slice(0, 8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(delivery.createdAt).toLocaleString('fr-FR')}
                        </div>
                        {delivery.courier && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Bike size={13} /> {delivery.courier.name} ({delivery.courier.vehicle})
                          </div>
                        )}
                        {delivery.eta && (
                          <div style={{ fontSize: '0.82rem', color: '#60A5FA', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={13} /> ETA : {new Date(delivery.eta).toLocaleTimeString('fr-FR')}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          background: `${cfg.color}22`, color: cfg.color,
                          border: `1px solid ${cfg.color}44`,
                          borderRadius: '999px', padding: '0.3rem 0.85rem',
                          fontSize: '0.78rem', fontWeight: 700,
                        }}>
                          {cfg.icon} {cfg.label}
                        </span>

                        {nextStatus && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                            disabled={deliveryStatusMutation.isPending}
                            onClick={() => deliveryStatusMutation.mutate({ deliveryId: delivery.id, status: nextStatus })}
                          >
                            {STATUS_TRANSITION_LABELS[nextStatus]}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Couriers Panel */}
        <div style={{ position: 'sticky', top: '120px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <User size={16} /> Livreurs
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {couriers.map(courier => {
              const statusCfg = COURIER_STATUS_CONFIG[courier.status] ?? COURIER_STATUS_CONFIG.offline;
              return (
                <div key={courier.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{courier.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {courier.vehicle} · {courier.phone}
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      background: `${statusCfg.color}22`, color: statusCfg.color,
                      border: `1px solid ${statusCfg.color}44`,
                      borderRadius: '999px', padding: '0.25rem 0.65rem',
                      fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusCfg.color, display: 'inline-block' }} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Toggle availability */}
                  {courier.status !== 'busy' && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {courier.status === 'offline' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.85rem', fontSize: '0.78rem', flex: 1 }}
                          onClick={() => courierStatusMutation.mutate({ courierId: courier.id, status: 'available' })}
                          disabled={courierStatusMutation.isPending}
                        >
                          Se connecter
                        </button>
                      )}
                      {courier.status === 'available' && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.85rem', fontSize: '0.78rem', flex: 1, color: '#64748B' }}
                          onClick={() => courierStatusMutation.mutate({ courierId: courier.id, status: 'offline' })}
                          disabled={courierStatusMutation.isPending}
                        >
                          Se déconnecter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
