import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserProfile, InvestmentType, AppData, DepositRecord, PlatformBalances, AssetHistoryRecord } from './types';
import { MainApp } from './components/MainApp';
import { UserPlus, ArrowRight, Coins, TrendingUp, CandlestickChart, Globe, Sparkles } from 'lucide-react';
import { loadAppData, saveAppData } from './services/dataService';
import { createDefaultBalances } from './constants';
import { EMPTY_APP_DATA, normalizeAppData } from './shared/appDataDefaults';

const StatusBanner: React.FC<{ loadWarning: string | null; saveError: string | null; isSaving: boolean }> = ({ loadWarning, saveError, isSaving }) => {
  const message = saveError ?? (isSaving ? '資料儲存中…' : loadWarning);
  if (!message) {
    return null;
  }

  const tone = saveError ? 'error' : isSaving ? 'info' : 'warning';
  const toneStyle =
    tone === 'error'
      ? 'bg-rose-500/20 border-rose-500 text-rose-100'
      : tone === 'warning'
        ? 'bg-amber-500/20 border-amber-400 text-amber-100'
        : 'bg-slate-800/90 border-slate-600 text-slate-100';

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-sm pointer-events-none">
      <div className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-xl backdrop-blur ${toneStyle}`}>
        {message}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserType, setNewUserType] = useState<InvestmentType>('CRYPTO');
  const [showAddUser, setShowAddUser] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasPersisted = useRef(false);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const result = await loadAppData();
        if (!isActive) return;
        setAppData(result.data);
        if (result.isFallback) {
          setLoadWarning('載入資料檔案時發生問題，已使用預設資料。');
        }
      } catch (error) {
        console.error('Unexpected error while loading data', error);
        if (!isActive) return;
        setLoadWarning('無法讀取資料檔案，請確認 data 目錄是否可用。');
        setAppData(normalizeAppData(EMPTY_APP_DATA));
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!appData) return;
    if (!hasPersisted.current) {
      hasPersisted.current = true;
      return;
    }

    let cancelled = false;
    setIsSaving(true);

    saveAppData(appData)
      .then(() => {
        if (cancelled) return;
        setSaveError(null);
      })
      .catch((error) => {
        console.error('Failed to persist data', error);
        if (cancelled) return;
        setSaveError('儲存資料時發生錯誤，請檢查 data 目錄是否可寫。');
      })
      .finally(() => {
        if (!cancelled) {
          setIsSaving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appData]);

  const users = useMemo(() => appData?.users ?? [], [appData]);
  const currentUser = useMemo(() => users.find((user) => user.id === currentUserId) ?? null, [users, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    if (!users.some((user) => user.id === currentUserId)) {
      setCurrentUserId(null);
    }
  }, [users, currentUserId]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appData) return;
    if (!newUserName.trim()) return;

    const type = newUserType;
    let currency = 'USDT';
    if (type === 'TW_STOCK') currency = 'TWD';
    if (type === 'US_STOCK') currency = 'USD';

    const newUser: UserProfile = {
      id: 'u_' + Date.now().toString(36),
      name: newUserName.trim(),
      createdAt: Date.now(),
      investmentType: type,
      currency
    };

    setAppData((prev) => {
      const base = prev ?? normalizeAppData(EMPTY_APP_DATA);
      return {
        ...base,
        users: [...base.users, newUser],
        deposits: { ...base.deposits, [newUser.id]: [] },
        balances: { ...base.balances, [newUser.id]: createDefaultBalances(type) },
        history: { ...base.history, [newUser.id]: [] }
      };
    });

    setNewUserName('');
    setNewUserType('CRYPTO');
    setShowAddUser(false);
  };

  const handleDeleteAccount = (userId: string) => {
    setAppData((prev) => {
      if (!prev) return prev;
      const updatedUsers = prev.users.filter((user) => user.id !== userId);
      if (updatedUsers.length === prev.users.length) return prev;

      const next: AppData = {
        ...prev,
        users: updatedUsers,
        deposits: { ...prev.deposits },
        balances: { ...prev.balances },
        history: { ...prev.history }
      };

      delete next.deposits[userId];
      delete next.balances[userId];
      delete next.history[userId];

      return next;
    });

    if (currentUserId === userId) {
      setCurrentUserId(null);
    }
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUserId(user.id);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
  };

  const handleUserDataChange = (
    userId: string,
    changes: {
      deposits?: DepositRecord[];
      balances?: PlatformBalances;
      assetHistory?: AssetHistoryRecord[];
    }
  ) => {
    setAppData((prev) => {
      if (!prev) return prev;

      let didChange = false;
      let deposits = prev.deposits;
      let balances = prev.balances;
      let history = prev.history;

      if (changes.deposits) {
        deposits = { ...deposits, [userId]: changes.deposits };
        didChange = true;
      }

      if (changes.balances) {
        balances = { ...balances, [userId]: changes.balances };
        didChange = true;
      }

      if (changes.assetHistory) {
        history = { ...history, [userId]: changes.assetHistory };
        didChange = true;
      }

      if (!didChange) {
        return prev;
      }

      return {
        ...prev,
        deposits,
        balances,
        history
      };
    });
  };

  const getTypeLabel = (type?: InvestmentType) => {
    switch(type) {
      case 'TW_STOCK': return '台股市場';
      case 'US_STOCK': return '美股市場';
      default: return '加密貨幣';
    }
  };

  const getTypeIcon = (type?: InvestmentType) => {
    switch(type) {
      case 'TW_STOCK': return <CandlestickChart className="w-5 h-5 text-white" />;
      case 'US_STOCK': return <Globe className="w-5 h-5 text-white" />;
      default: return <Coins className="w-5 h-5 text-white" />;
    }
  };

  const getTypeColor = (type?: InvestmentType) => {
    switch(type) {
      case 'TW_STOCK': return 'from-rose-500 to-red-600 shadow-rose-500/50';
      case 'US_STOCK': return 'from-blue-500 to-indigo-600 shadow-blue-500/50';
      default: return 'from-emerald-500 to-teal-600 shadow-emerald-500/50';
    }
  };

  if (loading || !appData) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <TrendingUp className="w-10 h-10 mx-auto text-emerald-400 animate-pulse" />
          <p className="text-sm text-slate-400 tracking-widest uppercase">資料載入中…</p>
        </div>
        <StatusBanner loadWarning={loadWarning} saveError={saveError} isSaving={isSaving} />
      </div>
    );
  }

  if (currentUser) {
    const userDeposits = appData.deposits[currentUser.id] ?? [];
    const userBalances = appData.balances[currentUser.id] ?? createDefaultBalances(currentUser.investmentType || 'CRYPTO');
    const userHistory = appData.history[currentUser.id] ?? [];

    return (
      <>
        <MainApp
          key={currentUser.id}
          currentUser={currentUser}
          onLogout={handleLogout}
          onDeleteAccount={() => handleDeleteAccount(currentUser.id)}
          initialDeposits={userDeposits}
          initialBalances={userBalances}
          initialHistory={userHistory}
          onDataChange={(changes) => handleUserDataChange(currentUser.id, changes)}
        />
        <StatusBanner loadWarning={loadWarning} saveError={saveError} isSaving={isSaving} />
      </>
    );
  }

  // --- Sci-Fi Login Page Render ---
  return (
    <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center font-sans overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e1b4b,transparent)] opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute top-20 left-20 w-[300px] h-[300px] bg-emerald-900/20 rounded-full blur-[100px] mix-blend-screen"></div>
        
        {/* Animated Particles (CSS implementation) */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10 px-4">
        
        {/* Logo Section */}
        <div className="text-center mb-12 relative group">
          <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full group-hover:bg-indigo-500/30 transition-all duration-700"></div>
          
          <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-6 ring-1 ring-white/10 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <Sparkles className="w-10 h-10 text-indigo-400 mr-2 animate-pulse" />
             <TrendingUp className="w-10 h-10 text-emerald-400" />
          </div>
          
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            Asset<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Tracker</span> Pro
          </h1>
          <p className="text-slate-400 text-sm font-light tracking-wide uppercase">下一代資產管理終端</p>
        </div>

        {/* User Card Container */}
        <div className="space-y-4 perspective-1000">
          {users.map((user, index) => (
            <div 
              key={user.id}
              onClick={() => handleLogin(user)}
              className="group relative bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }} // Staggered entrance
            >
              <div className="flex items-center p-4 relative z-10">
                {/* Glowing Avatar */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTypeColor(user.investmentType)} flex items-center justify-center text-white shadow-lg mr-4 relative`}>
                    <span className="font-bold text-lg">{user.name.charAt(0).toUpperCase()}</span>
                    <div className="absolute -bottom-2 -right-2 bg-black/80 rounded-full p-1 border border-white/10">
                        {getTypeIcon(user.investmentType)}
                    </div>
                </div>

                <div className="flex-grow">
                   <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                       {user.name}
                   </h3>
                   <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-slate-400 border border-white/5">
                          {getTypeLabel(user.investmentType)}
                       </span>
                   </div>
                </div>

                <div className="text-white/20 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-300">
                   <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}

          {/* Add User Form - Sci-Fi Style */}
          {showAddUser ? (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
              
              <form onSubmit={handleCreateUser} className="flex flex-col gap-4 relative z-10">
                <div className="relative group">
                    <input
                        type="text"
                        id="newUserName"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="peer w-full bg-black/40 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-transparent"
                        placeholder="Name"
                        autoFocus
                    />
                    <label 
                        htmlFor="newUserName"
                        className="absolute left-4 -top-2.5 bg-slate-900 px-1 text-xs text-indigo-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-indigo-400 peer-focus:text-xs"
                    >
                        使用者名稱
                    </label>
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">選擇市場類型</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewUserType('CRYPTO')}
                          className={`relative py-3 rounded-xl text-xs font-bold border transition-all overflow-hidden group ${newUserType === 'CRYPTO' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-black/30 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                        >
                            <div className="flex flex-col items-center gap-1 relative z-10">
                                <Coins className={`w-4 h-4 ${newUserType === 'CRYPTO' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                Crypto
                            </div>
                            {newUserType === 'CRYPTO' && <div className="absolute inset-0 bg-emerald-500/10 blur-sm"></div>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewUserType('TW_STOCK')}
                          className={`relative py-3 rounded-xl text-xs font-bold border transition-all overflow-hidden group ${newUserType === 'TW_STOCK' ? 'bg-rose-900/30 border-rose-500 text-rose-400' : 'bg-black/30 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                        >
                            <div className="flex flex-col items-center gap-1 relative z-10">
                                <CandlestickChart className={`w-4 h-4 ${newUserType === 'TW_STOCK' ? 'text-rose-400' : 'text-slate-600'}`} />
                                台股
                            </div>
                            {newUserType === 'TW_STOCK' && <div className="absolute inset-0 bg-rose-500/10 blur-sm"></div>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewUserType('US_STOCK')}
                          className={`relative py-3 rounded-xl text-xs font-bold border transition-all overflow-hidden group ${newUserType === 'US_STOCK' ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-black/30 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                        >
                             <div className="flex flex-col items-center gap-1 relative z-10">
                                <Globe className={`w-4 h-4 ${newUserType === 'US_STOCK' ? 'text-blue-400' : 'text-slate-600'}`} />
                                美股
                            </div>
                            {newUserType === 'US_STOCK' && <div className="absolute inset-0 bg-blue-500/10 blur-sm"></div>}
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddUser(false)}
                    className="flex-1 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm font-medium border border-transparent hover:border-white/10"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    disabled={!newUserName.trim()}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02]"
                  >
                    初始化帳戶
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowAddUser(true)}
              className="w-full py-4 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl text-slate-500 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 font-medium bg-black/20 hover:bg-emerald-900/10 group"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-emerald-900/30 flex items-center justify-center transition-colors">
                  <UserPlus className="w-4 h-4" />
              </div>
              建立新使用者
            </button>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-slate-600 text-xs">
            <p>SECURE ASSET TRACKING SYSTEM v2.0</p>
        </div>
      </div>
      <StatusBanner loadWarning={loadWarning} saveError={saveError} isSaving={isSaving} />
    </div>
  );
};

export default App;