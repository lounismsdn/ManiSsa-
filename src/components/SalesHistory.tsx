import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Sale } from '../db/schema';
import { Search, ChevronRight, X, Download } from 'lucide-react';

interface SalesHistoryProps {
  triggerToast: (msg: string) => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ triggerToast }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Sale for detail receipt modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const allSales = await db.getSales();
      setSales(allSales);
    } catch (err) {
      console.error(err);
      triggerToast('Error loading sales logs.');
    } finally {
      setLoading(false);
    }
  };

  // Filter calculations
  const filteredSales = sales.filter(sale => {
    // 1. Search Query matches customer name or product name
    const query = searchQuery.toLowerCase();
    const customerMatches = sale.customerName?.toLowerCase().includes(query);
    const productMatches = sale.items.some(item => item.productName.toLowerCase().includes(query));
    const matchesSearch = !searchQuery || customerMatches || productMatches;

    // 2. Date ranges check
    const saleDate = new Date(sale.timestamp);
    saleDate.setHours(0, 0, 0, 0);

    let matchesStart = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesStart = saleDate >= start;
    }

    let matchesEnd = true;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      matchesEnd = saleDate <= end;
    }

    return matchesSearch && matchesStart && matchesEnd;
  });

  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      triggerToast('No sales data to export.');
      return;
    }

    // Header columns
    let csvContent = 'Sale ID,Date,Time,Customer,Products Sold,Total Amount (DA),Discount (DA),Net Profit (DA)\n';

    filteredSales.forEach(sale => {
      const date = new Date(sale.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const productsSummary = sale.items.map(item => `${item.quantity}x ${item.productName}`).join(' | ');
      
      const row = [
        sale.id,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${sale.customerName || 'Walk-in Customer'}"`,
        `"${productsSummary}"`,
        sale.totalAmount,
        sale.discountAmount,
        sale.netProfit
      ].join(',');

      csvContent += row + '\n';
    });

    // Create file trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ManiSsa_Sales_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Sales report CSV exported!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Search Bar */}
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input 
            type="text" 
            placeholder="Search by client or product..." 
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button 
          className="btn btn-outline btn-icon" 
          onClick={exportToCSV}
          title="Export CSV Report"
        >
          <Download size={18} />
        </button>
      </div>

      {/* Date Filters Inputs */}
      <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>FILTER BY TRANSACTION DATE</p>
        <div className="input-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '10px' }}>Start Date</label>
            <input 
              type="date" 
              className="input-field" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px', fontSize: '12px' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '10px' }}>End Date</label>
            <input 
              type="date" 
              className="input-field" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px', fontSize: '12px' }}
            />
          </div>
        </div>
      </div>

      {/* Sales List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <p>Loading sales history...</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--on-surface-variant)' }}>
          <p>No transaction records found.</p>
        </div>
      ) : (
        <div className="app-content" style={{ padding: 0, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredSales.map((sale) => {
              const saleDate = new Date(sale.timestamp);
              const dateString = saleDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
              const timeString = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div 
                  key={sale.id} 
                  className="card" 
                  onClick={() => setSelectedSale(sale)}
                  style={{ 
                    padding: '12px 16px', 
                    marginBottom: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, marginRight: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px' }}>
                        {sale.customerName || 'Walk-in Customer'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {timeString}
                      </span>
                    </div>

                    <p style={{ 
                      fontSize: '11px', 
                      color: 'var(--on-surface-variant)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      maxWidth: '220px'
                    }}>
                      {sale.items.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
                    </p>

                    <div style={{ display: 'flex', gap: '10px', fontSize: '9px', color: 'var(--on-surface-variant)' }}>
                      <span>ID: #{sale.id}</span>
                      <span>•</span>
                      <span>{dateString}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--primary)' }}>
                        {sale.totalAmount.toLocaleString()} DA
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '600' }}>
                        +{sale.netProfit.toLocaleString()} DA
                      </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--on-surface-variant)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sale Detail Receipt Bottom Sheet */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <div>
                <h3 style={{ fontSize: '18px' }}>Sale Receipt #{selectedSale.id}</h3>
                <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                  {new Date(selectedSale.timestamp).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Client Info */}
            <div className="card" style={{ backgroundColor: 'var(--surface-variant)', border: 'none', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>CUSTOMER DETAILS</div>
              <div style={{ fontSize: '13px' }}>
                <p><b>Name:</b> {selectedSale.customerName || 'Anonymous Walk-in Client'}</p>
                {selectedSale.customerPhone && <p><b>Phone:</b> {selectedSale.customerPhone}</p>}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>ITEMS BOUGHT</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedSale.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '12px', 
                      padding: '8px 0', 
                      borderBottom: '1px solid var(--outline-variant)' 
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '700' }}>{item.quantity} {item.unit}</span>
                      <span style={{ margin: '0 6px' }}>x</span>
                      <span>{item.productName}</span>
                      {item.discount > 0 && (
                        <p style={{ fontSize: '10px', color: 'var(--error)' }}>
                          Discount: -{item.discount} DA
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: '600' }}>{item.total.toLocaleString()} DA</span>
                      <span style={{ fontSize: '9px', color: 'var(--success)' }}>Profit: +{item.profit} DA</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="card" style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                <span>Subtotal:</span>
                <span>{(selectedSale.totalAmount + selectedSale.discountAmount).toLocaleString()} DA</span>
              </div>
              <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', fontSize: '12px', color: 'var(--error)' }}>
                <span>Discount Applied:</span>
                <span>-{selectedSale.discountAmount.toLocaleString()} DA</span>
              </div>
              <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', fontSize: '12px', color: 'var(--success)', fontWeight: '600' }}>
                <span>Net Profit Earned:</span>
                <span>+{selectedSale.netProfit.toLocaleString()} DA</span>
              </div>
              <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', borderTop: '1px solid var(--outline-variant)', paddingTop: '8px', marginTop: '4px' }}>
                <span>Total Received:</span>
                <span>{selectedSale.totalAmount.toLocaleString()} DA</span>
              </div>
            </div>

            <button className="btn btn-outline" onClick={() => setSelectedSale(null)} style={{ marginTop: '12px' }}>
              Close Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
