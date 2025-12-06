import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TabView, DepositRecord, PlatformBalances, AssetHistoryRecord, UserProfile, InvestmentType } from '../types';
import { Dashboard } from './Dashboard';
import { DepositSection } from './DepositSection';
import { AssetSection } from './AssetSection';
import { AssetHistory } from './AssetHistory';
import { LayoutDashboard, History, Wallet, Coins, LineChart, LogOut, CandlestickChart, Globe, ChevronDown, User, Trash2, AlertTriangle, X } from 'lucide-react';

interface MainAppProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

const DEFAULT_PLATFORMS: Record<string, string[]> = {
  CRYPTO: ['BingX', 'Bitget', 'Bitget Wallet'],
  TW_STOCK: ['富邦證卷', '國泰證卷', '永豐證卷'],
  US_STOCK: ['富邦證卷', '國泰證卷', '凱基證卷']
};

export const MainApp: React.FC<MainAppProps> = ({ currentUser, onLogout, onDeleteAccount }) => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Storage Keys based on User ID
  const STORAGE_KEY_DEPOSITS = `crypto_deposits_${currentUser.id}`;
  const STORAGE_KEY_BALANCES = `crypto_balances_${currentUser.id}`;
  const STORAGE_KEY_HISTORY = `crypto_asset_history_${currentUser.id}`;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Configuration based on User Type
  const { currency, currencySymbol, assetLabel, typeIcon } = useMemo(() => {
     const type = currentUser.investmentType || 'CRYPTO';
     const curr = currentUser.currency || (type === 'TW_STOCK' ? 'TWD' : type === 'US_STOCK' ? 'USD' : 'USDT');
     
     let symbol = '$';
     if (curr === 'TWD') symbol = 'NT$';
     
     let label = '幣種';
     if (type === 'TW_STOCK' || type === 'US_STOCK') label = '股票代號';

     let icon = <Coins className="w-6 h-6 text-white" />;
     if (type === 'TW_STOCK') icon = <CandlestickChart className="w-6 h-6 text-white" />;
     if (type === 'US_STOCK') icon = <Globe className="w-6 h-6 text-white" />;

     return { currency: curr, currencySymbol: symbol, assetLabel: label, typeIcon: icon };
  }, [currentUser]);

  // State for Deposits
  const [deposits, setDeposits] = useState<DepositRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DEPOSITS);
    return saved ? JSON.parse(saved) : [];
  });

  // State for Asset Balances (With Defaults Logic)
  const [balances, setBalances] = useState<PlatformBalances>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BALANCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed;
    }
    
    // Initialize defaults if empty
    const defaults = DEFAULT_PLATFORMS[currentUser.investmentType || 'CRYPTO'] || DEFAULT_PLATFORMS['CRYPTO'];
    const initialBalances: PlatformBalances = {};
    defaults.forEach(p => {
        initialBalances[p] = [];
    });
    return initialBalances;
  });

  // State for Asset History
  const [assetHistory, setAssetHistory] = useState<AssetHistoryRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DEPOSITS, JSON.stringify(deposits));
  }, [deposits, STORAGE_KEY_DEPOSITS]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(balances));
  }, [balances, STORAGE_KEY_BALANCES]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(assetHistory));
  }, [assetHistory, STORAGE_KEY_HISTORY]);

  // Handlers
  const handleAddDeposit = (deposit: DepositRecord) => {
    setDeposits((prev) => [...prev, deposit]);
  };

  const handleEditDeposit = (updatedDeposit: DepositRecord) => {
    setDeposits((prev) => prev.map(d => d.id === updatedDeposit.id ? updatedDeposit : d));
  };

  const handleDeleteDeposit = (id: string) => {
    setDeposits((prev) => prev.filter(d => d.id !== id));
  };

  const calculateTotal = (assets: any[]) => {
     if (!assets || !Array.isArray(assets)) return 0;
     return assets.reduce((sum, a) => sum + (a.value || 0), 0);
  };

  const handleUpdateBalances = (newBalances: PlatformBalances) => {
    setBalances(newBalances);
    
    // Auto-save to history on update
    const platformKeys = Object.keys(newBalances);
    
    // 1. Calculate Platform Breakdown & Total
    let totalAssets = 0;
    const platformBreakdown: Record<string, number> = {};
    const coinBreakdown: Record<string, number> = {};

    platformKeys.forEach(key => {
      const assets = newBalances[key];
      const platformTotal = calculateTotal(assets);
      platformBreakdown[key] = platformTotal;
      totalAssets += platformTotal;

      // 2. Calculate Asset Breakdown
      assets.forEach(asset => {
        const coinName = asset.coin.toUpperCase();
        coinBreakdown[coinName] = (coinBreakdown[coinName] || 0) + (Number(asset.value) || 0);
      });
    });

    const newHistoryRecord: AssetHistoryRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: new Date().toLocaleString('zh-TW', { hour12: false }),
      timestamp: Date.now(),
      totalAssets,
      platformBreakdown,
      coinBreakdown
    };

    setAssetHistory(prev => [...prev, newHistoryRecord]);
  };

  const handleAddPlatform = (name: string) => {
    if (!balances[name]) {
      setBalances(prev => ({ ...prev, [name]: [] }));
    }
  };

  const handleRemovePlatform = (name: string) => {
    setBalances(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });
  };

  const handleEditHistory = (updatedRecord: AssetHistoryRecord) => {
    setAssetHistory(prev => prev.map(h => h.id === updatedRecord.id ? updatedRecord : h));
  };

  const handleDeleteHistory = (id: string) => {
    setAssetHistory(prev => prev.filter(h => h.id !== id));
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabView.DASHBOARD:
        return (
            <Dashboard 
                key={`dashboard-${assetHistory.length}`} // Force re-render if history count changes (fixes deletion bug visual)
                deposits={deposits} 
                balances={balances} 
                assetHistory={assetHistory}
                currency={currency}
                currencySymbol={currencySymbol}
                investmentType={currentUser.investmentType || 'CRYPTO'}
            />
        );
      case TabView.DEPOSITS:
        return <DepositSection deposits={deposits} onAdd={handleAddDeposit} onEdit={handleEditDeposit} onDelete={handleDeleteDeposit} currency={currency} />;
      case TabView.ASSETS:
        return <AssetSection balances={balances} onUpdate={handleUpdateBalances} onAddPlatform={handleAddPlatform} onRemovePlatform={handleRemovePlatform} currency={currency} currencySymbol={currencySymbol} assetLabel={assetLabel} />;
      case TabView.HISTORY:
        return <AssetHistory history={assetHistory} onEdit={handleEditHistory} onDelete={handleDeleteHistory} currency={currency} currencySymbol={currencySymbol} assetLabel={assetLabel} />;
      default:
        return <Dashboard deposits={deposits} balances={balances} assetHistory={assetHistory} currency={currency} currencySymbol={currencySymbol} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Account Deletion Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800 border border-rose-500/30 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                        確認刪除帳號？
                    </h3>
                    <button onClick={() => setShowDeleteConfirm(false)} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-4 mb-6">
                    <p className="text-slate-300">
                        您即將刪除使用者 <span className="font-bold text-white">{currentUser.name}</span>。
                    </p>
                    <p className="text-rose-400 text-sm bg-rose-950/30 p-3 rounded-lg border border-rose-900/50">
                        警告：此操作將永久刪除該使用者的所有資產、入金紀錄與歷史數據，且無法復原。
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={onDeleteAccount}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-lg shadow-rose-900/50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        確認刪除
                    </button>
                </div>
            </div>
        </div>
      )}

      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center h-auto md:h-16 py-3 md:py-0 gap-3 md:gap-0">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${currentUser.investmentType === 'TW_STOCK' ? 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.4)]' : currentUser.investmentType === 'US_STOCK' ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}>
                {typeIcon}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
                Asset<span className="text-emerald-400">Tracker</span> Pro
              </h1>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {/* Scrollable Nav Container - Separated to avoid clipping dropdown */}
                <div className="overflow-x-auto w-full sm:w-auto">
                    <nav className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg min-w-max">
                        <button
                            onClick={() => setActiveTab(TabView.DASHBOARD)}
                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === TabView.DASHBOARD 
                                ? 'bg-slate-700 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            儀表板
                        </button>
                        <button
                            onClick={() => setActiveTab(TabView.DEPOSITS)}
                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === TabView.DEPOSITS
                                ? 'bg-slate-700 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <History className="w-4 h-4 mr-2" />
                            入金紀錄
                        </button>
                        <button
                            onClick={() => setActiveTab(TabView.ASSETS)}
                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === TabView.ASSETS
                                ? 'bg-slate-700 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <Wallet className="w-4 h-4 mr-2" />
                            資產
                        </button>
                        <button
                            onClick={() => setActiveTab(TabView.HISTORY)}
                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === TabView.HISTORY
                                ? 'bg-slate-700 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <LineChart className="w-4 h-4 mr-2" />
                            走勢
                        </button>
                    </nav>
                </div>

                {/* User Info Dropdown - Outside scrollable area, High Z-Index */}
                <div className="relative border-slate-700 sm:border-l sm:pl-3 sm:ml-1 flex-shrink-0" ref={userMenuRef}>
                    <button 
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                            {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start hidden sm:flex">
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white truncate max-w-[100px] leading-none">{currentUser.name}</span>
                            <span className="text-[10px] text-slate-500 leading-none mt-1">{currency}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu - Fixed Z-Index and positioning */}
                    {isUserMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]">
                            <div className="p-3 border-b border-slate-700/50 bg-slate-900/30">
                                <p className="text-xs text-slate-500 font-medium">目前使用者</p>
                                <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                            </div>
                            <div className="p-1">
                                <button 
                                    onClick={onLogout}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    登出
                                </button>
                                <div className="my-1 border-t border-slate-700/50"></div>
                                <button 
                                    onClick={() => { setIsUserMenuOpen(false); setShowDeleteConfirm(true); }}
                                    className="w-full text-left px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    刪除帳號
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} AssetTracker Pro. 目前登入：{currentUser.name} ({currency})</p>
        </div>
      </footer>
    </div>
  );
};