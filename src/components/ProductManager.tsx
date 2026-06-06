import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Product, Supplier } from '../db/schema';
import { Plus, Search, Trash2, Check } from 'lucide-react';

interface ProductManagerProps {
  triggerToast: (msg: string) => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ triggerToast }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    category: 'Honey',
    description: '',
    purchasePrice: 0,
    sellingPrice: 0,
    maxDiscount: 0,
    currentStock: 0,
    unit: 'kg',
    supplierId: 0,
    image: 'sidr_honey',
    expiryDate: ''
  });

  // Smart Pricing Helper calculations
  const [pricingGuide, setPricingGuide] = useState({
    profit: 0,
    margin: 0,
    suggested20: 0,
    suggested30: 0,
    suggested40: 0
  });

  const categories = ['All', 'Honey', 'Olive Oil', 'Dates', 'Herbs', 'Natural Oils', 'Other'];
  const units = ['kg', 'g', 'liter', 'bottle', 'jar', 'piece', 'box'];
  const imagePlaceholders = [
    { key: 'sidr_honey', icon: '🍯', label: 'Sidr Honey' },
    { key: 'thyme_honey', icon: '🐝', label: 'Thyme Honey' },
    { key: 'olive_oil', icon: '🫒', label: 'Olive Oil' },
    { key: 'deglet_nour', icon: '🌴', label: 'Dates' },
    { key: 'rosemary', icon: '🌿', label: 'Herbs' },
    { key: 'almond_oil', icon: '💧', label: 'Natural Oil' },
    { key: 'generic_product', icon: '📦', label: 'Generic' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allProducts = await db.getProducts();
      const allSuppliers = await db.getSuppliers();
      setProducts(allProducts);
      setSuppliers(allSuppliers);
    } catch (err) {
      console.error('Failed to load products:', err);
      triggerToast('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate margins when prices change
  useEffect(() => {
    const cost = Number(formData.purchasePrice) || 0;
    const price = Number(formData.sellingPrice) || 0;
    
    const profit = price - cost;
    const margin = price > 0 ? (profit / price) * 100 : 0;

    // Suggested selling prices based on Cost and target margins:
    // price = cost / (1 - targetMargin)
    const suggested20 = cost / (1 - 0.20);
    const suggested30 = cost / (1 - 0.30);
    const suggested40 = cost / (1 - 0.40);

    setPricingGuide({
      profit,
      margin,
      suggested20: Math.round(suggested20),
      suggested30: Math.round(suggested30),
      suggested40: Math.round(suggested40)
    });
  }, [formData.purchasePrice, formData.sellingPrice]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Honey',
      description: '',
      purchasePrice: 0,
      sellingPrice: 0,
      maxDiscount: 0,
      currentStock: 0,
      unit: 'kg',
      supplierId: suppliers[0]?.id || 0,
      image: 'generic_product',
      expiryDate: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      maxDiscount: product.maxDiscount,
      currentStock: product.currentStock,
      unit: product.unit,
      supplierId: product.supplierId || 0,
      image: product.image || 'generic_product',
      expiryDate: product.expiryDate || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      triggerToast('Product name is required');
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === Number(formData.supplierId));
    const supplierName = selectedSupplier ? selectedSupplier.name : 'Unknown Supplier';

    const productData: Product = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
      maxDiscount: Number(formData.maxDiscount),
      currentStock: Number(formData.currentStock),
      unit: formData.unit,
      supplierId: Number(formData.supplierId),
      supplierName: supplierName,
      image: formData.image,
      expiryDate: formData.expiryDate || undefined
    };

    try {
      if (editingProduct) {
        productData.id = editingProduct.id;
        await db.updateProduct(productData);
        // Log stock adjustment if stock changed
        const stockDiff = productData.currentStock - editingProduct.currentStock;
        if (stockDiff !== 0) {
          await db.addStockLog({
            productId: editingProduct.id!,
            productName: productData.name,
            quantityChanged: stockDiff,
            type: 'adjustment',
            timestamp: new Date().toISOString(),
            note: 'Updated stock value manually in product editor'
          });
        }
        triggerToast('Product updated successfully!');
      } else {
        const newId = await db.addProduct(productData);
        await db.addStockLog({
          productId: newId,
          productName: productData.name,
          quantityChanged: productData.currentStock,
          type: 'add',
          timestamp: new Date().toISOString(),
          note: 'Initial stock addition on product creation'
        });
        triggerToast('Product added successfully!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      triggerToast('Error saving product');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await db.deleteProduct(id);
        triggerToast('Product deleted');
        loadData();
      } catch (err) {
        console.error(err);
        triggerToast('Error deleting product');
      }
    }
  };

  const getCategoryImage = (placeholderKey: string) => {
    const item = imagePlaceholders.find(x => x.key === placeholderKey);
    return item ? item.icon : '📦';
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Search Bar */}
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="filter-tabs">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`filter-tab ${activeCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px' }}>
          <p>Loading catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--on-surface-variant)', flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: '500' }}>No products found matching criteria.</p>
          <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={handleOpenAddModal}>
            Add First Product
          </button>
        </div>
      ) : (
        <div className="app-content" style={{ padding: 0, paddingBottom: '70px', overflowY: 'auto' }}>
          <div className="product-grid">
            {filteredProducts.map(prod => {
              const profit = prod.sellingPrice - prod.purchasePrice;
              const profitPercent = prod.sellingPrice > 0 ? Math.round((profit / prod.sellingPrice) * 100) : 0;
              const isLowStock = prod.currentStock <= 5;
              
              return (
                <div key={prod.id} className="product-card" onClick={() => handleOpenEditModal(prod)}>
                  <div className="product-image-placeholder" style={{ backgroundColor: 'var(--surface-variant)' }}>
                    <span>{getCategoryImage(prod.image)}</span>
                    <span className={`prod-stock-badge ${isLowStock ? 'low' : ''}`}>
                      {prod.currentStock} {prod.unit}
                    </span>
                  </div>
                  <div className="product-info">
                    <div className="product-name">{prod.name}</div>
                    <div className="product-price">{prod.sellingPrice.toLocaleString()} DA</div>
                    <div className="product-profit">
                      <span>Margin: {profitPercent}%</span>
                      <span style={{ color: 'var(--success)', fontWeight: '600' }}>+{profit} DA</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Action Button for Add Product */}
      <button className="fab" onClick={handleOpenAddModal} title="Add Product">
        <Plus size={24} />
      </button>

      {/* Add/Edit Modal (Bottom Sheet style) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              {editingProduct && (
                <button 
                  type="button" 
                  className="btn btn-text btn-danger" 
                  onClick={() => {
                    setIsModalOpen(false);
                    handleDeleteProduct(editingProduct.id!);
                  }}
                  style={{ padding: '6px' }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Pure Honeycomb, Organic Olive Oil"
                  required
                />
              </div>

              <div className="input-row">
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    className="select-field"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <select 
                    className="select-field"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="textarea-field" 
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details, origins, packaging size..."
                />
              </div>

              {/* Pricing Grid */}
              <div className="input-row">
                <div className="form-group">
                  <label>Purchase Price (DA)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    placeholder="Cost price"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price (DA)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    placeholder="Retail price"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Smart Pricing Assistant display */}
              <div className="card" style={{ backgroundColor: 'var(--surface-variant)', padding: '12px', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                  <span>PRICING ASSISTANT</span>
                  <span style={{ color: pricingGuide.margin >= 25 ? 'var(--success)' : 'var(--error)' }}>
                    {pricingGuide.margin >= 0 ? `${Math.round(pricingGuide.margin)}% Margin` : 'Invalid Price'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                  <span>Estimated Unit Profit:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{pricingGuide.profit} DA</span>
                </div>
                <div style={{ borderTop: '1px solid var(--outline)', paddingTop: '8px', fontSize: '10px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '4px' }}>Suggested Selling Prices:</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, sellingPrice: pricingGuide.suggested20 })}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '10px' }}
                    >
                      20% Margin: <b>{pricingGuide.suggested20} DA</b>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, sellingPrice: pricingGuide.suggested30 })}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '10px' }}
                    >
                      30% Margin: <b>{pricingGuide.suggested30} DA</b>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, sellingPrice: pricingGuide.suggested40 })}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '10px' }}
                    >
                      40% Margin: <b>{pricingGuide.suggested40} DA</b>
                    </button>
                  </div>
                </div>
              </div>

              <div className="input-row">
                <div className="form-group">
                  <label>Max Allowed Discount (DA)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={formData.maxDiscount || ''}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                    placeholder="Limit cash discount"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Current Stock</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={formData.currentStock || ''}
                    onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    placeholder="Qty in stock"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="input-row">
                <div className="form-group">
                  <label>Supplier</label>
                  <select 
                    className="select-field"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: Number(e.target.value) })}
                  >
                    <option value={0}>No Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Icon selector for visual polish */}
              <div className="form-group">
                <label>Select Icon/Image</label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                  {imagePlaceholders.map(img => (
                    <button
                      key={img.key}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: img.key })}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: formData.image === img.key ? '2px solid var(--primary)' : '1px solid var(--outline)',
                        backgroundColor: formData.image === img.key ? 'var(--primary-container)' : 'var(--surface)',
                        fontSize: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        minWidth: '50px'
                      }}
                    >
                      <span>{img.icon}</span>
                      <span style={{ fontSize: '8px', whiteSpace: 'nowrap' }}>{img.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  <Check size={18} />
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
