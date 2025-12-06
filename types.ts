export type InvestmentType = 'CRYPTO' | 'TW_STOCK' | 'US_STOCK';

export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  investmentType?: InvestmentType; // Default to CRYPTO if undefined
  currency?: string; // USDT, TWD, USD
}

export interface DepositRecord {
  id: string;
  date: string;
  amount: number;
  bank: string;
  note?: string;
}

export interface Asset {
  id: string;
  coin: string; // e.g., 'USDT', 'BTC', 'TSLA', '2330'
  value: number; // Value in base currency
}

// Changed from interface to Record to support dynamic platforms
export type PlatformBalances = Record<string, Asset[]>;

export interface AssetHistoryRecord {
  id: string;
  date: string; // ISO Date string or Locale string
  timestamp: number;
  totalAssets: number;
  // Dynamic breakdown by platform
  platformBreakdown: Record<string, number>;
  // Dynamic breakdown by coin/stock
  coinBreakdown?: Record<string, number>;
}

export interface AnalysisResult {
  totalDeposited: number;
  totalAssets: number;
  pnl: number; // Profit and Loss
  roi: number; // Return on Investment %
}

export enum TabView {
  DASHBOARD = 'DASHBOARD',
  DEPOSITS = 'DEPOSITS',
  ASSETS = 'ASSETS',
  HISTORY = 'HISTORY'
}

export interface AppData {
  users: UserProfile[];
  deposits: Record<string, DepositRecord[]>;
  balances: Record<string, PlatformBalances>;
  history: Record<string, AssetHistoryRecord[]>;
}