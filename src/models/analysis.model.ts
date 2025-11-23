
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Conclusion {
  signal: 'Buy' | 'Sell' | 'Hold';
  entry: string;
  take_profit: string;
  stop_loss: string;
  fear_greed_index?: number;
  market_sentiment?: 'Bullish' | 'Bearish' | 'Neutral';
  news_impact_score?: number;
  confidence_score?: number;
  key_support?: string;
  key_resistance?: string;
}

export interface ForexAnalysis {
  analysis: string;
  sources: GroundingSource[];
  conclusion: Conclusion | null;
}

export interface TradeRecord {
  id: number;
  conclusion: Conclusion;
  status: 'Pending' | 'Win' | 'Loss';
  pair: string;
  timeframe: string;
}
