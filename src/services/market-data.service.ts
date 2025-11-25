
import { Injectable } from '@angular/core';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {

  constructor() { }

  async getHistoricalData(symbol: string, timeframe: string, marketType: 'forex' | 'crypto' | 'stocks'): Promise<Candle[]> {
    if (marketType === 'crypto') {
      return this.getExtendedBinanceData(symbol, timeframe);
    }
    // For Forex and Stocks, generate realistic simulated historical data for backtesting
    return this.generateSimulatedData(symbol, timeframe, marketType);
  }

  private async getExtendedBinanceData(symbol: string, timeframe: string): Promise<Candle[]> {
    console.log('🌐 getExtendedBinanceData called with:', { symbol, timeframe });
    
    const intervalMap: { [key: string]: string } = {
      '15m': '15m',
      '1H': '1h',
      '4H': '4h',
      '1D': '1d'
    };

    const interval = intervalMap[timeframe] || '1h';
    const cleanSymbol = symbol.replace('/', '');
    
    console.log('📝 Binance params:', { cleanSymbol, interval });
    
    // Calculate how many candles we need for 5 years
    const intervalsPerYear: { [key: string]: number } = {
      '15m': 35040, // 4 candles per hour * 24 * 365
      '1h': 8760,   // 24 * 365
      '4h': 2190,   // 6 * 365
      '1d': 365     // 365
    };
    
    const candlesNeeded = (intervalsPerYear[interval] || 8760) * 5; // 5 years, default to 1h
    const maxLimit = 1000; // Binance API limit
    const batchCount = Math.ceil(candlesNeeded / maxLimit);
    
    // Limit to reasonable number of batches to avoid rate limits
    const actualBatches = Math.min(batchCount, 50); // Max 50k candles (approx 5 years for 1H)
    
    console.log(`📊 Will fetch ${actualBatches} batches of ${maxLimit} candles`);
    
    let allCandles: Candle[] = [];
    let endTime: number | undefined = undefined;

    try {
      for (let i = 0; i < actualBatches; i++) {
        const url = endTime 
          ? `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${maxLimit}&endTime=${endTime}`
          : `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${maxLimit}`;
        
        console.log(`🌐 Fetching batch ${i + 1}/${actualBatches}:`, url);
        
        const response = await fetch(url);
        
        console.log(`📡 Response status:`, response.status, response.statusText);
        
        if (!response.ok) {
          console.error('❌ Binance API error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
          break;
        }
        
        const data = await response.json();
        
        console.log(`✅ Received ${data.length} candles in batch ${i + 1}`);
        
        if (!Array.isArray(data) || data.length === 0) {
          console.warn('⚠️ No more data available');
          break;
        }
        
        const candles: Candle[] = data.map((d: any[]) => ({
          time: d[0],
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));
        
        allCandles = [...candles, ...allCandles]; // Prepend older data
        endTime = candles[0].time - 1; // Get next batch ending before this batch
        
        console.log(`📈 Total candles so far: ${allCandles.length}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ getExtendedBinanceData complete: ${allCandles.length} total candles`);
      return allCandles;
    } catch (error) {
      console.error('❌ Error fetching extended Binance data:', error);
      // Fallback to short-term data
      console.log('🔄 Falling back to getBinanceData...');
      return this.getBinanceData(symbol, timeframe);
    }
  }

  private async getBinanceData(symbol: string, timeframe: string): Promise<Candle[]> {
    // Map timeframe to Binance interval
    const intervalMap: { [key: string]: string } = {
      '15m': '15m',
      '1H': '1h',
      '4H': '4h',
      '1D': '1d'
    };

    const interval = intervalMap[timeframe] || '1h';
    // Remove '/' from symbol (e.g., BTC/USDT -> BTCUSDT)
    const cleanSymbol = symbol.replace('/', '');

    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=500`);
      const data = await response.json();

      // Binance response format: [ [time, open, high, low, close, volume, ...], ... ]
      return data.map((d: any[]) => ({
        time: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));
    } catch (error) {
      console.error('Error fetching Binance data:', error);
      return [];
    }
  }

  /**
   * Generates realistic simulated historical data for Forex and Stocks
   * Uses a random walk model with volatility and trends
   */
  private generateSimulatedData(symbol: string, timeframe: string, marketType: 'forex' | 'crypto' | 'stocks'): Candle[] {
    // Calculate how many candles we need for ~2-3 years of data
    const intervalsPerYear: { [key: string]: number } = {
      '15m': 35040, // 4 candles per hour * 24 * 365
      '1H': 8760,   // 24 * 365
      '4H': 2190,   // 6 * 365
      '1D': 365     // 365
    };
    
    const candlesNeeded = Math.min(intervalsPerYear[timeframe] * 5, 50000); // 5 years, max 50k candles
    
    // Set initial price based on market type
    let basePrice = 1.10; // Default for forex
    let volatility = 0.0003; // Default volatility for forex (0.03%)
    
    if (marketType === 'stocks') {
      basePrice = 150; // Stock price around $150
      volatility = 0.015; // 1.5% volatility
    } else if (symbol.includes('USD/JPY') || symbol.includes('USDJPY')) {
      basePrice = 145;
      volatility = 0.0005;
    } else if (symbol.includes('GBP')) {
      basePrice = 1.27;
      volatility = 0.0004;
    } else if (symbol.includes('AUD') || symbol.includes('NZD')) {
      basePrice = 0.65;
      volatility = 0.0005;
    }
    
    const candles: Candle[] = [];
    const now = Date.now();
    
    // Calculate interval in milliseconds
    const intervalMs: { [key: string]: number } = {
      '15m': 15 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000
    };
    
    const interval = intervalMs[timeframe] || intervalMs['1H'];
    
    let currentPrice = basePrice;
    let trend = 0; // No initial trend
    
    for (let i = candlesNeeded - 1; i >= 0; i--) {
      const time = now - (i * interval);
      
      // Add some trending behavior (random walk with drift)
      if (Math.random() > 0.95) {
        trend = (Math.random() - 0.5) * volatility * 2; // Change trend occasionally
      }
      
      // Calculate price movement (random walk + trend)
      const change = (Math.random() - 0.5) * volatility * currentPrice + trend * currentPrice;
      const open = currentPrice;
      const close = currentPrice + change;
      
      // Generate high and low with realistic spread
      const high = Math.max(open, close) + Math.random() * volatility * 0.5 * currentPrice;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5 * currentPrice;
      
      // Generate volume (higher volume for stocks, lower for forex)
      const volume = marketType === 'stocks' 
        ? Math.floor(1000000 + Math.random() * 5000000)
        : Math.floor(100 + Math.random() * 900);
      
      candles.push({
        time,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    return candles;
  }
}
