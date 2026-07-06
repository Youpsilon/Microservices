import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ChefHat, Clock, Flame, CheckCircle2, RefreshCw, Package } from 'lucide-react';

interface TicketItem {
  id: string;
  name: string;
  qty: number;
  notes?: string;
  status: 'pending' | 'in_progress' | 'ready';
}

interface KitchenTicket {
  id: string;
  orderId: string;
  status: 'pending' | 'preparing' | 'ready';
  priority: number;
  items: TicketItem[];
  createdAt: string;
}

const ITEM_STATUS_CONFIG = {
  pending:     { label: 'En attente',     color: '#FCD34D', icon: <Clock size={13} /> },
  in_progress: { label: 'En préparation', color: '#F97316', icon: <Flame size={13} /> },
  ready:       { label: 'Prêt',           color: '#34D399', icon: <CheckCircle2 size={13} /> },
};

const TICKET_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: 'Nouveau',          color: '#EF4444', dot: '#EF4444' }, // red to show action needed
  accepted:  { label: 'Accepté',          color: '#FCD34D', dot: '#FCD34D' },
  preparing: { label: 'En préparation',   color: '#F97316', dot: '#F97316' },
  ready:     { label: 'Prêt à servir',    color: '#34D399', dot: '#34D399' },
};

const fetchTickets = async (statusFilter?: string): Promise<KitchenTicket[]> => {
  const params = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
  const { data } = await api.get(`/kitchen/orders${params}`);
  return data;
};

export default function KitchenDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending,preparing');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: tickets = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['kitchen-tickets'],
    queryFn: () => fetchTickets('all'),
    refetchInterval: 10000, // Auto-refresh every 10s
  });

  const itemStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      api.patch(`/kitchen/items/${itemId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
      showToast('Statut mis à jour !');
    },
    onError: () => showToast('Erreur lors de la mise à jour', 'error'),
  });

  const ticketReadyMutation = useMutation({
    mutationFn: (ticketId: string) => api.post(`/kitchen/orders/${ticketId}/ready`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
      showToast('🎉 Commande prête à servir !');
    },
    onError: () => showToast('Erreur', 'error'),
  });

  const acceptTicketMutation = useMutation({
    mutationFn: (ticketId: string) => api.post(`/kitchen/orders/${ticketId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
      showToast('Commande acceptée !');
    },
    onError: () => showToast('Erreur lors de l\'acceptation', 'error'),
  });


  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'pending,preparing') {
      return ['pending', 'preparing'].includes(t.status);
    }
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

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
            <ChefHat size={32} /> Tableau de Bord Cuisine
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez vos tickets en temps réel — auto-rafraîchi toutes les 10s</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={16} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>


      {/* Filter Pills */}
      <div className="categories-filter" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
        {[
          { value: 'pending,preparing', label: 'En cours' },
          { value: 'pending',           label: 'Nouveaux seulement' },
          { value: 'ready',             label: 'Prêts' },
          { value: 'all',               label: 'Tous' },
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

      {/* Tickets */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          Chargement des tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>Aucun ticket pour ce filtre. Le fourneau est calme !</p>
        </div>
      ) : (
        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          {filteredTickets.map(ticket => {
            const cfg = TICKET_STATUS_CONFIG[ticket.status] ?? TICKET_STATUS_CONFIG.pending;
            const allItemsReady = ticket.items.every(i => i.status === 'ready');

            return (
              <div key={ticket.id} className="card" style={{
                borderLeft: `4px solid ${cfg.dot}`,
                transition: 'all 0.3s ease',
              }}>
                {/* Ticket Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.03em' }}>
                      #{ticket.orderId.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {new Date(ticket.createdAt).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    background: `${cfg.color}22`, color: cfg.color,
                    border: `1px solid ${cfg.color}44`,
                    borderRadius: '999px', padding: '0.3rem 0.85rem',
                    fontSize: '0.78rem', fontWeight: 700,
                  }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  {ticket.items.map(item => {
                    const itemCfg = ITEM_STATUS_CONFIG[item.status] ?? ITEM_STATUS_CONFIG.pending;
                    return (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.65rem 1rem',
                        border: `1px solid ${itemCfg.color}33`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>×{item.qty}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
                            {item.notes && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                📝 {item.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Item Status Toggle */}
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {item.status === 'pending' && ticket.status !== 'pending' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#F97316', borderColor: 'rgba(249,115,22,0.3)' }}
                              onClick={() => itemStatusMutation.mutate({ itemId: item.id, status: 'in_progress' })}
                              disabled={itemStatusMutation.isPending}
                            >
                              <Flame size={12} /> Démarrer
                            </button>
                          )}
                          {item.status === 'in_progress' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              onClick={() => itemStatusMutation.mutate({ itemId: item.id, status: 'ready' })}
                              disabled={itemStatusMutation.isPending}
                            >
                              <CheckCircle2 size={12} /> Prêt
                            </button>
                          )}
                          {item.status === 'ready' && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              color: '#34D399', fontSize: '0.8rem', fontWeight: 700,
                            }}>
                              <CheckCircle2 size={13} /> Prêt
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ticket Footer */}
                {ticket.status === 'pending' && (
                  <button
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      display: 'flex', justifyContent: 'center', gap: '0.5rem',
                      background: 'var(--brand-primary)', color: '#fff',
                    }}
                    onClick={() => acceptTicketMutation.mutate(ticket.id)}
                    disabled={acceptTicketMutation.isPending}
                  >
                    <CheckCircle2 size={18} /> Accepter la commande
                  </button>
                )}
                {ticket.status !== 'ready' && ticket.status !== 'pending' && (
                  <button
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      display: 'flex', justifyContent: 'center', gap: '0.5rem',
                      opacity: allItemsReady ? 1 : 0.5,
                    }}
                    onClick={() => ticketReadyMutation.mutate(ticket.id)}
                    disabled={ticketReadyMutation.isPending}
                  >
                    <CheckCircle2 size={18} />
                    {allItemsReady ? 'Marquer commande prête ✓' : 'Forcer prête (urgence)'}
                  </button>
                )}
                {ticket.status === 'ready' && (
                  <div style={{ textAlign: 'center', color: '#34D399', fontWeight: 700, fontSize: '0.95rem' }}>
                    <CheckCircle2 size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Commande prête — en attente de livraison
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
