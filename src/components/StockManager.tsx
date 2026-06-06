import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Product, StockLog } from '../db/schema';
import { Plus, Minus, Check } from 'lucide-react';

interface StockManagerProps {
  triggerToast: (msg: string) => void;
}

export const StockManager: React.FC<StockManagerProps> = ({ triggerToast }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [qtyChange, setQtyChange] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'adjustment'>('add');
  const [note, setNote] = useState('');

  // Active sub-tab: 'adjust' or 'history'
  const [activeTab, setActiveTab] = useState<'adjust' | 'history'>('adjust');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allProducts = await db.getProducts();
      const allLogs = await db.getStockLogs();
      setProducts(allProducts);
      setLogs(allLogs);
      
      if (allProducts.length > 0 && selectedProductId === 0) {
        setSelectedProductId(allProducts[0].id!);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error loading stock details');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductId === 0) {
      triggerToast('Please select a product');
      return;
    }
    if (qtyChange <= 0) {
      triggerToast('Quantity change must be greater than zero');
      return;
    }

    const prod = products.find(p => p.id === Number(selectedProductId));
    if (!prod) return;

    // Determine value change sign
    // 'add' = positive, 'remove' = negative, 'adjustment' = positive/negative (we can handle positive or negative in forms, let's treat remove as negative, add as positive, adjustment can allow both, let's make it a clean selector)
    let netChange = qtyChange;
    if (adjustmentType === 'remove') {
      netChange = -qtyChange;
      if (prod.currentStock < qtyChange) {
        triggerToast(`Cannot remove ${qtyChange} units. Only ${prod.currentStock} in stock.`);
        return;
      }
    } else if (adjustmentType === 'adjustment') {
      // Allow adjusting down, so let note describe it or assume negative if they type negative, else positive
      // We will let the interface explicitly have a sign selector or let it be positive for correction
    }

    try {
      const finalNote = note.trim() || `${adjustmentType.toUpperCase()} - Manual adjustment`;
      await db.adjustStock(Number(selectedProductId), netChange, adjustmentType, finalNote);
      
      triggerToast('Inventory updated successfully!');
      
      // Reset form
      setQtyChange(0);
      setNote('');
      
      // Reload lists
      loadData();
      setActiveTab('history'); // Switch to history tab to see the change
    } catch (err) {
      console.error(err);
      triggerToast('Error updating stock level');
    }
  };

  const getLogColorClass = (type: string) => {
    switch (type) {
      case 'add': return 'var(--success)';
      case 'remove': return 'var(--error)';
      case 'sale': return 'var(--primary)';
      case 'adjustment': return 'var(--secondary)';
      default: return 'var(--on-surface-variant)';
    }
  };

  const getLogSign = (qty: number) => {
    if (qty > 0) return `+${qty}`;
    return `${qty}`; // Already negative
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('adjust')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'adjust' ? '3px solid var(--primary)' : 'none',
            color: activeTab === 'adjust' ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: activeTab === 'adjust' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Quick Adjust
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : 'none',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: activeTab === 'history' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Movement Logs
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <p>Loading inventory info...</p>
        </div>
      ) : activeTab === 'adjust' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={handleAdjustStock} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Adjust Stock Levels</h3>
            
            <div className="form-group">
              <label>Select Product</label>
              <select
                className="select-field"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current: {p.currentStock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Adjustment Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('add')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--outline)',
                    backgroundColor: adjustmentType === 'add' ? 'var(--primary-container)' : 'var(--surface)',
                    color: adjustmentType === 'add' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={16} /> Add Stock
                </button>
                
                <button
                  type="button"
                  onClick={() => setAdjustmentType('remove')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--outline)',
                    backgroundColor: adjustmentType === 'remove' ? 'var(--error-container)' : 'var(--surface)',
                    color: adjustmentType === 'remove' ? 'hsl(0, 80%, 20%)' : 'var(--on-surface)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Minus size={16} /> Remove Stock
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Quantity to Change</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="input-field"
                  value={qtyChange || ''}
                  onChange={(e) => setQtyChange(Math.max(0, Number(e.target.value)))}
                  placeholder="Enter positive value"
                  min="1"
                  required
                />
                <span style={{ fontWeight: '600', color: 'var(--on-surface-variant)' }}>
                  {products.find(p => p.id === Number(selectedProductId))?.unit || ''}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Adjustment Note / Reason</label>
              <input
                type="text"
                className="input-field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Restocked from supplier, Damaged bottle, etc."
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
              <Check size={18} />
              Confirm Stock Adjustments
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="card" style={{ backgroundColor: 'var(--surface-variant)', border: 'none' }}>
            <h4 style={{ fontSize: '13px', marginBottom: '6px' }}>Real-time stock deduction</h4>
            <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              Stock additions increase active quantities immediately. Reductions are logged and validated against current stock levels. Sales automatically subtract items and write to movement log.
            </p>
          </div>
        </div>
      ) : (
        /* History Logs list */
        <div className="app-content" style={{ padding: 0, overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--on-surface-variant)' }}>
              <p>No stock movement logs found yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logs.map((log) => {
                const logDate = new Date(log.timestamp);
                const timeString = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateString = logDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                
                return (
                  <div 
                    key={log.id} 
                    className="card" 
                    style={{ 
                      padding: '12px', 
                      marginBottom: 0,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{log.productName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{log.note}</span>
                      <span style={{ fontSize: '9px', color: 'var(--on-surface-variant)' }}>
                        {dateString} at {timeString}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span 
                        style={{ 
                          fontWeight: '800', 
                          fontSize: '15px', 
                          color: getLogColorClass(log.type) 
                        }}
                      >
                        {getLogSign(log.quantityChanged)}
                      </span>
                      <span className="badge" style={{ 
                        fontSize: '9px',
                        padding: '2px 6px',
                        backgroundColor: 'var(--surface-variant)',
                        color: 'var(--on-surface-variant)',
                        textTransform: 'uppercase'
                      }}>
                        {log.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
