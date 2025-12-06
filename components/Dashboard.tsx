import React, { useState, useMemo } from 'react';
import { DepositRecord, PlatformBalances, AssetHistoryRecord, InvestmentType } from '../types';
import { StatCard } from './StatCard';
import { analyzePortfolioWithGemini } from '../services/geminiService';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Sparkles, PieChart as PieChartIcon, Coins } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface DashboardProps {
  deposits: DepositRecord[];
  balances: PlatformBalances;
  assetHistory: AssetHistoryRecord[]; 
  currency?: string;
  currencySymbol?: string;
  investmentType?: InvestmentType;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1'];

export const Dashboard: React.FC<DashboardProps> = ({ 
    deposits, 
    balances, 
    assetHistory, 
    currency = 'USDT', 
    currencySymbol = '$',
    investmentType = 'CRYPTO'
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const calculateTotal = (assets: any[]) => {
    if (!assets || !Array.isArray(assets)) return 0;
    return assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  };

  const { totalDeposited, totalAssets, pnl, roi, isProfit, barData, usingHistorySource, allocationData } = useMemo(() => {
     const deposited = deposits.reduce((sum, d) => sum + d.amount, 0);
     
     // Current Balances Total (From Asset Inputs - mostly for initial setup)
     const platformKeys = Object.keys(balances);
     const currentBalanceTotal = platformKeys.reduce((sum, key) => sum + calculateTotal(balances[key]), 0);

     let finalAssets = 0;
     let source = 'live';
     let currentCoinBreakdown: Record<string, number> = {};

     // 1. Determine Total Assets and Source
     if (assetHistory && assetHistory.length > 0) {
        const sorted = [...assetHistory].sort((a, b) => b.timestamp - a.timestamp);
        const latest = sorted[0];
        finalAssets = latest.totalAssets;
        source = 'history';
     } else {
        finalAssets = 0;
        source = 'live'; 
     }
     
     // 2. Build Allocation Data from Current Balances (Reactive)
     // Aggregating all assets across all platforms
     Object.values(balances).flat().forEach(asset => {
         const coin = asset.coin.trim().toUpperCase() || '未知';
         currentCoinBreakdown[coin] = (currentCoinBreakdown[coin] || 0) + (Number(asset.value) || 0);
     });

     // Prepare for Recharts
     // Filter out 0 values and sort
     let rawAllocation = Object.entries(currentCoinBreakdown)
        .filter(([, value]) => value > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }));

     // Optional: Group small dust into "Others" if too many items?
     if (rawAllocation.length > 6) {
        const top5 = rawAllocation.slice(0, 5);
        const others = rawAllocation.slice(5).reduce((sum, item) => sum + item.value, 0);
        rawAllocation = [...top5, { name: 'Others', value: others }];
     }

     const pnlVal = finalAssets - deposited;
     const roiVal = deposited > 0 ? (pnlVal / deposited) * 100 : 0;
     
     return {
       totalDeposited: deposited,
       totalAssets: finalAssets,
       pnl: pnlVal,
       roi: roiVal,
       isProfit: pnlVal >= 0,
       usingHistorySource: source === 'history',
       barData: [
         { name: '總投入', amount: deposited },
         { name: '目前價值', amount: finalAssets },
       ],
       allocationData: rawAllocation
     };
  }, [deposits, balances, assetHistory]);

  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    const result = await analyzePortfolioWithGemini(deposits, balances, currency, investmentType);
    setAiAnalysis(result);
    setIsLoadingAi(false);
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    if (percent < 0.05) return null;
  
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="總入金金額"
          value={`${currencySymbol}${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subValue={currency}
          icon={<Wallet className="w-6 h-6 text-emerald-400" />}
          colorClass="bg-slate-800"
        />
        <StatCard
          title="目前資產總額"
          value={`${currencySymbol}${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subValue={usingHistorySource ? `最新歷史紀錄 (${currency})` : `無歷史紀錄`}
          icon={<TrendingUp className="w-6 h-6 text-blue-400" />}
          colorClass="bg-slate-800"
        />
        <StatCard
          title="淨損益 (PnL)"
          value={`${pnl < 0 ? '-' : '+'}${currencySymbol}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subValue="總獲利 / 虧損"
          trend={isProfit ? 'up' : 'down'}
          icon={isProfit ? <ArrowUpRight className="w-6 h-6 text-emerald-400" /> : <ArrowDownRight className="w-6 h-6 text-rose-400" />}
          colorClass="bg-slate-800"
        />
        <StatCard
          title="投資報酬率 %"
          value={`${roi.toFixed(2)}%`}
          subValue="投資回報率 (ROI)"
          trend={roi >= 0 ? 'up' : 'down'}
          icon={<span className="text-xl font-bold text-slate-200">%</span>}
          colorClass={roi >= 0 ? "bg-emerald-900/30 border-emerald-800" : "bg-rose-900/30 border-rose-800"}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Chart: Investment vs Value */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-[450px]">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
             <BarChart className="w-5 h-5 text-emerald-400" />
             投入成本 vs 目前價值
          </h3>
          <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${currencySymbol}${val/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                <Tooltip 
                  cursor={{fill: '#334155', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, '金額']}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={40}>
                    {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#64748b' : (isProfit ? '#10b981' : '#f43f5e')} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Asset Allocation */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-[450px]">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-400" />
              資產配置佔比
           </h3>
           <div className="flex-grow w-full">
               {allocationData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            innerRadius={60}
                            dataKey="value"
                            paddingAngle={5}
                        >
                            {allocationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(15, 23, 42, 1)" strokeWidth={2} />
                            ))}
                        </Pie>
                        <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                              itemStyle={{ color: '#f8fafc' }}
                              formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, '價值']}
                          />
                        <Legend 
                            verticalAlign="bottom" 
                            height={80}
                            content={({ payload }) => (
                              <ul className="flex flex-wrap justify-center gap-4 text-sm mt-4">
                                {payload?.map((entry: any, index: number) => (
                                  <li key={`item-${index}`} className="flex items-center text-slate-300">
                                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                    {entry.value}: <span className="font-mono ml-1 font-bold text-white">{currencySymbol}{entry.payload.value.toLocaleString()}</span>
                                  </li>
                                ))}
                              </ul>
                            )} 
                        />
                      </PieChart>
                   </ResponsiveContainer>
               ) : (
                   <div className="flex flex-col items-center justify-center h-full text-slate-500">
                       <Coins className="w-12 h-12 mb-2 opacity-20" />
                       <p>無資產數據</p>
                       <p className="text-xs mt-1">請至「資產」頁面新增持倉</p>
                   </div>
               )}
           </div>
        </div>
      </div>

      {/* Bottom: AI Analysis Section (Full Width) */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-xl border border-indigo-700/50 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                        AI 投資組合智能分析
                    </h3>
                    
                    <div className="bg-slate-800/50 rounded-xl border border-indigo-500/20 min-h-[150px] p-6">
                        {isLoadingAi ? (
                            <div className="flex flex-col items-center justify-center h-32 space-y-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                <p className="text-indigo-300 text-sm animate-pulse">正在分析您的投資組合與市場數據...</p>
                            </div>
                        ) : aiAnalysis ? (
                            <div className="prose prose-invert prose-lg text-slate-200">
                            <div className="whitespace-pre-line leading-relaxed">
                                {aiAnalysis}
                            </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-32 text-center text-indigo-200/60">
                                <Sparkles className="w-10 h-10 mb-3 opacity-20" />
                                <p>點擊右側按鈕，讓 AI 為您評估投資績效與資產配置。</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 md:w-64 pt-2">
                    <button
                        onClick={handleAiAnalysis}
                        disabled={isLoadingAi}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group border border-indigo-400/50"
                    >
                        {isLoadingAi ? '分析中...' : (
                            <>
                            <span>生成分析報告</span>
                            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            </>
                        )}
                    </button>
                    <p className="text-xs text-indigo-300/60 text-center mt-3">
                        Powered by Google Gemini AI
                    </p>
                </div>
            </div>
      </div>
    </div>
  );
};