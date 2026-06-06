import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Product, Sale } from '../db/schema';
import { 
  TrendingUp, 
  AlertTriangle, 
  Boxes, 
  Calendar, 
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    inventoryValue: 0,
    todaySales: 0,
    monthSales: 0,
    estimatedProfit: 0,
    lowStockCount: 0
  });

  const [alerts, setAlerts] = useState<{ type: 'stock' | 'expiry'; text: string; prodId: number }[]>([]);
  const [forecasts, setForecasts] = useState<{ name: string; daysRemaining: number; unit: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allProducts = await db.getProducts();
      const allSales = await db.getSales();
      calculateStats(allProducts, allSales);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const calculateStats = (prods: Product[], salesList: Sale[]) => {
    const totalProds = prods.reduce((sum, p) => sum + p.currentStock, 0);
    const invValue = prods.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
    
    // Today's Date bounds (local time)
    const now = new Date();
    const todayStr = now.toDateString();
    
    // Monthly bounds
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let todaySalesTotal = 0;
    let monthSalesTotal = 0;
    let profitTotal = 0;

    salesList.forEach(sale => {
      const saleDate = new Date(sale.timestamp);
      
      // Today check
      if (saleDate.toDateString() === todayStr) {
        todaySalesTotal += sale.totalAmount;
      }

      // Current month check
      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        monthSalesTotal += sale.totalAmount;
      }

      // Profit sum (we can check profit for the current month or total, let's show total profit or monthly profit. Let's do monthly profit for standard dashboard)
      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        profitTotal += sale.netProfit;
      }
    });

    const lowStock = prods.filter(p => p.currentStock <= 5);

    setStats({
      totalProducts: totalProds,
      inventoryValue: invValue,
      todaySales: todaySalesTotal,
      monthSales: monthSalesTotal,
      estimatedProfit: profitTotal,
      lowStockCount: lowStock.length
    });

    // Generate smart alerts
    const tempAlerts: typeof alerts = [];
    lowStock.forEach(p => {
      tempAlerts.push({
        type: 'stock',
        text: `Low stock: "${p.name}" has only ${p.currentStock} ${p.unit} remaining.`,
        prodId: p.id!
      });
    });

    // Expiry alerts (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    prods.forEach(p => {
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        const today = new Date();
        
        if (exp < today) {
          tempAlerts.push({
            type: 'expiry',
            text: `Expired: "${p.name}" expired on ${p.expiryDate}!`,
            prodId: p.id!
          });
        } else if (exp <= thirtyDaysFromNow) {
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          tempAlerts.push({
            type: 'expiry',
            text: `Near Expiry: "${p.name}" expires in ${diffDays} days (${p.expiryDate}).`,
            prodId: p.id!
          });
        }
      }
    });

    setAlerts(tempAlerts);

    // Calculate Stock Forecast
    // Calculate daily run-rate from sales in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const salesVolumeMap: Record<number, number> = {};
    salesList.forEach(sale => {
      const saleDate = new Date(sale.timestamp);
      if (saleDate >= sevenDaysAgo) {
        sale.items.forEach(item => {
          salesVolumeMap[item.productId] = (salesVolumeMap[item.productId] || 0) + item.quantity;
        });
      }
    });

    const tempForecasts: typeof forecasts = [];
    prods.forEach(p => {
      const weeklyVolume = salesVolumeMap[p.id!] || 0;
      const dailyVolume = weeklyVolume / 7;

      if (dailyVolume > 0 && p.currentStock > 0) {
        const daysRem = Math.round(p.currentStock / dailyVolume);
        if (daysRem <= 20) { // Only forecast things running out relatively soon
          tempForecasts.push({
            name: p.name,
            daysRemaining: daysRem,
            unit: p.unit
          });
        }
      }
    });
    setForecasts(tempForecasts.sort((a, b) => a.daysRemaining - b.daysRemaining));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Welcome Banner */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', 
        color: '#fff', 
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '700' }}>Marhaba to ManiSsa</h2>
        <p style={{ opacity: 0.9, fontSize: '13px' }}>Natural stock & cashier manager. Everything is up-to-date and stored offline.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">In Stock</span>
          <span className="stat-value">{stats.totalProducts.toLocaleString()}</span>
          <span className="stat-subvalue" style={{ color: 'var(--on-surface-variant)' }}>Total Units</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Stock Value</span>
          <span className="stat-value">{stats.inventoryValue.toLocaleString()} DA</span>
          <span className="stat-subvalue">At purchase cost</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <span className="stat-label">Today's Sales</span>
          <span className="stat-value" style={{ color: 'var(--primary)' }}>{stats.todaySales.toLocaleString()} DA</span>
          <span className="stat-subvalue">Gross total</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary-light)' }}>
          <span className="stat-label">This Month</span>
          <span className="stat-value">{stats.monthSales.toLocaleString()} DA</span>
          <span className="stat-subvalue">Monthly sales</span>
        </div>
      </div>

      {/* Estimated Profit Panel */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--primary-container)', borderColor: 'rgba(30,70,32,0.1)' }}>
        <div>
          <h4 style={{ color: 'var(--on-primary-container)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Net Profit</h4>
          <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>{stats.estimatedProfit.toLocaleString()} DA</span>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <TrendingUp size={24} />
        </div>
      </div>

      {/* Low Stock and Expiry Alerts */}
      {alerts.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--error)' }}>
          <div className="card-title" style={{ color: 'var(--error)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} />
              Critical Alerts ({alerts.length})
            </span>
          </div>
          <div className="alerts-list">
            {alerts.slice(0, 3).map((alert, idx) => (
              <div key={idx} className={`alert-item ${alert.type === 'expiry' && alert.text.startsWith('Expired') ? 'danger' : 'warning'}`}>
                <div className="alert-icon">
                  <AlertTriangle size={14} />
                </div>
                <div className="alert-text">{alert.text}</div>
                <button 
                  onClick={() => onNavigate(alert.type === 'stock' ? 'stock' : 'products')}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Forecast Predictions */}
      {forecasts.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Boxes size={18} style={{ color: 'var(--secondary)' }} />
              Smart Stock Forecast
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Estimated remaining days based on sales speed this week:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {forecasts.slice(0, 3).map((fc, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid var(--outline-variant)' }}>
                <span style={{ fontWeight: '600' }}>{fc.name}</span>
                <span className="badge" style={{ 
                  backgroundColor: fc.daysRemaining <= 3 ? 'var(--error-container)' : fc.daysRemaining <= 7 ? 'var(--secondary-container)' : 'var(--primary-container)',
                  color: fc.daysRemaining <= 3 ? 'var(--error)' : fc.daysRemaining <= 7 ? 'var(--secondary)' : 'var(--primary)'
                }}>
                  {fc.daysRemaining <= 0 ? 'Out of stock soon' : `${fc.daysRemaining} days left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiry Tracking Calendar Summary */}
      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            App Quick Actions
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => onNavigate('pos')} style={{ padding: '10px', fontSize: '12px' }}>
            Open POS Cashier
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate('products')} style={{ padding: '10px', fontSize: '12px' }}>
            Manage Products
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate('stock')} style={{ padding: '10px', fontSize: '12px' }}>
            Adjust Stock
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate('reports')} style={{ padding: '10px', fontSize: '12px' }}>
            View Reports
          </button>
        </div>
      </div>

    </div>
  );
};
