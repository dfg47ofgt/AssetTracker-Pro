import React, { useState, useEffect } from 'react';
import { AssetHistoryRecord } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, TrendingUp, Edit2, X, BarChart3, LineChart as LineChartIcon, Save, Trash2, AlertCircle } from 'lucide-react';

interface AssetHistoryProps {
  history: AssetHistoryRecord[];
  onEdit: (record: AssetHistoryRecord) => void;
  onDelete: (id: string) => void;
  currency?: string;
  currencySymbol?: string;
  assetLabel?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

export const AssetHistory: React.FC<AssetHistoryProps> = ({ 
    history, 
    onEdit, 
    onDelete,
    currency = 'USDT',
    currencySymbol = '$',
    assetLabel = '幣種'
}) => {
  const [editingRecord, setEditingRecord] = useState<AssetHistoryRecord | null>(null);
  const [editDateInput, setEditDateInput] = useState(''); // State for datetime-local input
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // New state for 2-step deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sort by timestamp ascending for chart (Oldest -> Newest)
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  // Sort by timestamp descending for table (Newest -> Oldest)
  const tableHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  // Find all unique coins ever recorded to generate chart lines
  const allCoins = Array.from(new Set(history.flatMap(h => Object.keys(h.coinBreakdown || {}))));
  allCoins.sort((a, b) => {
    if (a === 'USDT' || a === 'TWD' || a === 'USD') return -1;
    return a.localeCompare(b);
  });

  // Format data for Recharts with detailed time
  const chartData = sortedHistory.map(record => {
    const dateObj = new Date(record.timestamp);
    // Format: "10/25 14:30"
    const displayDate = dateObj.toLocaleString('zh-TW', { 
      month: 'numeric', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
    
    return {
      ...record.coinBreakdown,
      displayDate: displayDate, // Use this for XAxis to show hours
      fullDate: record.date, // Keep original string just in case
      timestamp: record.timestamp,
      total: record.totalAssets,
    };
  });

  // Handle opening the edit modal
  const handleStartEdit = (record: AssetHistoryRecord) => {
    setEditingRecord(record);
    // Convert timestamp to YYYY-MM-DDTHH:mm format for input
    const d = new Date(record.timestamp);
    // Adjust for timezone to ensure the input shows local time
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
    setEditDateInput(localISOTime);
  };

  const handleSaveEdit = () => {
    if (editingRecord && editDateInput) {
      // Recalculate total based on platform breakdown edit
      const newTotal = Object.values(editingRecord.platformBreakdown).reduce((a, b) => a + b, 0);
      
      // Calculate new timestamp and date string from the date picker
      const newDateObj = new Date(editDateInput);
      const newTimestamp = newDateObj.getTime();
      const newDateString = newDateObj.toLocaleString('zh-TW', { hour12: false });

      onEdit({ 
        ...editingRecord, 
        totalAssets: newTotal,
        timestamp: newTimestamp, // Update timestamp for sorting
        date: newDateString      // Update display string
      });
      setEditingRecord(null);
    }
  };

  const updatePlatformBreakdownValue = (platform: string, value: string) => {
    if (editingRecord) {
      setEditingRecord({
        ...editingRecord,
        platformBreakdown: {
          ...editingRecord.platformBreakdown,
          [platform]: parseFloat(value) || 0
        }
      });
    }
  };

  const updateCoinBreakdownValue = (coin: string, value: string) => {
    if (editingRecord) {
      setEditingRecord({
        ...editingRecord,
        coinBreakdown: {
          ...(editingRecord.coinBreakdown || {}),
          [coin]: parseFloat(value) || 0
        }
      });
    }
  };

  // 2-Step Deletion Logic
  const initiateDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // payload[0].payload contains the full data object including timestamp
      const data = payload[0].payload;
      const fullTimeStr = new Date(data.timestamp).toLocaleString('zh-TW', {
         year: 'numeric',
         month: 'numeric', 
         day: 'numeric', 
         hour: '2-digit', 
         minute: '2-digit'
      });

      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-2xl z-50 text-slate-100 text-sm">
          <p className="font-bold mb-2 border-b border-slate-600 pb-1">{fullTimeStr}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="text-slate-300">
                {entry.name === 'total' ? '總資產' : entry.name}:
              </span>
              <span className="font-mono font-bold">
                {currencySymbol}{(entry.value || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 relative">
       {/* Edit Modal */}
       {editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
               <h3 className="font-bold text-white flex items-center gap-2">
                 <Edit2 className="w-5 h-5" /> 編輯歷史紀錄
               </h3>
               <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-6">
               <div>
                 <label className="text-sm text-slate-400 mb-1 block">紀錄時間</label>
                 <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input 
                        type="datetime-local" 
                        value={editDateInput}
                        onChange={(e) => setEditDateInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-emerald-500"
                    />
                 </div>
                 <p className="text-xs text-slate-500 mt-1">修改時間後將自動重新排序列表與圖表。</p>
               </div>
               
               <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-200 block border-b border-slate-700 pb-1">
                    各平台資產 (決定總資產)
                 </label>
                 {Object.keys(editingRecord.platformBreakdown).map(platform => (
                    <div key={platform} className="flex justify-between items-center gap-4">
                       <span className="text-slate-300 text-sm">{platform}</span>
                       <input 
                          type="number"
                          value={editingRecord.platformBreakdown[platform]}
                          onChange={(e) => updatePlatformBreakdownValue(platform, e.target.value)}
                          className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-white font-mono"
                       />
                    </div>
                 ))}
               </div>

               <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-200 block border-b border-slate-700 pb-1 flex justify-between items-center">
                    <span>各{assetLabel}資產 (參考用)</span>
                 </label>
                 {editingRecord.coinBreakdown && Object.keys(editingRecord.coinBreakdown).length > 0 ? (
                    Object.keys(editingRecord.coinBreakdown).map(coin => (
                        <div key={coin} className="flex justify-between items-center gap-4">
                        <span className="text-slate-300 text-sm">{coin}</span>
                        <input 
                            type="number"
                            value={editingRecord.coinBreakdown![coin]}
                            onChange={(e) => updateCoinBreakdownValue(coin, e.target.value)}
                            className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-white font-mono"
                        />
                        </div>
                    ))
                 ) : (
                     <div className="text-slate-500 text-sm italic">此紀錄無{assetLabel}詳細資料</div>
                 )}
               </div>
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-end gap-2 shrink-0 bg-slate-800">
                <button onClick={() => setEditingRecord(null)} className="px-4 py-2 text-slate-400 hover:text-white">取消</button>
                <button onClick={handleSaveEdit} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2">
                  <Save className="w-4 h-4" /> 儲存
                </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative z-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            資產與{assetLabel}成長趨勢
          </h2>
          <div className="flex bg-slate-900 p-1 rounded-lg">
             <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded-md transition-all ${chartType === 'line' ? 'bg-slate-700 text-emerald-400 shadow' : 'text-slate-400 hover:text-white'}`}
                title="折線圖"
             >
               <LineChartIcon className="w-4 h-4" />
             </button>
             <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-slate-700 text-emerald-400 shadow' : 'text-slate-400 hover:text-white'}`}
                title="堆疊長條圖"
             >
               <BarChart3 className="w-4 h-4" />
             </button>
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `${currencySymbol}${val/1000}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="總資產"
                      stroke="#ffffff" 
                      strokeWidth={3} 
                      dot={{ fill: '#ffffff', r: 4 }} 
                  />
                  {allCoins.map((coin, index) => (
                    <Line
                      key={coin}
                      type="monotone"
                      dataKey={coin}
                      name={coin}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `${currencySymbol}${val/1000}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {allCoins.map((coin, index) => (
                    <Bar 
                      key={coin} 
                      dataKey={coin} 
                      name={coin} 
                      stackId="a" 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
               尚無足夠的歷史資料來顯示圖表。請在「資產管理」頁面更新並儲存資產。
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700">
           <h3 className="text-lg font-bold text-white flex items-center gap-2">
             <Calendar className="w-5 h-5 text-blue-400" />
             詳細歷史紀錄
           </h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">日期時間</th>
                  <th className="px-6 py-4 font-medium">{assetLabel}分佈</th>
                  <th className="px-6 py-4 font-medium text-right whitespace-nowrap">總資產 ({currency})</th>
                  <th className="px-6 py-4 font-medium text-center whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tableHistory.length === 0 ? (
                     <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">無歷史紀錄</td>
                     </tr>
                ) : (
                  tableHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-mono text-sm align-top whitespace-nowrap">
                          {record.date}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm align-top">
                        <div className="flex flex-wrap gap-2">
                           {record.coinBreakdown ? (
                             Object.entries(record.coinBreakdown).map(([coin, value]) => (
                               <span key={coin} className="inline-flex items-center px-2 py-1 rounded bg-slate-800 border border-slate-600 text-xs">
                                 <span className="font-bold text-slate-300 mr-1">{coin}:</span>
                                 <span className="font-mono text-emerald-400">{currencySymbol}{value.toLocaleString()}</span>
                               </span>
                             ))
                           ) : (
                             <span className="text-slate-600 italic">無詳細資料</span>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-emerald-400 text-right font-mono font-bold align-top whitespace-nowrap">
                        {currencySymbol}{record.totalAssets.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center align-top whitespace-nowrap">
                         <div className="flex justify-center gap-2">
                            {deleteConfirmId === record.id ? (
                                <>
                                    <button 
                                        onClick={() => confirmDelete(record.id)}
                                        className="text-white bg-rose-600 hover:bg-rose-700 text-xs px-2 py-1 rounded transition mr-2"
                                        title="確認刪除"
                                    >
                                      確認刪除
                                    </button>
                                    <button 
                                        onClick={cancelDelete}
                                        className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded transition"
                                        title="取消"
                                    >
                                      取消
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                       onClick={() => handleStartEdit(record)}
                                       className="text-slate-500 hover:text-indigo-400 p-2 hover:bg-slate-700 rounded transition"
                                       title="編輯"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                     <button 
                                       onClick={() => initiateDelete(record.id)}
                                       className="text-slate-500 hover:text-rose-400 p-2 hover:bg-slate-700 rounded transition"
                                       title="刪除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};