import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await api.post('/auth/signup', { name, email, password });
      login(res.data);
      navigate('/menu');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="card text-center">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <UserPlus color="var(--brand-primary)" /> Inscription
        </h2>
        
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#F8D7DA', color: '#721C24', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="input-group">
            <label className="input-label">Nom complet</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ex: Jean Dupont"
              value={name}
              onChange={e => setName(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="Ex: jean.dupont@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Mot de passe</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Ex: Password123!"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
              minLength={8}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Chargement...' : 'Créer un compte'}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Déjà un compte ? <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Se connecter</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
