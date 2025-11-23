
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Conclusion {
  signal: 'Buy' | 'Sell' | 'Hold';
  entry: string;
  take_profit: string;
  stop_loss: string;
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
