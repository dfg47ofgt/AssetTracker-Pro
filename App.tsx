import React, { useState, useEffect } from 'react';
import { UserProfile, InvestmentType } from './types';
import { MainApp } from './components/MainApp';
import { Users, UserPlus, ArrowRight, Coins, TrendingUp, CandlestickChart, Globe, Sparkles } from 'lucide-react';

const STORAGE_KEY_USERS = 'crypto_users';

// Legacy keys to check for data migration
const LEGACY_DEPOSITS = 'crypto_deposits';
const LEGACY_BALANCES = 'crypto_balances';
const LEGACY_HISTORY = 'crypto_asset_history';

const App: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Create User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserType, setNewUserType] = useState<InvestmentType>('CRYPTO');
  const [showAddUser, setShowAddUser] = useState(false);

  // Load users and check for migration on mount
  useEffect(() => {
    const savedUsers = localStorage.getItem(STORAGE_KEY_USERS);
    let parsedUsers: UserProfile[] = savedUsers ? JSON.parse(savedUsers) : [];

    // --- MIGRATION LOGIC START ---
    if (parsedUsers.length === 0) {
      const hasLegacyData = localStorage.getItem(LEGACY_DEPOSITS) !== null;
      
      if (hasLegacyData) {
        const defaultUser: UserProfile = {
          id: 'default_user',
          name: '預設使用者',
          createdAt: Date.now(),
          investmentType: 'CRYPTO',
          currency: 'USDT'
        };
        parsedUsers = [defaultUser];
        
        const d = localStorage.getItem(LEGACY_DEPOSITS);
        const b = localStorage.getItem(LEGACY_BALANCES);
        const h = localStorage.getItem(LEGACY_HISTORY);

        if (d) localStorage.setItem(`crypto_deposits_${defaultUser.id}`, d);
        if (b) localStorage.setItem(`crypto_balances_${defaultUser.id}`, b);
        if (h) localStorage.setItem(`crypto_asset_history_${defaultUser.id}`, h);

        console.log("Migrated legacy data to default user.");
      }
    }
    // --- MIGRATION LOGIC END ---

    setUsers(parsedUsers);
  }, []);

  // Save users list whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    // Determine currency based on type
    let currency = 'USDT';
    if (newUserType === 'TW_STOCK') currency = 'TWD';
    if (newUserType === 'US_STOCK') currency = 'USD';

    const newUser: UserProfile = {
      id: 'u_' + Date.now().toString(36),
      name: newUserName.trim(),
      createdAt: Date.now(),
      investmentType: newUserType,
      currency: currency
    };

    setUsers(prev => [...prev, newUser]);
    setNewUserName('');
    setNewUserType('CRYPTO');
    setShowAddUser(false);
  };

  // Handle deleting the current user (passed to MainApp)
  const handleDeleteAccount = (userId: string) => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    
    // Clean up their data
    localStorage.removeItem(`crypto_deposits_${userId}`);
    localStorage.removeItem(`crypto_balances_${userId}`);
    localStorage.removeItem(`crypto_asset_history_${userId}`);
    
    setCurrentUser(null);
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
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

  if (currentUser) {
    return (
        <MainApp 
            key={currentUser.id} 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onDeleteAccount={() => handleDeleteAccount(currentUser.id)}
        />
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
    </div>
  );
};

export default App;