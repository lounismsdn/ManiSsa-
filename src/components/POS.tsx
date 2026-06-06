import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Product, Sale, Customer, SaleItem } from '../db/schema';
import { Search, ShoppingCart, User, Percent, Trash2, CheckCircle2, X, Play } from 'lucide-react';

interface POSProps {
  triggerToast: (msg: string) => void;
  onNavigate: (tab: string) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // custom discount applied to this item in total
}

export const POS: React.FC<POSProps> = ({ triggerToast, onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart & checkout state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [activeSaleId, setActiveSaleId] = useState<number | null>(null);

  // Barcode / Scanner simulation modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // Loaded state
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allProducts = await db.getProducts();
      const allCustomers = await db.getCustomers();
      setProducts(allProducts.filter(p => p.currentStock > 0)); // Only show items in stock
      setCustomers(allCustomers);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.currentStock) {
        triggerToast(`Out of stock: Only ${product.currentStock} units available.`);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
    triggerToast(`Added ${product.name} to cart.`);
  };

  const handleUpdateQty = (prodId: number, change: number) => {
    const item = cart.find(c => c.product.id === prodId);
    if (!item) return;

    const newQty = item.quantity + change;
    if (newQty <= 0) {
      // Remove from cart
      setCart(cart.filter(c => c.product.id !== prodId));
      return;
    }

    if (newQty > item.product.currentStock) {
      triggerToast(`Limit reached: Only ${item.product.currentStock} ${item.product.unit} in stock.`);
      return;
    }

    setCart(cart.map(c => 
      c.product.id === prodId 
        ? { ...c, quantity: newQty }
        : c
    ));
  };

  const handleApplyDiscount = (prodId: number, discVal: number) => {
    const item = cart.find(c => c.product.id === prodId);
    if (!item) return;

    // Limit discount to maxDiscount * quantity
    const maxAllowedTotal = item.product.maxDiscount * item.quantity;
    if (discVal > maxAllowedTotal) {
      triggerToast(`Max discount exceeded! Limit is ${maxAllowedTotal} DA.`);
      
      // Cap at maximum discount
      setCart(cart.map(c => 
        c.product.id === prodId 
          ? { ...c, discount: maxAllowedTotal }
          : c
      ));
      return;
    }

    setCart(cart.map(c => 
      c.product.id === prodId 
        ? { ...c, discount: Math.max(0, discVal) }
        : c
    ));
  };

  const handleRemoveItem = (prodId: number) => {
    setCart(cart.filter(c => c.product.id !== prodId));
    triggerToast('Item removed from cart.');
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let netProfit = 0;

    cart.forEach(item => {
      const itemSubtotal = item.product.sellingPrice * item.quantity;
      const itemCost = item.product.purchasePrice * item.quantity;
      const finalPrice = itemSubtotal - item.discount;
      const profit = finalPrice - itemCost;

      subtotal += itemSubtotal;
      totalDiscount += item.discount;
      netProfit += profit;
    });

    return {
      subtotal,
      discount: totalDiscount,
      total: subtotal - totalDiscount,
      profit: netProfit
    };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      triggerToast('Cart is empty.');
      return;
    }

    const totals = calculateTotals();
    const customer = customers.find(c => c.id === selectedCustomerId);

    const saleItems: SaleItem[] = cart.map(item => {
      const itemSubtotal = item.product.sellingPrice * item.quantity;
      const itemCost = item.product.purchasePrice * item.quantity;
      const total = itemSubtotal - item.discount;

      return {
        productId: item.product.id!,
        productName: item.product.name,
        quantity: item.quantity,
        unit: item.product.unit,
        unitPrice: item.product.sellingPrice,
        discount: item.discount,
        total: total,
        profit: total - itemCost
      };
    });

    const sale: Sale = {
      timestamp: new Date().toISOString(),
      customerName: customer ? customer.name : 'Walk-in Customer',
      customerPhone: customer ? customer.phone : undefined,
      totalAmount: totals.total,
      discountAmount: totals.discount,
      netProfit: totals.profit,
      items: saleItems
    };

    try {
      const newSaleId = await db.addSale(sale);
      setActiveSaleId(newSaleId);
      setCheckoutSuccess(true);
      triggerToast('Sale recorded and inventory updated!');
      setCart([]); // Clear cart
      setSelectedCustomerId(0); // Clear customer
    } catch (err) {
      console.error(err);
      triggerToast('Checkout failed.');
    }
  };

  // Barcode search simulation
  const handleSimulateScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    // Simulate looking up product by name or index/id
    const matched = products.find(p => 
      p.id === Number(scanInput) || 
      p.name.toLowerCase().includes(scanInput.toLowerCase())
    );

    if (matched) {
      handleAddToCart(matched);
      setScanInput('');
      setIsScannerOpen(false);
    } else {
      triggerToast(`Barcode lookup for "${scanInput}" failed.`);
    }
  };

  const totals = calculateTotals();

  // Filter products for POS grid select
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (checkoutSuccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', textAlign: 'center', padding: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '8px' }}>
          <CheckCircle2 size={48} />
        </div>
        <h2 style={{ fontSize: '22px', color: 'var(--primary)', fontWeight: '800' }}>Checkout Complete!</h2>
        <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', maxWidth: '300px' }}>
          Order #{activeSaleId} has been successfully recorded. Inventory levels were automatically adjusted in real time.
        </p>

        <div className="card" style={{ width: '100%', backgroundColor: 'var(--surface-variant)', border: 'none', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span>Order ID:</span>
            <span style={{ fontWeight: '700' }}>#{activeSaleId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span>Net Profit:</span>
            <span style={{ fontWeight: '700', color: 'var(--success)' }}>+{totals.profit.toLocaleString()} DA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', borderTop: '1px solid var(--outline)', paddingTop: '8px', marginTop: '4px' }}>
            <span>Total Recieved:</span>
            <span>{totals.total.toLocaleString()} DA</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => {
            setCheckoutSuccess(false);
            loadData();
          }}>
            New Sale
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
            onNavigate('history');
          }}>
            View History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-container">
      
      {/* Search and Scanner Buttons */}
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input 
            type="text" 
            placeholder="Search catalog to add..." 
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button 
          className="btn btn-outline btn-icon" 
          onClick={() => setIsScannerOpen(true)}
          title="Simulate Barcode Scanner"
        >
          <Percent size={18} />
        </button>
      </div>

      {/* Quick Catalog Bar (if search is not empty, show grid results, otherwise catalog selection) */}
      {searchQuery && (
        <div className="card" style={{ padding: '10px', maxHeight: '150px', overflowY: 'auto', marginBottom: 0 }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>SEARCH RESULTS ({filteredProducts.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => {
                  handleAddToCart(p);
                  setSearchQuery('');
                }}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px', backgroundColor: 'var(--surface-variant)', borderRadius: '4px', cursor: 'pointer' }}
              >
                <span>{p.name}</span>
                <span style={{ fontWeight: '700' }}>{p.sellingPrice} DA</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart List */}
      <div className="pos-cart-list">
        {cart.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--on-surface-variant)', padding: '24px', opacity: 0.8 }}>
            <ShoppingCart size={36} style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', fontWeight: '600' }}>POS Cart is Empty</p>
            <p style={{ fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>Add products from search above or tap the scanner shortcut to simulation.</p>
          </div>
        ) : (
          cart.map((item) => {
            const itemSubtotal = item.product.sellingPrice * item.quantity;
            const maxAllowedDisc = item.product.maxDiscount * item.quantity;
            
            return (
              <div key={item.product.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.product.name}</div>
                  <div className="cart-item-prices">
                    {item.product.sellingPrice} DA / {item.product.unit}
                  </div>
                  
                  {/* Discount input fields */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Discount:</span>
                    <input 
                      type="number"
                      value={item.discount || ''}
                      onChange={(e) => handleApplyDiscount(item.product.id!, Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      style={{ 
                        width: '60px', 
                        fontSize: '11px', 
                        padding: '2px 4px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--outline)' 
                      }}
                    />
                    <span style={{ fontSize: '9px', color: 'var(--on-surface-variant)' }}>
                      Max: {maxAllowedDisc} DA
                    </span>
                  </div>
                </div>

                {/* Qty Controller */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div className="quantity-controller">
                    <button className="qty-btn" onClick={() => handleUpdateQty(item.product.id!, -1)}>-</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => handleUpdateQty(item.product.id!, 1)}>+</button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>
                      {(itemSubtotal - item.discount).toLocaleString()} DA
                    </span>
                    <button 
                      onClick={() => handleRemoveItem(item.product.id!)}
                      style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Checkout Section */}
      <div className="pos-checkout-bar">
        {/* Customer Select */}
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} style={{ color: 'var(--on-surface-variant)' }} />
            <select
              className="select-field"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              <option value={0}>Anonymous Walk-in Client</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="summary-row">
          <span>Subtotal</span>
          <span>{totals.subtotal.toLocaleString()} DA</span>
        </div>
        <div className="summary-row">
          <span>Total Discount</span>
          <span style={{ color: 'var(--error)' }}>-{totals.discount.toLocaleString()} DA</span>
        </div>
        <div className="summary-row" style={{ color: 'var(--success)' }}>
          <span>Profit Generated</span>
          <span>+{totals.profit.toLocaleString()} DA</span>
        </div>
        <div className="summary-row total">
          <span>Final Amount</span>
          <span>{totals.total.toLocaleString()} DA</span>
        </div>

        <button 
          onClick={handleCheckout}
          className="btn btn-primary"
          style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
          disabled={cart.length === 0}
        >
          Confirm Checkout
        </button>
      </div>

      {/* Scanner Simulation Modal */}
      {isScannerOpen && (
        <div className="modal-overlay" onClick={() => setIsScannerOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3>Barcode Simulator</h3>
              <button onClick={() => setIsScannerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>
              Since we are simulating in the browser, type the product ID or name to simulate scanning:
            </p>

            <form onSubmit={handleSimulateScan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="text" 
                className="input-field" 
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Product ID (e.g. 1) or Name (e.g. Sidr)"
                autoFocus
              />
              
              <div style={{ display: 'flex', gap: '8px', overflowY: 'auto', maxHeight: '150px', flexDirection: 'column', padding: '4px 0' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>PRODUCT CODES FOR SIMULATOR:</p>
                {products.map(p => (
                  <button 
                    key={p.id}
                    type="button" 
                    onClick={() => {
                      setScanInput(String(p.id));
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid var(--outline-variant)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--surface-variant)'
                    }}
                  >
                    Barcode ID [{p.id}] - {p.name} ({p.currentStock} remaining)
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsScannerOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  <Play size={16} /> Scan Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
