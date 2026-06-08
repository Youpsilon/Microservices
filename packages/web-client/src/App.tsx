import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/Navbar';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import KitchenDashboard from './pages/KitchenDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import MyOrders from './pages/MyOrders';

const PrivateRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) return <div className="p-8 text-center">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (roles && user && !roles.some(r => user.roles.includes(r))) {
    return <Navigate to="/" />; // Unauthorized for this role
  }
  
  return <>{children}</>;
};

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main className="main-content animate-fade-in">
          <Routes>
            <Route path="/" element={<Navigate to="/menu" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/cart" element={<Cart />} />

            {/* Client routes */}
            <Route path="/orders" element={
              <PrivateRoute roles={['client', 'admin']}>
                <MyOrders />
              </PrivateRoute>
            } />

            {/* Chef routes */}
            <Route path="/kitchen" element={
              <PrivateRoute roles={['chef', 'admin']}>
                <KitchenDashboard />
              </PrivateRoute>
            } />

            {/* Delivery routes */}
            <Route path="/deliveries" element={
              <PrivateRoute roles={['livreur', 'admin']}>
                <DeliveryDashboard />
              </PrivateRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <PrivateRoute roles={['admin']}>
                <Admin />
              </PrivateRoute>
            } />
            <Route path="/admin/orders" element={<Navigate to="/admin" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
