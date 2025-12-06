import React, { useState, useEffect } from 'react';
import { PlatformBalances, Asset } from '../types';
import { Save, Wallet, Plus, Trash2, Coins, Settings, AlertTriangle, X, Check } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';

interface AssetSectionProps {
  balances: PlatformBalances;
  onUpdate: (balances: PlatformBalances) => void;
  onAddPlatform: (name: string) => void;
  onRemovePlatform: (name: string) => void;
  currency?: string;
  currencySymbol?: string;
  assetLabel?: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;
  const percentage = `${(percent * 100).toFixed(0)}%`;

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="middle" fontSize={12} fontWeight="bold">
      <tspan x={x} dy="-0.2em">{name || ''}</tspan>
      <tspan x={x} dy="1.2em">{percentage}</tspan>
    </text>
  );
};

export const AssetSection: React.FC<AssetSectionProps> = ({ 
    balances, 
    onUpdate, 
    onAddPlatform, 
    onRemovePlatform, 
    currency = 'USDT', 
    currencySymbol = '$',
    assetLabel = '幣種'
}) => {
    const renderPieTooltip = (props: TooltipProps<number, string>) => {
      if (!props.active || !('payload' in props) || !Array.isArray(props.payload) || props.payload.length === 0) {
        return null;
      }
      const payload = props.payload;
      const datum = payload[0];
      return (
        <div className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white">
          {`${currencySymbol}${Number(datum.value || 0).toLocaleString()}`}
        </div>
      );
    };

  const [localBalances, setLocalBalances] = useState<PlatformBalances>(balances);
  const [isDirty, setIsDirty] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // New state for 2-step deletion confirmation
  const [platformToDelete, setPlatformToDelete] = useState<string | null>(null);

  useEffect(() => {
    setLocalBalances(balances);
    setErrors({});
  }, [balances]);

  const validate = (currentBalances: PlatformBalances): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.entries(currentBalances).forEach(([platform, assets]) => {
      const coins = new Set<string>();
      assets.forEach(asset => {
        const normalizedCoin = asset.coin.trim().toUpperCase();
        if (!normalizedCoin) {
            newErrors[asset.id] = `${assetLabel}不能為空`;
            isValid = false;
        } else if (coins.has(normalizedCoin)) {
          newErrors[asset.id] = `重複的${assetLabel}`;
          isValid = false;
        } else {
          coins.add(normalizedCoin);
        }

        if (asset.value < 0 || isNaN(asset.value)) {
           newErrors[asset.id + '_val'] = "金額必須為正數";
           isValid = false;
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleAddAsset = (platform: string) => {
    const newAsset: Asset = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), coin: '', value: 0 };
    const updated = {
      ...localBalances,
      [platform]: [...localBalances[platform], newAsset]
    };
    setLocalBalances(updated);
    validate(updated);
    setIsDirty(true);
  };

  const handleRemoveAsset = (platform: string, id: string) => {
    const updated = {
      ...localBalances,
      [platform]: localBalances[platform].filter(a => a.id !== id)
    };
    setLocalBalances(updated);
    validate(updated);
    setIsDirty(true);
  };

  const handleAssetChange = (platform: string, id: string, field: keyof Asset, value: string | number) => {
    const updated = {
      ...localBalances,
      [platform]: localBalances[platform].map(a => {
        if (a.id === id) {
          return { ...a, [field]: value };
        }
        return a;
      })
    };
    setLocalBalances(updated);
    validate(updated);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (validate(localBalances)) {
      onUpdate(localBalances);
      setIsDirty(false);
    } else {
      alert("請修正紅框標示的錯誤後再儲存。");
    }
  };

  const handleCreatePlatform = () => {
    if (newPlatformName.trim()) {
      onAddPlatform(newPlatformName.trim());
      setNewPlatformName('');
    }
  };

  // Step 1: Initiate Delete (UI state only)
  const initiateDelete = (name: string) => {
    setPlatformToDelete(name);
  };

  // Step 2: Confirm Delete (Actual action)
  const confirmDelete = (name: string) => {
    onRemovePlatform(name);
    setPlatformToDelete(null);
  };

  // Cancel Delete
  const cancelDelete = () => {
    setPlatformToDelete(null);
  };

  const calculateTotal = (assets: Asset[]) => assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  const platformKeys = Object.keys(localBalances);
  const totalAssets = platformKeys.reduce((sum, key) => sum + calculateTotal(localBalances[key]), 0);

  const platformChartData = platformKeys
    .map(key => ({ name: key, value: calculateTotal(localBalances[key]) }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const coinMap: Record<string, number> = {};
  platformKeys.forEach(key => {
    localBalances[key].forEach(asset => {
      const coinName = asset.coin.toUpperCase() || '未命名';
      coinMap[coinName] = (coinMap[coinName] || 0) + (Number(asset.value) || 0);
    });
  });
  
  const coinChartData = Object.entries(coinMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .filter(d => d.value > 0);

  const renderPlatformInput = (platformName: string, index: number) => (
    <div key={platformName} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200">
           <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
           {platformName}
        </h3>
        <span className="text-slate-400 font-mono text-sm">
          {currencySymbol}{calculateTotal(localBalances[platformName]).toLocaleString()}
        </span>
      </div>
      
      <div className="space-y-3">
        {localBalances[platformName].map((asset) => (
          <div key={asset.id} className="flex gap-2 items-start">
            <div className="w-1/3">
              <input
                type="text"
                value={asset.coin}
                onChange={(e) => handleAssetChange(platformName, asset.id, 'coin', e.target.value)}
                placeholder={assetLabel}
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none uppercase ${errors[asset.id] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-emerald-500'}`}
              />
              {errors[asset.id] && <p className="text-xs text-rose-500 mt-1">{errors[asset.id]}</p>}
            </div>
            <div className="w-1/2 relative">
               <span className="absolute left-3 top-2 text-slate-500 text-xs">{currencySymbol}</span>
               <input
                type="number"
                value={asset.value === 0 ? '' : asset.value}
                onChange={(e) => handleAssetChange(platformName, asset.id, 'value', parseFloat(e.target.value) || 0)}
                placeholder="價值"
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2 pl-6 text-white text-sm focus:outline-none font-mono ${errors[asset.id + '_val'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-emerald-500'}`}
              />
            </div>
            <button 
              onClick={() => handleRemoveAsset(platformName, asset.id)}
              className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => handleAddAsset(platformName)}
          className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm hover:text-white hover:border-slate-500 hover:bg-slate-700/50 transition flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> 新增{assetLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2">
                 <Settings className="w-5 h-5" /> 管理交易平台
               </h3>
               <button onClick={() => { setShowSettings(false); setPlatformToDelete(null); }} className="text-slate-400 hover:text-white">
                 <X className="w-5 h-5" />
               </button>
            </div>
            <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">現有平台列表</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {platformKeys.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">無</p>
                    ) : (
                        platformKeys.map(key => (
                        <div key={key} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                            <span className="text-white">{key}</span>
                            
                            {/* Two-step delete button */}
                            {platformToDelete === key ? (
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => confirmDelete(key)}
                                        className="text-white bg-rose-600 hover:bg-rose-700 text-xs px-2 py-1.5 rounded transition-colors font-bold"
                                    >
                                        確認刪除?
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={cancelDelete}
                                        className="text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded"
                                    >
                                        取消
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={() => initiateDelete(key)}
                                    className="text-rose-400 hover:text-rose-300 text-sm hover:bg-rose-900/30 px-3 py-1.5 rounded transition-colors"
                                >
                                    刪除
                                </button>
                            )}
                        </div>
                        ))
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                   <label className="text-sm text-slate-400 block mb-2">新增平台</label>
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newPlatformName}
                        onChange={e => setNewPlatformName(e.target.value)}
                        placeholder="例如: Coinbase"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button 
                        onClick={handleCreatePlatform}
                        disabled={!newPlatformName.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        新增
                      </button>
                   </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Left Column: Inputs */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                資產配置細節
            </h2>
            <div className="flex items-center gap-4">
               {isDirty && (
                  <span className="text-sm text-amber-400 font-medium animate-pulse flex items-center gap-1">
                     • 未儲存
                  </span>
               )}
               <button 
                 onClick={() => setShowSettings(true)}
                 className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                 title="管理平台"
               >
                 <Settings className="w-5 h-5" />
               </button>
            </div>
        </div>

        {platformKeys.length === 0 ? (
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center text-slate-500">
             <p className="mb-4">尚未設定任何交易平台。</p>
             <button onClick={() => setShowSettings(true)} className="text-emerald-400 hover:underline">
               點擊此處新增平台
             </button>
          </div>
        ) : (
          platformKeys.map((key, index) => renderPlatformInput(key, index))
        )}

        <div className="bg-slate-800/80 sticky bottom-6 p-4 rounded-xl border border-slate-700 backdrop-blur-md shadow-2xl z-10">
             <div className="flex justify-between items-center mb-4">
                 <span className="text-slate-400">總資產估值</span>
                 <span className="text-2xl font-bold text-white font-mono">
                     {currencySymbol}{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm text-slate-500">{currency}</span>
                 </span>
             </div>

             <button 
                onClick={handleSave}
                disabled={!isDirty || Object.keys(errors).length > 0}
                className={`w-full py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isDirty && Object.keys(errors).length === 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 transform hover:-translate-y-0.5' 
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
             >
                {isDirty ? <Save className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                {isDirty ? '儲存並記錄歷史' : '已儲存'}
             </button>
             {Object.keys(errors).length > 0 && (
                <p className="text-center text-rose-400 text-sm mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> 請修正輸入錯誤後再儲存
                </p>
             )}
          </div>
      </div>

      {/* Right Column: Charts */}
      <div className="lg:col-span-5 space-y-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center min-h-[350px]">
           <h3 className="text-lg font-semibold text-white mb-2 w-full text-left flex items-center gap-2">
             <Wallet className="w-4 h-4 text-blue-400" /> 平台分佈
           </h3>
           {totalAssets > 0 ? (
              <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={platformChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {platformChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(15, 23, 42, 1)" strokeWidth={2} />
                              ))}
                          </Pie>
                            <Tooltip content={renderPieTooltip} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={80}
                            content={({ payload }) => (
                              <ul className="flex flex-wrap justify-center gap-4 text-base mt-4">
                                {payload?.map((entry: any, index: number) => (
                                  <li key={`item-${index}`} className="flex items-center text-slate-300">
                                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                    {entry.value}: <span className="font-mono ml-1 font-bold text-white">{currencySymbol}{(entry.payload?.value || 0).toLocaleString()}</span>
                                  </li>
                                ))}
                              </ul>
                            )} 
                          />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
           ) : (
               <div className="flex-1 flex items-center justify-center text-slate-500">無數據</div>
           )}
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center min-h-[350px]">
           <h3 className="text-lg font-semibold text-white mb-2 w-full text-left flex items-center gap-2">
             <Coins className="w-4 h-4 text-emerald-400" /> {assetLabel}分佈
           </h3>
           {totalAssets > 0 ? (
              <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={coinChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {coinChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} stroke="rgba(15, 23, 42, 1)" strokeWidth={2} />
                              ))}
                          </Pie>
                            <Tooltip content={renderPieTooltip} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={80}
                            content={({ payload }) => (
                              <ul className="flex flex-wrap justify-center gap-4 text-base mt-4">
                                {payload?.map((entry: any, index: number) => (
                                  <li key={`item-${index}`} className="flex items-center text-slate-300">
                                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                    {entry.value}: <span className="font-mono ml-1 font-bold text-white">{currencySymbol}{(entry.payload?.value || 0).toLocaleString()}</span>
                                  </li>
                                ))}
                              </ul>
                            )} 
                          />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
           ) : (
               <div className="flex-1 flex items-center justify-center text-slate-500">無數據</div>
           )}
        </div>
      </div>
    </div>
  );
};