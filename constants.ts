import { InvestmentType, PlatformBalances } from './types';

export const DEFAULT_PLATFORMS: Record<InvestmentType, string[]> = {
  CRYPTO: ['BingX', 'Bitget', 'Bitget Wallet'],
  TW_STOCK: ['富邦證卷', '國泰證卷', '永豐證卷'],
  US_STOCK: ['富邦證卷', '國泰證卷', '凱基證卷']
};

export const createDefaultBalances = (investmentType: InvestmentType = 'CRYPTO'): PlatformBalances => {
  const platforms = DEFAULT_PLATFORMS[investmentType] || DEFAULT_PLATFORMS.CRYPTO;
  const balances: PlatformBalances = {};
  platforms.forEach((name) => {
    balances[name] = [];
  });
  return balances;
};
