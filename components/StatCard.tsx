import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon, trend, colorClass = "bg-slate-800" }) => {
  return (
    <div className={`${colorClass} p-6 rounded-xl border border-slate-700 shadow-lg`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
          {subValue && (
             <p className={`text-sm mt-1 font-medium ${
                trend === 'up' ? 'text-emerald-400' : 
                trend === 'down' ? 'text-rose-400' : 'text-slate-400'
             }`}>
              {subValue}
             </p>
          )}
        </div>
        <div className="p-3 bg-slate-700/50 rounded-lg text-slate-200">
          {icon}
        </div>
      </div>
    </div>
  );
};