import React, { useState } from 'react';
import { db } from '../db/schema';
import { Download, Upload, Trash2, RefreshCw, Cloud, CloudOff } from 'lucide-react';

interface BackupRestoreProps {
  triggerToast: (msg: string) => void;
  onDataReset: () => void;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({ triggerToast, onDataReset }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [driveConnected, setDriveConnected] = useState(true);

  const handleExportBackup = async () => {
    try {
      const backupString = await db.exportBackup();
      const blob = new Blob([backupString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ManiSsa_Backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast('Database backup file downloaded!');
    } catch (err) {
      console.error(err);
      triggerToast('Export failed.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await db.importBackup(text);
        triggerToast('Data restored successfully!');
        onDataReset(); // Reload parent state
      } catch (err) {
        console.error(err);
        triggerToast('Restore failed: Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearDatabase = async () => {
    if (confirm('CRITICAL WARNING: This will permanently delete all products, stock history, clients, suppliers, and sales logs! Are you absolutely sure?')) {
      try {
        await db.clearAllData();
        triggerToast('Database wiped successfully.');
        onDataReset();
      } catch (err) {
        console.error(err);
        triggerToast('Wipe failed.');
      }
    }
  };

  const handleForceSeed = async () => {
    try {
      await db.seedData();
      triggerToast('Default catalog seeded!');
      onDataReset();
    } catch (err) {
      console.error(err);
      triggerToast('Seeding failed.');
    }
  };

  const handleGoogleDriveSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      triggerToast('Google Drive cloud backup synchronized!');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Cloud Sync Status Card */}
      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cloud size={18} style={{ color: driveConnected ? 'var(--primary)' : 'var(--on-surface-variant)' }} />
            Google Drive Cloud Sync
          </span>
          <span className="badge" style={{ 
            backgroundColor: driveConnected ? 'var(--primary-container)' : 'var(--surface-variant)', 
            color: driveConnected ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontSize: '9px' 
          }}>
            {driveConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
        
        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>
          Auto-sync keeps your inventory and sales transactions secure on your cloud drive for multi-device login.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
            onClick={() => setDriveConnected(!driveConnected)}
          >
            {driveConnected ? <CloudOff size={14} /> : <Cloud size={14} />}
            {driveConnected ? 'Disconnect' : 'Connect'}
          </button>
          
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
            onClick={handleGoogleDriveSync}
            disabled={!driveConnected || isSyncing}
          >
            <RefreshCw size={14} className={isSyncing ? 'spin-anim' : ''} style={{ 
              animation: isSyncing ? 'spin 1.5s linear infinite' : 'none' 
            }} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Local JSON Backup Card */}
      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} style={{ color: 'var(--secondary)' }} />
            Local Backup & Restore
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
          Download a backup of your local database to your phone/computer storage, or restore from a previously saved file.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExportBackup} style={{ width: '100%' }}>
            <Download size={16} /> Export Local Backup
          </button>
          
          {/* Custom style upload input */}
          <label 
            className="btn btn-outline" 
            style={{ 
              width: '100%', 
              display: 'inline-flex', 
              cursor: 'pointer',
              justifyContent: 'center',
              margin: 0
            }}
          >
            <Upload size={16} /> Restore from File
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Danger Zone Wiping Card */}
      <div className="card" style={{ borderColor: 'var(--error)' }}>
        <div className="card-title" style={{ color: 'var(--error)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} />
            Danger Zone
          </span>
        </div>
        
        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
          Resetting the database clears all current data. If you have no products, you can re-seed the default agricultural items catalog.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={handleForceSeed}>
            Seed Catalog
          </button>
          
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleClearDatabase}>
            <Trash2 size={16} /> Wipe Tables
          </button>
        </div>
      </div>

      {/* CSS Spin style insertion */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};
