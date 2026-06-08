import React, { useState } from 'react';
import { LayoutGrid, Package } from 'lucide-react';
import AdminOrders from './AdminOrders';
import AdminStock from './AdminStock';

const tabs = [
  { id: 'orders', label: 'Commandes', icon: <LayoutGrid size={16} /> },
  { id: 'stock',  label: 'Stocks',    icon: <Package size={16} /> },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'orders' | 'stock'>('orders');

  return (
    <div>
      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '0.5rem',
        marginBottom: '2.5rem',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
        padding: '0.4rem',
        width: 'fit-content',
        backdropFilter: 'blur(10px)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'orders' | 'stock')}
            className={activeTab === tab.id ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.4rem', fontSize: '0.95rem',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && <AdminOrders />}
      {activeTab === 'stock'  && <AdminStock />}
    </div>
  );
}
