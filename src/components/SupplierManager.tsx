import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Supplier, Product } from '../db/schema';
import { Plus, Search, Trash2, Phone, Mail, Check } from 'lucide-react';

interface SupplierManagerProps {
  triggerToast: (msg: string) => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ triggerToast }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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
      const allSuppliers = await db.getSuppliers();
      const allProducts = await db.getProducts();
      setSuppliers(allSuppliers);
      setProducts(allProducts);
    } catch (err) {
      console.error(err);
      triggerToast('Error loading suppliers.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', email: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      phone: s.phone,
      email: s.email,
      notes: s.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      triggerToast('Name and Phone are required.');
      return;
    }

    const supplierData: Supplier = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      notes: formData.notes
    };

    try {
      if (editingSupplier) {
        supplierData.id = editingSupplier.id;
        await db.updateSupplier(supplierData);
        triggerToast('Supplier updated.');
      } else {
        await db.addSupplier(supplierData);
        triggerToast('Supplier added.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      triggerToast('Error saving supplier.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this supplier? Products linked to this supplier will lose their link.')) {
      try {
        await db.deleteSupplier(id);
        triggerToast('Supplier deleted.');
        loadData();
      } catch (err) {
        console.error(err);
        triggerToast('Error deleting supplier.');
      }
    }
  };

  // Find products supplied by this supplier
  const getSuppliedProducts = (supId?: number) => {
    if (!supId) return [];
    return products.filter(p => p.supplierId === supId);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Search Bar */}
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input 
            type="text" 
            placeholder="Search by supplier name..." 
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
      ) : filteredSuppliers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--on-surface-variant)' }}>
          <p>No suppliers registered.</p>
        </div>
      ) : (
        <div className="app-content" style={{ padding: 0, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredSuppliers.map(sup => {
              const supplied = getSuppliedProducts(sup.id);
              
              return (
                <div 
                  key={sup.id} 
                  className="card"
                  onClick={() => handleOpenEdit(sup)}
                  style={{ 
                    padding: '12px 16px', 
                    marginBottom: 0, 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '15px' }}>{sup.name}</span>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {sup.phone}
                    </span>
                    {sup.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} /> {sup.email}
                      </span>
                    )}
                  </div>

                  {sup.notes && (
                    <p style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--on-surface-variant)', borderLeft: '2px solid var(--outline)', paddingLeft: '6px' }}>
                      {sup.notes}
                    </p>
                  )}

                  {/* Supplied products summary */}
                  <div style={{ 
                    marginTop: '4px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--outline-variant)',
                    fontSize: '11px',
                    color: 'var(--on-surface-variant)'
                  }}>
                    <span>Supplying: <b>{supplied.length} catalog items</b></span>
                    {supplied.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {supplied.slice(0, 3).map(p => (
                          <span key={p.id} className="badge badge-default" style={{ fontSize: '8px', padding: '2px 4px' }}>
                            {p.name}
                          </span>
                        ))}
                        {supplied.length > 3 && (
                          <span style={{ fontSize: '8px', color: 'var(--on-surface-variant)' }}>
                            +{supplied.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB to Add Supplier */}
      <button className="fab" onClick={handleOpenAdd} title="Add Supplier">
        <Plus size={24} />
      </button>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
              {editingSupplier && (
                <button 
                  type="button" 
                  className="btn btn-text btn-danger" 
                  onClick={() => {
                    setIsModalOpen(false);
                    handleDelete(editingSupplier.id!);
                  }}
                  style={{ padding: '6px' }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Supplier Company Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sidi Ali Olive Press"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Phone Number</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +213 550 11 22 33"
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
                  placeholder="e.g. supply@office.dz"
                />
              </div>

              <div className="form-group">
                <label>Notes / Delivery Schedule</label>
                <textarea 
                  className="textarea-field" 
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Delivers every second Tuesday, accepts bank draft."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  <Check size={18} />
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
