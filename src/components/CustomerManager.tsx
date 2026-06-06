import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Customer, Sale } from '../db/schema';
import { Plus, Search, Trash2, Phone, Mail, Award, Check } from 'lucide-react';

interface CustomerManagerProps {
  triggerToast: (msg: string) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({ triggerToast }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allCustomers = await db.getCustomers();
      const allSales = await db.getSales();
      setCustomers(allCustomers);
      setSales(allSales);
    } catch (err) {
      console.error(err);
      triggerToast('Error loading customer registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      triggerToast('Name and Phone are required.');
      return;
    }

    const customerData: Customer = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      notes: formData.notes
    };

    try {
      if (editingCustomer) {
        customerData.id = editingCustomer.id;
        await db.updateCustomer(customerData);
        triggerToast('Customer updated.');
      } else {
        await db.addCustomer(customerData);
        triggerToast('Customer added.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      triggerToast('Error saving: Phone number must be unique.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await db.deleteCustomer(id);
        triggerToast('Customer deleted.');
        loadData();
      } catch (err) {
        console.error(err);
        triggerToast('Error deleting customer.');
      }
    }
  };

  // Calculate stats for a customer (transactions and total spent)
  const getCustomerStats = (phone: string) => {
    const clientSales = sales.filter(s => s.customerPhone === phone);
    const spent = clientSales.reduce((sum, s) => sum + s.totalAmount, 0);
    return {
      count: clientSales.length,
      spent: spent
    };
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Search Bar */}
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input 
            type="text" 
            placeholder="Search by customer name or phone..." 
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <p>Loading database...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--on-surface-variant)' }}>
          <p>No customers found.</p>
        </div>
      ) : (
        <div className="app-content" style={{ padding: 0, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCustomers.map(cust => {
              const stats = getCustomerStats(cust.phone);
              
              return (
                <div 
                  key={cust.id} 
                  className="card"
                  onClick={() => handleOpenEdit(cust)}
                  style={{ 
                    padding: '12px 16px', 
                    marginBottom: 0, 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{cust.name}</span>
                    {stats.count >= 3 && (
                      <span className="badge" style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Award size={10} /> VIP Member
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {cust.phone}
                    </span>
                    {cust.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} /> {cust.email}
                      </span>
                    )}
                  </div>

                  {cust.notes && (
                    <p style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--on-surface-variant)', borderLeft: '2px solid var(--outline)', paddingLeft: '6px' }}>
                      {cust.notes}
                    </p>
                  )}

                  {/* Purchase History Summary */}
                  <div style={{ 
                    marginTop: '4px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--outline-variant)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--on-surface-variant)'
                  }}>
                    <span>Sales: <b>{stats.count} purchases</b></span>
                    <span>Total Spent: <b style={{ color: 'var(--primary)' }}>{stats.spent.toLocaleString()} DA</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB to Add Customer */}
      <button className="fab" onClick={handleOpenAdd} title="Add Customer">
        <Plus size={24} />
      </button>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              {editingCustomer && (
                <button 
                  type="button" 
                  className="btn btn-text btn-danger" 
                  onClick={() => {
                    setIsModalOpen(false);
                    handleDelete(editingCustomer.id!);
                  }}
                  style={{ padding: '6px' }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Customer Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kamel Benali"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number (Unique)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 0555112233"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. client@gmail.com"
                />
              </div>

              <div className="form-group">
                <label>Notes / Buying Preferences</label>
                <textarea 
                  className="textarea-field" 
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Preferences, bulk buyer notes..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  <Check size={18} />
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
