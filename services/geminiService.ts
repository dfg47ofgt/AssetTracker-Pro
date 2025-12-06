import { GoogleGenAI } from "@google/genai";
import { DepositRecord, PlatformBalances, InvestmentType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const calculateTotal = (assets: any[]) => {
  if (!assets || !Array.isArray(assets)) return 0;
  return assets.reduce((sum, a) => sum + (a.value || 0), 0);
};

export const analyzePortfolioWithGemini = async (
  deposits: DepositRecord[],
  balances: PlatformBalances,
  currency: string = 'USDT',
  investmentType: InvestmentType = 'CRYPTO'
): Promise<string> => {
  const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
  
  // Dynamic platform calculation
  const platformNames = Object.keys(balances);
  const platformSummaries = platformNames.map(name => {
    const total = calculateTotal(balances[name]);
    return `- ${name}: ${total.toFixed(2)}`;
  }).join('\n    ');
  
  const totalAssets = platformNames.reduce((sum, name) => sum + calculateTotal(balances[name]), 0);
  const pnl = totalAssets - totalDeposited;
  const roi = totalDeposited > 0 ? (pnl / totalDeposited) * 100 : 0;

  // Aggregate Asset Data for context
  const allAssets = Object.values(balances).flat();
  const coinTotals: Record<string, number> = {};
  allAssets.forEach(a => {
    const coin = a.coin.toUpperCase();
    coinTotals[coin] = (coinTotals[coin] || 0) + a.value;
  });
  
  // Limit to top 10 assets to avoid overflowing prompt
  const topCoins = Object.entries(coinTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([coin, val]) => `${coin}: $${val.toFixed(0)}`)
    .join(', ');

  const marketTypeLabel = investmentType === 'TW_STOCK' ? '台股' : investmentType === 'US_STOCK' ? '美股' : '加密貨幣';
  const assetLabel = investmentType === 'CRYPTO' ? '幣種' : '股票';

  const prompt = `
    你是一位專業的${marketTypeLabel}投資組合分析師。請分析以下用戶數據：
    
    **財務概覽：**
    - 總投入成本 (${currency}): ${totalDeposited.toFixed(2)}
    - 目前總資產價值 (${currency}): ${totalAssets.toFixed(2)}
    - 淨損益 (PnL): ${pnl.toFixed(2)} ${currency}
    - 投資報酬率 (ROI): ${roi.toFixed(2)}%

    **平台/券商資產分佈：**
    ${platformSummaries}

    **前十大持倉 (${assetLabel})：**
    - ${topCoins}

    **入金歷史摘要：**
    - 總入金筆數: ${deposits.length}
    - 最後入金日期: ${deposits.length > 0 ? deposits[deposits.length - 1].date : '無'}

    **任務：**
    1. 簡要評估投資組合表現。
    2. 評論資產配置（針對平台/券商分散程度以及${assetLabel}集中度）。
    3. 根據 ROI 和持倉結構給出一個簡短、鼓勵但謹慎的財務建議。
    
    請使用**繁體中文**回答。保持語氣專業、簡潔且有幫助。使用粗體強調重點。字數限制在 150 字以內。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "暫時無法生成分析報告。";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "連線 AI 分析服務時發生錯誤，請檢查您的 API 金鑰。";
  }
};