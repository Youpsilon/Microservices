import React, { useState } from 'react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { ShoppingBag, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Cart = () => {
  const cart = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'delivery'|'pickup'>('delivery');

  const total = cart.items.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      alert("Veuillez vous connecter pour valider la commande.");
      return;
    }
    
    if (cart.items.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await cart.placeOrder(deliveryType);
      setOrderStatus(res.message);
    } catch (e: any) {
      alert("Erreur lors de la commande: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderStatus) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <CheckCircle2 size={64} color="var(--brand-primary)" style={{ margin: '0 auto 1.5rem' }} />
        <h2>Commande acceptée !</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
          {orderStatus} <br />
          Elle est actuellement dans notre système et sera préparée sous peu.
        </p>
        <Link to="/menu" className="btn btn-primary">Retour au Menu</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <ShoppingBag size={28} /> Mon Panier
      </h1>

      {cart.items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>Votre panier est vide</h3>
          <p style={{ margin: '1rem 0 2rem' }}>Découvrez notre menu et trouvez votre prochain plat favori !</p>
          <Link to="/menu" className="btn btn-primary">Voir le Menu</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cart.items.map(item => (
              <div key={item.menuItemId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{item.name}</h3>
                  <span style={{ color: 'var(--brand-secondary)' }}>{Number(item.unitPrice).toFixed(2)} € / unité</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 'bold' }}>x{item.qty}</div>
                  <div style={{ fontWeight: 'bold', width: '80px', textAlign: 'right' }}>
                    {(item.qty * item.unitPrice).toFixed(2)} €
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => cart.clearCart()}
              className="btn btn-secondary" 
              style={{ alignSelf: 'flex-start', marginTop: '1rem' }}
            >
              <Trash2 size={16} /> Vider le panier
            </button>
          </div>

          <div className="card" style={{ position: 'sticky', top: '120px' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              Récapitulatif
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Mode de livraison</label>
              <select 
                className="input-field" 
                value={deliveryType} 
                onChange={(e) => setDeliveryType(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="delivery">Livraison à domicile</option>
                <option value="pickup">À emporter</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <span>Sous-total</span>
              <span>{total.toFixed(2)} €</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <span>Total</span>
              <span>{total.toFixed(2)} €</span>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '2rem', display: 'flex', justifyContent: 'center' }}
              onClick={handleCheckout}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Traitement...' : 'Valider la commande'} <ArrowRight size={18} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default Cart;
