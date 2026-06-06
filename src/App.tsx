import { useState, useEffect } from 'react';
import { db } from './db/schema';
import { Dashboard } from './components/Dashboard';
import { ProductManager } from './components/ProductManager';
import { StockManager } from './components/StockManager';
import { POS } from './components/POS';
import { SalesHistory } from './components/SalesHistory';
import { FinancialReports } from './components/FinancialReports';
import { CustomerManager } from './components/CustomerManager';
import { SupplierManager } from './components/SupplierManager';
import { BackupRestore } from './components/BackupRestore';

import { 
  LayoutDashboard, 
  ShoppingCart, 
  Boxes, 
  ArrowUpDown, 
  MoreHorizontal,
  History,
  TrendingUp,
  Users,
  Truck,
  Cloud,
  Moon,
  Sun,
  Wifi,
  Battery
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkTheme, setDarkTheme] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbKey, setDbKey] = useState(0); // Trigger reload across database updates

  // Simulate Android clock
  const [time, setTime] = useState('');
  
  useEffect(() => {
    // Seed and load initial database tables
    const initDatabase = async () => {
      try {
        await db.init();
        await db.seedData();
        setDbKey(prev => prev + 1); // trigger reload
      } catch (err) {
        console.error('Database seeding failed:', err);
      }
    };
    initDatabase();

    // Time ticker
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(null); // Clear first
    setTimeout(() => {
      setToastMessage(message);
    }, 50);
  };

  const handleDataReset = () => {
    setDbKey(prev => prev + 1);
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={`dash-${dbKey}`} onNavigate={setActiveTab} />;
      case 'pos':
        return <POS key={`pos-${dbKey}`} triggerToast={triggerToast} onNavigate={setActiveTab} />;
      case 'products':
        return <ProductManager key={`prod-${dbKey}`} triggerToast={triggerToast} />;
      case 'stock':
        return <StockManager key={`stock-${dbKey}`} triggerToast={triggerToast} />;
      case 'history':
        return <SalesHistory key={`history-${dbKey}`} triggerToast={triggerToast} />;
      case 'reports':
        return <FinancialReports key={`reports-${dbKey}`} />;
      case 'clients':
        return <CustomerManager key={`clients-${dbKey}`} triggerToast={triggerToast} />;
      case 'suppliers':
        return <SupplierManager key={`sups-${dbKey}`} triggerToast={triggerToast} />;
      case 'backup':
        return <BackupRestore key={`backup-${dbKey}`} triggerToast={triggerToast} onDataReset={handleDataReset} />;
      case 'more':
        return renderMoreMenu();
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  // More Options Menu layout
  const renderMoreMenu = () => {
    const moreOptions = [
      { id: 'history', label: 'Sales History', icon: <History size={22} />, desc: 'Receipt logs and reports export' },
      { id: 'reports', label: 'Financial Reports', icon: <TrendingUp size={22} />, desc: 'Revenue, profits, best sellers' },
      { id: 'clients', label: 'Customers Registry', icon: <Users size={22} />, desc: 'Client profiles and spend stats' },
      { id: 'suppliers', label: 'Suppliers Catalog', icon: <Truck size={22} />, desc: 'Manage partners & restocks' },
      { id: 'backup', label: 'Cloud & Local Backups', icon: <Cloud size={22} />, desc: 'Export, import, sync database' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '18px', padding: '0 4px', marginBottom: '8px' }}>Store Settings & Registry</h3>
        {moreOptions.map((opt) => (
          <div 
            key={opt.id} 
            className="card"
            onClick={() => setActiveTab(opt.id)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              padding: '16px', 
              marginBottom: 0, 
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-container)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {opt.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: '700', fontSize: '14px' }}>{opt.label}</span>
              <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{opt.desc}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Get screen title
  const getScreenTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'ManiSsa';
      case 'pos': return 'Cashier Checkout';
      case 'products': return 'Product Catalog';
      case 'stock': return 'Inventory Manager';
      case 'history': return 'Sales History';
      case 'reports': return 'Financial Analytics';
      case 'clients': return 'Customer Directory';
      case 'suppliers': return 'Suppliers Directory';
      case 'backup': return 'Backup & Database';
      case 'more': return 'Administrative Panel';
      default: return 'ManiSsa';
    }
  };

  return (
    <div className={`app-simulator ${darkTheme ? 'dark-theme' : ''}`}>
      <div className="app-container">
        
        {/* Simulated Android Status Bar */}
        <div className="android-status-bar">
          <span>{time}</span>
          <div className="icons">
            <Wifi size={13} strokeWidth={2.5} />
            <span style={{ fontSize: '11px', marginRight: '4px' }}>5G</span>
            <Battery size={15} strokeWidth={2.5} style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }} />
            <span style={{ fontSize: '10px' }}>98%</span>
          </div>
        </div>

        {/* Header App Bar */}
        <header className="app-header">
          <div className="app-title-container">
            <span className="app-logo">🍯 {getScreenTitle()}</span>
            {activeTab === 'dashboard' && <span className="app-subtitle">Stock & Cashier</span>}
          </div>

          <button 
            onClick={() => setDarkTheme(!darkTheme)} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title={darkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkTheme ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {/* Scrollable View Content */}
        <main className="app-content">
          {renderContent()}
        </main>

        {/* Android style Bottom Navigation Bar */}
        <nav className="android-nav-bar">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="nav-pill">
              <LayoutDashboard size={20} />
            </div>
            <span className="nav-label">Dashboard</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <div className="nav-pill">
              <ShoppingCart size={20} />
            </div>
            <span className="nav-label">POS</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <div className="nav-pill">
              <Boxes size={20} />
            </div>
            <span className="nav-label">Catalog</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <div className="nav-pill">
              <ArrowUpDown size={20} />
            </div>
            <span className="nav-label">Stock</span>
          </button>

          <button 
            className={`nav-item ${['history', 'reports', 'clients', 'suppliers', 'backup', 'more'].includes(activeTab) ? 'active' : ''}`}
            onClick={() => setActiveTab('more')}
          >
            <div className="nav-pill">
              <MoreHorizontal size={20} />
            </div>
            <span className="nav-label">More</span>
          </button>
        </nav>

        {/* Interactive rising Toast pop-ups */}
        {toastMessage && (
          <div className="android-toast">
            {toastMessage}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
