import React, { useEffect, useState } from 'react';
import { db } from '../db/schema';
import type { Sale } from '../db/schema';
import { TrendingUp, BarChart2 } from 'lucide-react';

export const FinancialReports: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7days' | '30days'>('7days');
  const [financials, setFinancials] = useState({
    revenue: 0,
    profit: 0,
    avgSale: 0,
    transactionCount: 0
  });

  const [chartData, setChartData] = useState<{ label: string; revenue: number; profit: number }[]>([]);
  const [bestSellers, setBestSellers] = useState<{ name: string; quantity: number; amount: number }[]>([]);

  useEffect(() => {
    loadData();
  }, [timeframe]);

  const loadData = async () => {
    try {
      const allSales = await db.getSales();
      calculateFinancials(allSales);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateFinancials = (salesList: Sale[]) => {
    const now = new Date();
    
    // Determine cutoff date based on timeframe
    const cutoffDate = new Date();
    const daysToCount = timeframe === '7days' ? 7 : 30;
    cutoffDate.setDate(now.getDate() - daysToCount);

    const filtered = salesList.filter(s => new Date(s.timestamp) >= cutoffDate);

    let totalRevenue = 0;
    let totalProfit = 0;

    filtered.forEach(s => {
      totalRevenue += s.totalAmount;
      totalProfit += s.netProfit;
    });

    setFinancials({
      revenue: totalRevenue,
      profit: totalProfit,
      avgSale: filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0,
      transactionCount: filtered.length
    });

    // --- 1. Evolution Trend Chart Data ---
    // Generate dates array for timeframe
    const trends: Record<string, { revenue: number; profit: number }> = {};
    for (let i = daysToCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      trends[label] = { revenue: 0, profit: 0 };
    }

    // Populate actual sales data
    filtered.forEach(s => {
      const label = new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (trends[label]) {
        trends[label].revenue += s.totalAmount;
        trends[label].profit += s.netProfit;
      }
    });

    const parsedTrends = Object.keys(trends).map(key => ({
      label: key,
      revenue: trends[key].revenue,
      profit: trends[key].profit
    }));
    setChartData(parsedTrends);

    // --- 2. Best Sellers Chart Data ---
    const salesMap: Record<string, { quantity: number; amount: number }> = {};
    filtered.forEach(s => {
      s.items.forEach(item => {
        const current = salesMap[item.productName] || { quantity: 0, amount: 0 };
        salesMap[item.productName] = {
          quantity: current.quantity + item.quantity,
          amount: current.amount + item.total
        };
      });
    });

    const parsedBestSellers = Object.keys(salesMap).map(key => ({
      name: key,
      quantity: salesMap[key].quantity,
      amount: salesMap[key].amount
    })).sort((a, b) => b.amount - a.amount).slice(0, 5); // top 5

    setBestSellers(parsedBestSellers);
  };

  // Helper values for drawing the SVG Line Chart
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1000);
  const chartHeight = 120;
  const chartWidth = 340;
  const padding = 20;

  // Function to map data point to SVG coordinates
  const getCoordinates = (index: number, val: number) => {
    if (chartData.length === 0) return { x: 0, y: 0 };
    const x = padding + (index / (chartData.length - 1)) * (chartWidth - padding * 2);
    // Invert Y axis for SVGs
    const y = chartHeight - padding - (val / maxRevenue) * (chartHeight - padding * 2);
    return { x, y };
  };

  // Build SVG Path
  const buildSvgPath = (dataKey: 'revenue' | 'profit') => {
    if (chartData.length === 0) return '';
    return chartData.map((d, index) => {
      const { x, y } = getCoordinates(index, d[dataKey]);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Build SVG Area path
  const buildSvgAreaPath = (dataKey: 'revenue' | 'profit') => {
    if (chartData.length === 0) return '';
    const points = chartData.map((d, index) => {
      const { x, y } = getCoordinates(index, d[dataKey]);
      return `${x} ${y}`;
    });

    const firstX = padding;
    const lastX = chartWidth - padding;
    const baseY = chartHeight - padding;

    return `M ${firstX} ${baseY} L ${points.join(' L ')} L ${lastX} ${baseY} Z`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Timeframe selector */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setTimeframe('7days')}
          className={`filter-tab ${timeframe === '7days' ? 'active' : ''}`}
          style={{ flex: 1, padding: '10px' }}
        >
          Last 7 Days
        </button>
        <button 
          onClick={() => setTimeframe('30days')}
          className={`filter-tab ${timeframe === '30days' ? 'active' : ''}`}
          style={{ flex: 1, padding: '10px' }}
        >
          Last 30 Days
        </button>
      </div>

      {/* Financial Stats Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <span className="stat-label">Total Revenue</span>
          <span className="stat-value" style={{ color: 'var(--primary)', fontSize: '18px' }}>
            {financials.revenue.toLocaleString()} DA
          </span>
          <span className="stat-subvalue" style={{ color: 'var(--on-surface-variant)' }}>
            {financials.transactionCount} Sales
          </span>
        </div>
        
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <span className="stat-label">Net Profit</span>
          <span className="stat-value" style={{ color: 'var(--success)', fontSize: '18px' }}>
            {financials.profit.toLocaleString()} DA
          </span>
          <span className="stat-subvalue">
            Margin: {financials.revenue > 0 ? Math.round((financials.profit / financials.revenue) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Evolution Area Chart */}
      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            Revenue & Profit Trend
          </span>
        </div>

        {chartData.length > 0 ? (
          <div className="chart-container">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="var(--success)" stopOpacity="0.0"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--outline-variant)" strokeWidth="1" />
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--outline-variant)" strokeDasharray="3,3" strokeWidth="1" />

              {/* Revenue Area & Line */}
              <path d={buildSvgAreaPath('revenue')} fill="url(#revGrad)" />
              <path d={buildSvgPath('revenue')} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />

              {/* Profit Area & Line */}
              <path d={buildSvgAreaPath('profit')} fill="url(#profitGrad)" />
              <path d={buildSvgPath('profit')} fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" />

              {/* Data points highlight (newest point) */}
              {chartData.map((d, idx) => {
                // Draw circles for the first and last point to keep chart simple, or draw all points if timeframe is 7days
                if (timeframe === '7days' || idx === 0 || idx === chartData.length - 1) {
                  const revCoord = getCoordinates(idx, d.revenue);
                  const profCoord = getCoordinates(idx, d.profit);
                  return (
                    <g key={idx}>
                      <circle cx={revCoord.x} cy={revCoord.y} r="3.5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
                      <circle cx={profCoord.x} cy={profCoord.y} r="3.5" fill="var(--surface)" stroke="var(--success)" strokeWidth="2" />
                    </g>
                  );
                }
                return null;
              })}

              {/* Labels */}
              <text x={padding} y={chartHeight - 4} fontSize="8" fill="var(--on-surface-variant)">
                {chartData[0]?.label}
              </text>
              <text x={chartWidth - padding} y={chartHeight - 4} textAnchor="end" fontSize="8" fill="var(--on-surface-variant)">
                {chartData[chartData.length - 1]?.label}
              </text>
              <text x={chartWidth - padding} y={padding - 4} textAnchor="end" fontSize="8" fill="var(--on-surface-variant)">
                Max: {maxRevenue.toLocaleString()} DA
              </text>
            </svg>

            {/* Legend indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px', fontSize: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '4px', backgroundColor: 'var(--primary)', borderRadius: '2px' }}></span>
                Revenue
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '4px', backgroundColor: 'var(--success)', borderRadius: '2px' }}></span>
                Net Profit
              </span>
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--on-surface-variant)' }}>Not enough data.</p>
        )}
      </div>

      {/* Best Sellers Bar Chart */}
      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} style={{ color: 'var(--secondary)' }} />
            Best-Selling Products
          </span>
        </div>

        {bestSellers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {bestSellers.map((item, idx) => {
              const maxAmount = bestSellers[0].amount;
              const barWidth = maxAmount > 0 ? Math.round((item.amount / maxAmount) * 100) : 0;
              
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontWeight: '600' }}>{item.name}</span>
                    <span style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                      {item.quantity} units ({item.amount.toLocaleString()} DA)
                    </span>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: 'var(--surface-variant)', 
                    borderRadius: '4px', 
                    overflow: 'hidden' 
                  }}>
                    <div style={{ 
                      width: `${barWidth}%`, 
                      height: '100%', 
                      backgroundColor: 'var(--primary-light)', 
                      borderRadius: '4px',
                      transition: 'width 0.5s ease-out'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--on-surface-variant)', padding: '20px' }}>
            No sales recorded during this period.
          </p>
        )}
      </div>

    </div>
  );
};
