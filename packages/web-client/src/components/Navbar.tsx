import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import {
  UtensilsCrossed, LogOut, ShoppingBag, LayoutGrid,
  ChefHat, Bike, ClipboardList,
} from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const cartItemsCount = useCartStore(state =>
    state.items.reduce((acc, item) => acc + item.qty, 0)
  );
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const role = user?.roles?.[0] ?? null;

  // ─── Role-specific nav links ───────────────────────────────────────────────
  const renderLinks = () => {
    if (!isAuthenticated) {
      return (
        <>
          <Link to="/menu"     className={`nav-link ${isActive('/menu') ? 'active' : ''}`}>Menu</Link>
          <Link to="/login"    className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Connexion</Link>
          <Link to="/register" className="btn btn-primary"   style={{ padding: '0.5rem 1.25rem' }}>Inscription</Link>
        </>
      );
    }

    // ── Client ────────────────────────────────────────────────────────────────
    if (role === 'client') {
      return (
        <>
          <Link to="/menu"   className={`nav-link ${isActive('/menu') ? 'active' : ''}`}>Menu</Link>
          <Link to="/orders" className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ClipboardList size={15} /> Mes commandes
          </Link>
          <Link to="/cart"   className={`nav-link ${isActive('/cart') ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', position: 'relative' }}>
            <ShoppingBag size={17} /> Panier
            {cartItemsCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-16px',
                background: 'var(--brand-primary)', color: '#fff',
                borderRadius: '999px', padding: '0.1rem 0.42rem',
                fontSize: '0.72rem', fontWeight: 800,
                animation: 'popIn 0.2s ease-out',
              }}>{cartItemsCount}</span>
            )}
          </Link>
        </>
      );
    }

    // ── Chef ──────────────────────────────────────────────────────────────────
    if (role === 'chef') {
      return (
        <Link to="/kitchen" className={`nav-link ${isActive('/kitchen') ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isActive('/kitchen') ? 'var(--text-primary)' : '#F97316' }}>
          <ChefHat size={16} /> Tableau cuisine
        </Link>
      );
    }

    // ── Livreur ───────────────────────────────────────────────────────────────
    if (role === 'livreur') {
      return (
        <Link to="/deliveries" className={`nav-link ${isActive('/deliveries') ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isActive('/deliveries') ? 'var(--text-primary)' : '#60A5FA' }}>
          <Bike size={16} /> Mes livraisons
        </Link>
      );
    }

    // ── Admin — all tabs visible ──────────────────────────────────────────────
    if (role === 'admin') {
      return (
        <>
          <Link to="/menu"       className={`nav-link ${isActive('/menu') ? 'active' : ''}`}>Menu</Link>
          <Link to="/kitchen"    className={`nav-link ${isActive('/kitchen') ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isActive('/kitchen') ? 'var(--text-primary)' : '#F97316' }}>
            <ChefHat size={15} /> Cuisine
          </Link>
          <Link to="/deliveries" className={`nav-link ${isActive('/deliveries') ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isActive('/deliveries') ? 'var(--text-primary)' : '#60A5FA' }}>
            <Bike size={15} /> Livraisons
          </Link>
          <Link to="/admin"      className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isActive('/admin') ? 'var(--text-primary)' : 'var(--brand-primary)' }}>
            <LayoutGrid size={15} /> Admin
          </Link>
        </>
      );
    }

    return null;
  };

  // ─── Role badge colour ─────────────────────────────────────────────────────
  const roleMeta: Record<string, { label: string; color: string }> = {
    client:  { label: 'Client',   color: '#94A3B8' },
    chef:    { label: 'Chef',     color: '#F97316' },
    livreur: { label: 'Livreur',  color: '#60A5FA' },
    admin:   { label: 'Admin',    color: 'var(--brand-primary)' },
  };
  const roleInfo = role ? (roleMeta[role] ?? { label: role, color: '#94A3B8' }) : null;

  return (
    <div className="navbar-wrapper">
      <nav className="navbar">
        {/* Brand */}
        <Link to="/" className="brand">
          <UtensilsCrossed size={26} />
          <span>Le Gourmet</span>
        </Link>

        {/* Nav links — role-contextual */}
        <div className="nav-links">
          {renderLinks()}

          {/* User info + logout — shown only when authenticated */}
          {isAuthenticated && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.85rem',
              marginLeft: '0.5rem', paddingLeft: '1rem',
              borderLeft: '1px solid var(--border-light)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.name}
                </span>
                {roleInfo && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: roleInfo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {roleInfo.label}
                  </span>
                )}
              </div>
              <button onClick={logout} className="btn btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', gap: '0.35rem' }}>
                <LogOut size={15} /> Quitter
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
