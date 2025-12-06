import React, { useState } from 'react';
import { DepositRecord } from '../types';
import { Plus, Trash2, Calendar, DollarSign, Landmark, Edit2, Save, X } from 'lucide-react';

interface DepositSectionProps {
  deposits: DepositRecord[];
  onAdd: (deposit: DepositRecord) => void;
  onEdit: (deposit: DepositRecord) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

export const DepositSection: React.FC<DepositSectionProps> = ({ deposits, onAdd, onEdit, onDelete, currency = 'USDT' }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 2-Step Deletion State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !bank || !date) return;

    if (editingId) {
      // Update existing
      onEdit({
        id: editingId,
        date,
        amount: parseFloat(amount),
        bank,
      });
      setEditingId(null);
    } else {
      // Add new
      const newDeposit: DepositRecord = {
        id: Date.now().toString(),
        date,
        amount: parseFloat(amount),
        bank,
      };
      onAdd(newDeposit);
    }

    // Reset form
    setAmount('');
    setBank('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const startEdit = (deposit: DepositRecord) => {
    setEditingId(deposit.id);
    setDate(deposit.date);
    setAmount(deposit.amount.toString());
    setBank(deposit.bank);
    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setBank('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  // Delete Handlers
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

  // Sort deposits by date descending
  const sortedDeposits = [...deposits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-1">
        <div className={`p-6 rounded-xl border shadow-lg sticky top-6 transition-colors ${editingId ? 'bg-indigo-900/40 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {editingId ? <Edit2 className="w-5 h-5 text-indigo-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
            {editingId ? '編輯入金紀錄' : '新增入金紀錄'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">日期</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">金額 ({currency})</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">入金來源 (銀行/交易所)</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="例如: 國泰世華, 街口, 幣安"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              )}
              <button
                type="submit"
                className={`flex-1 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? '儲存變更' : '新增紀錄'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="lg:col-span-2">
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">入金歷史紀錄</h2>
            <span className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full">
              總筆數: {deposits.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">日期</th>
                  <th className="px-6 py-4 font-medium">來源</th>
                  <th className="px-6 py-4 font-medium text-right">金額 ({currency})</th>
                  <th className="px-6 py-4 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      目前尚無入金紀錄。
                    </td>
                  </tr>
                ) : (
                  sortedDeposits.map((deposit) => (
                    <tr key={deposit.id} className={`transition-colors ${editingId === deposit.id ? 'bg-indigo-900/20' : 'hover:bg-slate-700/30'}`}>
                      <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{deposit.date}</td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{deposit.bank}</td>
                      <td className="px-6 py-4 text-right text-emerald-400 font-mono font-medium">
                        {deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            {deleteConfirmId === deposit.id ? (
                                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                    <button 
                                        onClick={() => confirmDelete(deposit.id)}
                                        className="text-white bg-rose-600 hover:bg-rose-700 text-xs px-3 py-1.5 rounded transition font-bold"
                                    >
                                        確認
                                    </button>
                                    <button 
                                        onClick={cancelDelete}
                                        className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded transition"
                                    >
                                        取消
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => startEdit(deposit)}
                                        className="text-slate-500 hover:text-indigo-400 transition-colors p-2 hover:bg-indigo-500/10 rounded-full"
                                        title="編輯紀錄"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => initiateDelete(deposit.id)}
                                        className="text-slate-500 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-full"
                                        title="刪除紀錄"
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
    </div>
  );
};