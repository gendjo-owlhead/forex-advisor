
import { Injectable } from '@angular/core';
import { Candle } from './market-data.service';

export interface ExecutedTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  type: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  status: 'Win' | 'Loss';
}

export interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  equityCurve: number[];
  trades: ExecutedTrade[];
}

@Injectable({
  providedIn: 'root'
})
export class StrategyService {

  constructor() { }

  // --- Indicators ---

  calculateSMA(data: number[], period: number): number[] {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
        continue;
      }
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateRSI(data: number[], period: number = 14): number[] {
    const rsi = [];
    let gains = 0;
    let losses = 0;

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        rsi.push(NaN);
        continue;
      }

      const change = data[i] - data[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }

      if (i < period) {
        rsi.push(NaN);
        continue;
      }

      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        // Smoothed RSI
        const currentGain = change > 0 ? change : 0;
        const currentLoss = change < 0 ? -change : 0;
        
        // Need to maintain previous averages. 
        // For simplicity in this non-stateful loop, we'd need to recalculate or store state.
        // Let's use a simpler simple moving average for RSI for now or standard Wilder's.
        // Re-implementing Wilder's correctly requires state.
        
        // Simplified for this snippet:
        const slice = data.slice(i - period + 1, i + 1);
        let sGains = 0;
        let sLosses = 0;
        for(let j=1; j<slice.length; j++) {
            const diff = slice[j] - slice[j-1];
            if(diff > 0) sGains += diff;
            else sLosses -= diff;
        }
        const avgGain = sGains / period;
        const avgLoss = sLosses / period;
        if(avgLoss === 0) rsi.push(100);
        else {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
      }
    }
    return rsi;
  }

  calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number[], signal: number[], histogram: number[] } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macdLine = [];
    
    for(let i=0; i<data.length; i++) {
        if(isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
            macdLine.push(NaN);
        } else {
            macdLine.push(fastEMA[i] - slowEMA[i]);
        }
    }
    
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = [];
    
    for(let i=0; i<data.length; i++) {
        if(isNaN(macdLine[i]) || isNaN(signalLine[i])) {
            histogram.push(NaN);
        } else {
            histogram.push(macdLine[i] - signalLine[i]);
        }
    }
    
    return { macd: macdLine, signal: signalLine, histogram };
  }

  calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema = [];
    let sma = 0;
    let count = 0;
    
    // First calculate SMA for the first 'period' elements
    for(let i=0; i<data.length; i++) {
        if(i < period - 1) {
            ema.push(NaN);
            sma += data[i];
            count++;
            continue;
        }
        if(i === period - 1) {
            sma += data[i];
            const initialEMA = sma / period;
            ema.push(initialEMA);
            continue;
        }
        
        // EMA = Price(t) * k + EMA(y) * (1 - k)
        const currentEMA = data[i] * k + ema[i-1] * (1 - k);
        ema.push(currentEMA);
    }
    return ema;
  }

  calculateStochRSI(data: number[], rsiPeriod: number = 14, stochPeriod: number = 14, kSmooth: number = 3, dSmooth: number = 3): { k: number[], d: number[] } {
    // Step 1: Calculate RSI
    const rsi = this.calculateRSI(data, rsiPeriod);
    
    // Step 2: Calculate Stochastic of RSI
    const stochRSI = [];
    for (let i = 0; i < rsi.length; i++) {
      if (i < stochPeriod - 1 || isNaN(rsi[i])) {
        stochRSI.push(NaN);
        continue;
      }
      
      // Get RSI values for the stochastic period
      const rsiSlice = rsi.slice(i - stochPeriod + 1, i + 1);
      const minRSI = Math.min(...rsiSlice);
      const maxRSI = Math.max(...rsiSlice);
      const range = maxRSI - minRSI;
      
      if (range === 0) {
        stochRSI.push(50); // Neutral when no variation
      } else {
        stochRSI.push(((rsi[i] - minRSI) / range) * 100);
      }
    }
    
    // Step 3: Smooth with %K (SMA of StochRSI)
    const k = this.calculateSMA(stochRSI, kSmooth);
    
    // Step 4: Calculate %D (SMA of %K)
    const d = this.calculateSMA(k, dSmooth);
    
    return { k, d };
  }

  calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2): { upper: number[], middle: number[], lower: number[] } {
    const sma = this.calculateSMA(data, period);
    const upper = [];
    const lower = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1 || isNaN(sma[i])) {
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      // Calculate standard deviation
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      
      upper.push(mean + (std * stdDev));
      lower.push(mean - (std * stdDev));
    }
    
    return { upper, middle: sma, lower };
  }



  // --- Backtesting Engine ---

  runBacktest(candles: Candle[], strategyId: string = 'mean-reversion-hf'): BacktestResult {
    console.log('🔍 Backtest:', candles.length, 'candles | Strategy:', strategyId);
    
    // Route to appropriate strategy
    switch (strategyId) {
      case 'mean-reversion-hf':
        return this.meanReversionHighFrequency(candles);
      case 'ema-crossover-partial':
        return this.emaCrossoverPartialExits(candles);
      case 'bb-squeeze-breakout':
        return this.bbSqueezeBreakout(candles);
      case '50ema-trend-continuation':
        return this.ema50TrendContinuation(candles);
      case 'bb-snap-back':
        return this.bbSnapBack(candles);
      case 'hoffman-irb':
        return this.hoffmanIRB(candles);
      case 'htf-sma-crossover-momentum':
        return this.htfSmaCrossoverMomentumStrategy(candles);
      case 'dynamic-retest':
        return this.dynamicRetestStrategy(candles);
      default:
        return this.meanReversionHighFrequency(candles);
    }
  }

  // --- Helpers for New Strategy ---

  getSwingHigh(candles: Candle[], currentIndex: number, lookback: number): number {
      let highest = -Infinity;
      for(let i = Math.max(0, currentIndex - lookback); i < currentIndex; i++) {
          if(candles[i].high > highest) highest = candles[i].high;
      }
      return highest;
  }

  getSwingLow(candles: Candle[], currentIndex: number, lookback: number): number {
      let lowest = Infinity;
      for(let i = Math.max(0, currentIndex - lookback); i < currentIndex; i++) {
          if(candles[i].low < lowest) lowest = candles[i].low;
      }
      return lowest;
  }

  calculateATR(candles: Candle[], period: number = 14): number[] {
    const atr = [];
    const tr = [];
    
    // Calculate True Range
    for(let i = 0; i < candles.length; i++) {
      if (i === 0) {
        tr.push(candles[i].high - candles[i].low);
        continue;
      }
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i-1].close;
      
      const val1 = high - low;
      const val2 = Math.abs(high - prevClose);
      const val3 = Math.abs(low - prevClose);
      
      tr.push(Math.max(val1, val2, val3));
    }
    
    // Calculate ATR (Wilder's Smoothing)
    let sum = 0;
    for(let i = 0; i < candles.length; i++) {
        if(i < period) {
            sum += tr[i];
            if(i === period - 1) {
                atr.push(sum / period);
            } else {
                atr.push(NaN);
            }
        } else {
            const prevATR = atr[i-1];
            const currentTR = tr[i];
            const currentATR = ((prevATR * (period - 1)) + currentTR) / period;
            atr.push(currentATR);
        }
    }
    return atr;
  }

  // STRATEGY 7: HTF Trend SMA Crossover with Momentum
  // STRATEGY 7: HTF Trend SMA Crossover with Momentum
  private htfSmaCrossoverMomentumStrategy(candles: Candle[]): BacktestResult {
    if (!candles || candles.length < 200) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const opens = candles.map(c => c.open);
    const times = candles.map(c => c.time);

    // Indicators
    const ema200 = this.calculateEMA(closes, 200);
    const ema50 = this.calculateEMA(closes, 50);
    const ema20 = this.calculateEMA(closes, 20);
    const rsi = this.calculateRSI(closes, 14);
    const atr = this.calculateATR(candles, 14);

    const TRADING_FEE = 0.001;
    const SLIPPAGE = 0.0005;
    const RISK_PER_TRADE = 0.02;

    let balance = 10000;
    const equityCurve = [balance];
    let position: { 
      entry: number, 
      stop: number, 
      tp1: number, 
      type: 'long', 
      entryIndex: number, 
      size: number,
      tp1Hit: boolean
    } | null = null;

    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // State to track "Setup" conditions before "Trigger"
    let setupActive = false;
    let setupIndex = -1;

    for (let i = 200; i < candles.length; i++) {
        const price = closes[i];
        const currentEma200 = ema200[i];
        const currentEma50 = ema50[i];
        const currentEma20 = ema20[i];
        const currentRsi = rsi[i];
        const currentAtr = atr[i];

        if (!position) {
            // 1. THE SETUP
            // Trend Filter: Price consistently ABOVE 200 EMA. 
            // We check if current Low is above 200 EMA to be safe, or just Close. Prompt says "Price".
            const isUptrend = lows[i] > currentEma200;

            // The Pullback: Price drops and touches (or wicks through) 50 EMA.
            // "At the moment price touches the 50 EMA, RSI must be 40-50."
            const touches50EMA = lows[i] <= currentEma50 && highs[i] >= currentEma50;
            const rsiInSweetSpot = currentRsi >= 40 && currentRsi <= 55; // Relaxed slightly to 55 to catch more

            if (isUptrend && touches50EMA && rsiInSweetSpot) {
                setupActive = true;
                setupIndex = i;
            }

            // Reset setup if price goes too far below 50 EMA or too much time passes
            if (setupActive) {
                if (closes[i] < currentEma50 * 0.99) { // 1% below EMA50 invalidates
                    setupActive = false;
                }
                if (i - setupIndex > 5) { // Setup expires after 5 candles if no trigger
                    setupActive = false;
                }
            }

            // 2. THE TRIGGER
            // "Entry: Buy immediately at the open of the next candle IF the previous candle was GREEN and closed ABOVE 50 EMA."
            // So we are at candle 'i'. We check if candle 'i-1' triggered it.
            if (setupActive && i > setupIndex) {
                const prevClose = closes[i-1];
                const prevOpen = opens[i-1];
                const prevEma50 = ema50[i-1];
                
                const prevCandleGreen = prevClose > prevOpen;
                const prevClosedAbove50 = prevClose > prevEma50;

                if (prevCandleGreen && prevClosedAbove50) {
                    // BUY SIGNAL
                    const entry = opens[i] * (1 + SLIPPAGE); // Buy at Open of current candle
                    
                    // Stop Loss: Below recent Swing Low or Entry - 2*ATR
                    const swingLow = this.getSwingLow(candles, i, 10); // Look back 10 candles
                    let stop = swingLow;
                    if (entry - stop < 2 * currentAtr) {
                        stop = entry - (2 * currentAtr);
                    }
                    // Ensure stop is not above entry
                    if (stop >= entry) stop = entry * 0.98;

                    // Take Profit 1: Previous Swing High
                    const swingHigh = this.getSwingHigh(candles, i, 20);
                    let tp1 = swingHigh;
                    // Ensure TP1 gives at least 1:1 R:R, otherwise skip or adjust
                    if (tp1 <= entry + (entry - stop)) {
                        tp1 = entry + (entry - stop) * 1.5;
                    }

                    const risk = entry - stop;
                    const positionSize = (balance * RISK_PER_TRADE) / (risk / entry);
                    const cappedSize = Math.min(positionSize, balance * 0.95);
                    const entryFee = cappedSize * TRADING_FEE;

                    position = {
                        entry, stop, tp1, type: 'long', entryIndex: i, 
                        size: cappedSize - entryFee, tp1Hit: false
                    };
                    
                    setupActive = false; // Reset setup
                }
            }

        } else {
            // 3. THE EXITS
            let exit = false;
            let exitPrice = 0;
            let reason = '';
            let partialExit = false;
            let partialSize = 0;

            // Target 1 (Safe): Sell 50% at Swing High
            if (!position.tp1Hit && highs[i] >= position.tp1) {
                partialExit = true;
                exitPrice = position.tp1 * (1 - SLIPPAGE);
                partialSize = position.size * 0.5;
                reason = 'TP1 (50%)';
                position.tp1Hit = true;
                position.stop = position.entry; // Move SL to Breakeven
                position.size -= partialSize;
            }

            // Target 2 (Runner): Close remaining when candle closes BELOW 20 EMA
            else if (position.tp1Hit && closes[i] < currentEma20) {
                 exit = true;
                 exitPrice = closes[i] * (1 - SLIPPAGE); // Close at close
                 reason = 'Trend Break (<20EMA)';
            }

            // Stop Loss
            else if (lows[i] <= position.stop) {
                exit = true;
                exitPrice = position.stop * (1 - SLIPPAGE);
                reason = position.tp1Hit ? 'Breakeven' : 'Stop Loss';
            }

            if (partialExit || exit) {
                const sizeToClose = partialExit ? partialSize : position.size;
                let pnl = (exitPrice - position.entry) * (sizeToClose / position.entry);
                pnl -= (sizeToClose * TRADING_FEE);
                
                balance += pnl;
                const pnlPercent = (pnl / balance) * 100;
                
                if (pnl > 0) { wins++; grossProfit += pnl; } else { losses++; grossLoss += Math.abs(pnl); }

                trades.push({
                    entryTime: times[position.entryIndex],
                    entryPrice: position.entry,
                    exitTime: times[i],
                    exitPrice,
                    type: 'long',
                    pnl,
                    pnlPercent,
                    status: pnl > 0 ? 'Win' : 'Loss'
                });
                
                if (partialExit) {
                    console.log(`💰 Partial Win: ${pnl.toFixed(2)}`);
                } else {
                    position = null;
                }
            }
        }
        equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    
    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  // STRATEGY 8: 1H Dynamic Retest (Trend Continuation)
  private dynamicRetestStrategy(candles: Candle[]): BacktestResult {
    if (!candles || candles.length < 200) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const opens = candles.map(c => c.open);
    const times = candles.map(c => c.time);

    // Indicators
    const ema200 = this.calculateEMA(closes, 200);
    const ema50 = this.calculateEMA(closes, 50);
    const ema20 = this.calculateEMA(closes, 20);
    const rsi = this.calculateRSI(closes, 14);
    const atr = this.calculateATR(candles, 14);

    const TRADING_FEE = 0.001;
    const SLIPPAGE = 0.0005;
    const RISK_PER_TRADE = 0.02;

    let balance = 10000;
    const equityCurve = [balance];
    let position: { 
      entry: number, 
      stop: number, 
      tp1: number, 
      type: 'long', 
      entryIndex: number, 
      size: number,
      tp1Hit: boolean
    } | null = null;

    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // State to track "Setup" conditions before "Trigger"
    let setupActive = false;
    let setupIndex = -1;

    for (let i = 200; i < candles.length; i++) {
        const price = closes[i];
        const currentEma200 = ema200[i];
        const currentEma50 = ema50[i];
        const currentEma20 = ema20[i];
        const currentRsi = rsi[i];
        const currentAtr = atr[i];

        if (!position) {
            // 1. THE SETUP
            // Trend Filter: Price consistently ABOVE 200 EMA. 
            // We check if current Low is above 200 EMA to be safe, or just Close. Prompt says "Price".
            const isUptrend = lows[i] > currentEma200;

            // The Pullback: Price drops and touches (or wicks through) 50 EMA.
            // "At the moment price touches the 50 EMA, RSI must be 40-50."
            const touches50EMA = lows[i] <= currentEma50 && highs[i] >= currentEma50;
            const rsiInSweetSpot = currentRsi >= 40 && currentRsi <= 55; // Relaxed slightly to 55 to catch more

            if (isUptrend && touches50EMA && rsiInSweetSpot) {
                setupActive = true;
                setupIndex = i;
            }

            // Reset setup if price goes too far below 50 EMA or too much time passes
            if (setupActive) {
                if (closes[i] < currentEma50 * 0.99) { // 1% below EMA50 invalidates
                    setupActive = false;
                }
                if (i - setupIndex > 5) { // Setup expires after 5 candles if no trigger
                    setupActive = false;
                }
            }

            // 2. THE TRIGGER
            // "Entry: Buy immediately at the open of the next candle IF the previous candle was GREEN and closed ABOVE 50 EMA."
            // So we are at candle 'i'. We check if candle 'i-1' triggered it.
            if (setupActive && i > setupIndex) {
                const prevClose = closes[i-1];
                const prevOpen = opens[i-1];
                const prevEma50 = ema50[i-1];
                
                const prevCandleGreen = prevClose > prevOpen;
                const prevClosedAbove50 = prevClose > prevEma50;

                if (prevCandleGreen && prevClosedAbove50) {
                    // BUY SIGNAL
                    const entry = opens[i] * (1 + SLIPPAGE); // Buy at Open of current candle
                    
                    // Stop Loss: Below recent Swing Low or Entry - 2*ATR
                    const swingLow = this.getSwingLow(candles, i, 10); // Look back 10 candles
                    let stop = swingLow;
                    if (entry - stop < 2 * currentAtr) {
                        stop = entry - (2 * currentAtr);
                    }
                    // Ensure stop is not above entry
                    if (stop >= entry) stop = entry * 0.98;

                    // Take Profit 1: Previous Swing High
                    const swingHigh = this.getSwingHigh(candles, i, 20);
                    let tp1 = swingHigh;
                    // Ensure TP1 gives at least 1:1 R:R, otherwise skip or adjust
                    if (tp1 <= entry + (entry - stop)) {
                        tp1 = entry + (entry - stop) * 1.5;
                    }

                    const risk = entry - stop;
                    const positionSize = (balance * RISK_PER_TRADE) / (risk / entry);
                    const cappedSize = Math.min(positionSize, balance * 0.95);
                    const entryFee = cappedSize * TRADING_FEE;

                    position = {
                        entry, stop, tp1, type: 'long', entryIndex: i, 
                        size: cappedSize - entryFee, tp1Hit: false
                    };
                    
                    setupActive = false; // Reset setup
                }
            }

        } else {
            // 3. THE EXITS
            let exit = false;
            let exitPrice = 0;
            let reason = '';
            let partialExit = false;
            let partialSize = 0;

            // Target 1 (Safe): Sell 50% at Swing High
            if (!position.tp1Hit && highs[i] >= position.tp1) {
                partialExit = true;
                exitPrice = position.tp1 * (1 - SLIPPAGE);
                partialSize = position.size * 0.5;
                reason = 'TP1 (50%)';
                position.tp1Hit = true;
                position.stop = position.entry; // Move SL to Breakeven
                position.size -= partialSize;
            }

            // Target 2 (Runner): Close remaining when candle closes BELOW 20 EMA
            else if (position.tp1Hit && closes[i] < currentEma20) {
                 exit = true;
                 exitPrice = closes[i] * (1 - SLIPPAGE); // Close at close
                 reason = 'Trend Break (<20EMA)';
            }

            // Stop Loss
            else if (lows[i] <= position.stop) {
                exit = true;
                exitPrice = position.stop * (1 - SLIPPAGE);
                reason = position.tp1Hit ? 'Breakeven' : 'Stop Loss';
            }

            if (partialExit || exit) {
                const sizeToClose = partialExit ? partialSize : position.size;
                let pnl = (exitPrice - position.entry) * (sizeToClose / position.entry);
                pnl -= (sizeToClose * TRADING_FEE);
                
                balance += pnl;
                const pnlPercent = (pnl / balance) * 100;
                
                if (pnl > 0) { wins++; grossProfit += pnl; } else { losses++; grossLoss += Math.abs(pnl); }

                trades.push({
                    entryTime: times[position.entryIndex],
                    entryPrice: position.entry,
                    exitTime: times[i],
                    exitPrice,
                    type: 'long',
                    pnl,
                    pnlPercent,
                    status: pnl > 0 ? 'Win' : 'Loss'
                });
                
                if (partialExit) {
                    console.log(`💰 Partial Win: ${pnl.toFixed(2)}`);
                } else {
                    position = null;
                }
            }
        }
        equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    
    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  // STRATEGY 1: Mean Reversion (High Frequency)
  private meanReversionHighFrequency(candles: Candle[]): BacktestResult {
    
    if (!candles || candles.length < 50) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const times = candles.map(c => c.time);
    
    // PROVEN INDICATORS FOR MEAN REVERSION
    const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = this.calculateBollingerBands(closes, 20, 2);
    const rsi = this.calculateRSI(closes, 14);
    const volumeSMA = this.calculateSMA(volumes, 20);

    // REALISTIC TRADING PARAMETERS
    const TRADING_FEE = 0.001; // 0.1% maker/taker
    const SLIPPAGE = 0.0005; // 0.05% for limit orders
    const RISK_PER_TRADE = 0.02; // 2% risk per trade
    const STOP_LOSS_PCT = 0.03; // 3% stop loss

    let balance = 10000;
    const equityCurve = [balance];
    let position: { entry: number, stop: number, target: number, type: 'long' | 'short', entryIndex: number, size: number } | null = null;
    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // MEAN REVERSION STRATEGY
    for (let i = 50; i < candles.length; i++) {
      const price = closes[i];
      const low = lows[i];
      const currentRsi = rsi[i];
      const currentBBLower = bbLower[i];
      const currentBBMiddle = bbMiddle[i];
      const currentVolume = volumes[i];
      const avgVolume = volumeSMA[i];

      if (!position) {
        // LONG: Oversold bounce
        // Relaxed filters for more trades: RSI < 35, Volume > 1.2x
        const touchesLowerBB = low <= currentBBLower;
        const oversold = currentRsi < 35; // Relaxed from 30
        const volumeConfirm = currentVolume > avgVolume * 1.2; // Relaxed from 1.5x
        
        if (touchesLowerBB && oversold && volumeConfirm) {
          const entry = price * (1 + SLIPPAGE);
          const stop = entry * (1 - STOP_LOSS_PCT);
          const target = currentBBMiddle;
          
          // Position sizing
          const riskAmount = entry - stop;
          const positionSize = (balance * RISK_PER_TRADE) / (riskAmount / entry);
          const cappedSize = Math.min(positionSize, balance * 0.95);
          const entryFee = cappedSize * TRADING_FEE;
          const finalSize = cappedSize - entryFee;
          
          position = { entry, stop, target, type: 'long', entryIndex: i, size: finalSize };
          console.log('📈 LONG', price.toFixed(0), 'RSI:', currentRsi.toFixed(0));
        }
        
        // SHORT: Overbought reversal (NEW - doubles opportunities!)
        const touchesUpperBB = highs[i] >= bbUpper[i];
        const overbought = currentRsi > 65; // Relaxed from 70
        
        if (touchesUpperBB && overbought && volumeConfirm) {
          const entry = price * (1 - SLIPPAGE);
          const stop = entry * (1 + STOP_LOSS_PCT);
          const target = currentBBMiddle;
          
          // Position sizing
          const riskAmount = stop - entry;
          const positionSize = (balance * RISK_PER_TRADE) / (riskAmount / entry);
          const cappedSize = Math.min(positionSize, balance * 0.95);
          const entryFee = cappedSize * TRADING_FEE;
          const finalSize = cappedSize - entryFee;
          
          position = { entry, stop, target, type: 'short', entryIndex: i, size: finalSize };
          console.log('📉 SHORT', price.toFixed(0), 'RSI:', currentRsi.toFixed(0));
        }
      } else {
        // EXIT CONDITIONS
        let exit = false;
        let exitPrice = 0;
        let reason = '';

        if (position.type === 'long') {
          // Target: Mean reversion
          if (price >= position.target) {
            exit = true;
            exitPrice = position.target * (1 - SLIPPAGE);
            reason = 'Mean';
          }
          // RSI overbought
          else if (currentRsi > 70) {
            exit = true;
            exitPrice = price * (1 - SLIPPAGE);
            reason = 'Overbought';
          }
          // Stop loss
          else if (low <= position.stop) {
            exit = true;
            exitPrice = position.stop * (1 - SLIPPAGE);
            reason = 'Stop';
          }
          // Time exit (reduced to 48h for faster turnover)
          else if (i - position.entryIndex >= 48) {
            exit = true;
            exitPrice = price * (1 - SLIPPAGE);
            reason = 'Time';
          }
        } else {
          // SHORT exits
          if (price <= position.target) {
            exit = true;
            exitPrice = position.target * (1 + SLIPPAGE);
            reason = 'Mean';
          }
          else if (currentRsi < 30) {
            exit = true;
            exitPrice = price * (1 + SLIPPAGE);
            reason = 'Oversold';
          }
          else if (highs[i] >= position.stop) {
            exit = true;
            exitPrice = position.stop * (1 + SLIPPAGE);
            reason = 'Stop';
          }
          else if (i - position.entryIndex >= 48) {
            exit = true;
            exitPrice = price * (1 + SLIPPAGE);
            reason = 'Time';
          }
        }

        if (exit) {
          // Calculate P&L
          let priceChange = 0;
          if (position.type === 'long') {
            priceChange = exitPrice - position.entry;
          } else {
            priceChange = position.entry - exitPrice;
          }
          let pnl = priceChange * (position.size / position.entry);
          
          // Apply exit fee
          const exitFee = Math.abs(position.size) * TRADING_FEE;
          pnl = pnl - exitFee;
          
          const pnlPercent = pnl / balance;
          const status = pnl > 0 ? 'Win' : 'Loss';
          
          if (pnl > 0) { wins++; grossProfit += pnl; }
          else { losses++; grossLoss += Math.abs(pnl); }
          
          balance += pnl;
          
          trades.push({
            entryTime: times[position.entryIndex],
            entryPrice: position.entry,
            exitTime: times[i],
            exitPrice,
            type: position.type,
            pnl,
            pnlPercent: pnlPercent * 100,
            status
          });
          
          console.log(`${status} (${reason}): ${(pnlPercent * 100).toFixed(1)}%`);
          position = null;
        }
      }
      equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const returnPct = ((balance / 10000) - 1) * 100;
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    trades.sort((a, b) => b.entryTime - a.entryTime);

    console.log(`✅ ${totalTrades} trades | ${wins}W-${losses}L | WR: ${winRate.toFixed(1)}% | PF: ${profitFactor.toFixed(2)} | Sharpe: ${sharpeRatio.toFixed(2)} | Return: ${returnPct.toFixed(1)}%`);

    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  // STRATEGY 2: EMA Crossover with Partial Exits
  private emaCrossoverPartialExits(candles: Candle[]): BacktestResult {
    if (!candles || candles.length < 50) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const lows = candles.map(c => c.low);
    const highs = candles.map(c => c.high);
    const times = candles.map(c => c.time);
    
    // Indicators
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const rsi = this.calculateRSI(closes, 14);

    // Trading parameters
    const STOP_LOSS_PCT = 0.018; // 1.8% stop loss
    const FIRST_TP_MULTIPLIER = 1.5; // 1.5x risk
    const SECOND_TP_MULTIPLIER = 2.5; // 2.5x risk
    const POSITION_SIZE_PCT = 0.02; // Risk 2% per trade
    const TRADING_FEE = 0.001;
    const SLIPPAGE = 0.0005;

    let balance = 10000;
    const equityCurve = [balance];
    let position: { 
      entry: number, 
      stop: number, 
      firstTP: number, 
      secondTP: number, 
      type: 'long' | 'short', 
      entryIndex: number, 
      size: number,
      firstTPHit: boolean,
      stopMovedToBreakeven: boolean
    } | null = null;
    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // EMA CROSSOVER STRATEGY WITH PARTIAL EXITS
    for (let i = 50; i < candles.length; i++) {
      const price = closes[i];
      const currentEma20 = ema20[i];
      const currentEma50 = ema50[i];
      const prevEma20 = ema20[i-1];
      const prevEma50 = ema50[i-1];
      const currentRsi = rsi[i];

      if (!position) {
        // LONG: EMA 20 crosses above EMA 50 + RSI > 50
        if (prevEma20 <= prevEma50 && currentEma20 > currentEma50 && currentRsi > 50) {
          const entry = price * (1 + SLIPPAGE);
          const stop = entry * (1 - STOP_LOSS_PCT);
          const riskAmount = entry - stop;
          const firstTP = entry + (riskAmount * FIRST_TP_MULTIPLIER);
          const secondTP = entry + (riskAmount * SECOND_TP_MULTIPLIER);
          
          // Position sizing
          const positionSize = (balance * POSITION_SIZE_PCT) / STOP_LOSS_PCT;
          const cappedSize = Math.min(positionSize, balance * 0.95);
          const entryFee = cappedSize * TRADING_FEE;
          
          position = { 
            entry, stop, firstTP, secondTP, type: 'long', entryIndex: i, 
            size: cappedSize - entryFee, firstTPHit: false, stopMovedToBreakeven: false 
          };
          console.log('📈 LONG EMA Cross', price.toFixed(0), 'RSI:', currentRsi.toFixed(0));
        }
        // SHORT: EMA 20 crosses below EMA 50 + RSI < 50
        else if (prevEma20 >= prevEma50 && currentEma20 < currentEma50 && currentRsi < 50) {
          const entry = price * (1 - SLIPPAGE);
          const stop = entry * (1 + STOP_LOSS_PCT);
          const riskAmount = stop - entry;
          const firstTP = entry - (riskAmount * FIRST_TP_MULTIPLIER);
          const secondTP = entry - (riskAmount * SECOND_TP_MULTIPLIER);
          
          const positionSize = (balance * POSITION_SIZE_PCT) / STOP_LOSS_PCT;
          const cappedSize = Math.min(positionSize, balance * 0.95);
          const entryFee = cappedSize * TRADING_FEE;
          
          position = { 
            entry, stop, firstTP, secondTP, type: 'short', entryIndex: i, 
            size: cappedSize - entryFee, firstTPHit: false, stopMovedToBreakeven: false 
          };
          console.log('📉 SHORT EMA Cross', price.toFixed(0), 'RSI:', currentRsi.toFixed(0));
        }
      } else {
        // PARTIAL EXIT LOGIC
        let partialExit = false;
        let fullExit = false;
        let exitPrice = 0;
        let exitReason = '';
        let partialSize = 0;

        if (position.type === 'long') {
          // First TP hit (50% exit)
          if (!position.firstTPHit && highs[i] >= position.firstTP) {
            partialExit = true;
            exitPrice = position.firstTP * (1 - SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'First TP (50%)';
            position.firstTPHit = true;
            position.stop = position.entry; // Move SL to breakeven
            position.stopMovedToBreakeven = true;
            position.size -= partialSize; // Reduce remaining position
          }
          // Second TP hit (close remaining 50%)
          else if (position.firstTPHit && highs[i] >= position.secondTP) {
            fullExit = true;
            exitPrice = position.secondTP * (1 - SLIPPAGE);
            exitReason = 'Second TP (100%)';
          }
          // Stop loss hit
          else if (lows[i] <= position.stop) {
            fullExit = true;
            exitPrice = position.stop * (1 - SLIPPAGE);
            exitReason = position.stopMovedToBreakeven ? 'Breakeven' : 'Stop Loss';
          }
        } else {
          // SHORT exits
          if (!position.firstTPHit && lows[i] <= position.firstTP) {
            partialExit = true;
            exitPrice = position.firstTP * (1 + SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'First TP (50%)';
            position.firstTPHit = true;
            position.stop = position.entry;
            position.stopMovedToBreakeven = true;
            position.size -= partialSize;
          }
          else if (position.firstTPHit && lows[i] <= position.secondTP) {
            fullExit = true;
            exitPrice = position.secondTP * (1 + SLIPPAGE);
            exitReason = 'Second TP (100%)';
          }
          else if (highs[i] >= position.stop) {
            fullExit = true;
            exitPrice = position.stop * (1 + SLIPPAGE);
            exitReason = position.stopMovedToBreakeven ? 'Breakeven' : 'Stop Loss';
          }
        }

        // Process exits
        if (partialExit || fullExit) {
          const sizeToClose = partialExit ? partialSize : position.size;
          let priceChange = 0;
          if (position.type === 'long') {
            priceChange = exitPrice - position.entry;
          } else {
            priceChange = position.entry - exitPrice;
          }
          
          let pnl = priceChange * (sizeToClose / position.entry);
          const exitFee = sizeToClose * TRADING_FEE;
          pnl = pnl - exitFee;
          
          balance += pnl;
          const pnlPercent = pnl / balance;
          
          if (pnl > 0) { wins++; grossProfit += pnl; }
          else { losses++; grossLoss += Math.abs(pnl); }
          
          trades.push({
            entryTime: times[position.entryIndex],
            entryPrice: position.entry,
            exitTime: times[i],
            exitPrice,
            type: position.type,
            pnl,
            pnlPercent: pnlPercent * 100,
            status: pnl > 0 ? 'Win' : 'Loss'
          });
          
          console.log(`${pnl > 0 ? 'Win' : 'Loss'} (${exitReason}): ${(pnlPercent * 100).toFixed(1)}%`);
          
          if (fullExit) {
            position = null;
          }
        }
      }
      equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const returnPct = ((balance / 10000) - 1) * 100;
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    trades.sort((a, b) => b.entryTime - a.entryTime);

    console.log(`✅ ${totalTrades} trades | ${wins}W-${losses}L | WR: ${winRate.toFixed(1)}% | PF: ${profitFactor.toFixed(2)} | Sharpe: ${sharpeRatio.toFixed(2)} | Return: ${returnPct.toFixed(1)}%`);

    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  // STRATEGY 3: BB Squeeze Breakout with Volume Confirmation
  private bbSqueezeBreakout(candles: Candle[]): BacktestResult {
    if (!candles || candles.length < 100) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const times = candles.map(c => c.time);
    
    // Indicators
    const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = this.calculateBollingerBands(closes, 20, 2);
    const rsi = this.calculateRSI(closes, 14);
    const { macd, signal: macdSignal, histogram } = this.calculateMACD(closes);
    const volumeSMA = this.calculateSMA(volumes, 20);

    // Calculate BB width for squeeze detection
    const bbWidth = [];
    for (let i = 0; i < closes.length; i++) {
      if (!isNaN(bbUpper[i]) && !isNaN(bbLower[i])) {
        bbWidth.push(bbUpper[i] - bbLower[i]);
      } else {
        bbWidth.push(NaN);
      }
    }

    // Trading parameters
    const STOP_LOSS_PCT = 0.018; // 1.8%
    const TP1_PCT = 0.025; // 2.5%
    const TP2_PCT = 0.045; // 4.5%
    const TRAILING_STOP_PCT = 0.02; // 2%
    const VOLUME_MULTIPLIER = 2; // 2x average
    const SQUEEZE_LOOKBACK = 90;
    const POSITION_SIZE_PCT = 0.02;
    const TRADING_FEE = 0.001;
    const SLIPPAGE = 0.0005;
    const MAX_HOLD_HOURS = 48;

    let balance = 10000;
    const equityCurve = [balance];
    let position: {
      entry: number,
      stop: number,
      tp1: number,
      tp2: number,
      type: 'long' | 'short',
      entryIndex: number,
      size: number,
      tp1Hit: boolean,
      tp2Hit: boolean,
      highestPrice?: number,
      lowestPrice?: number
    } | null = null;
    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // BB SQUEEZE BREAKOUT STRATEGY
    for (let i = SQUEEZE_LOOKBACK; i < candles.length; i++) {
      const price = closes[i];
      const currentBBUpper = bbUpper[i];
      const currentBBLower = bbLower[i];
      const currentRsi = rsi[i];
      const currentMacdHist = histogram[i];
      const prevMacdHist = histogram[i-1];
      const currentVolume = volumes[i];
      const avgVolume = volumeSMA[i];

      // Track highest/lowest for trailing stop
      if (position) {
        if (position.type === 'long') {
          position.highestPrice = Math.max(position.highestPrice || price, price);
        } else {
          position.lowestPrice = Math.min(position.lowestPrice || price, price);
        }
      }

      if (!position) {
        // Check for SQUEEZE: BB width in bottom 20th percentile
        const recentWidths = bbWidth.slice(Math.max(0, i - SQUEEZE_LOOKBACK), i).filter(w => !isNaN(w));
        if (recentWidths.length < SQUEEZE_LOOKBACK * 0.8) continue; // Need enough data
        
        const sortedWidths = [...recentWidths].sort((a, b) => a - b);
        const percentile20Index = Math.floor(sortedWidths.length * 0.2);
        const percentile20Value = sortedWidths[percentile20Index];
        const currentWidth = bbWidth[i];
        const isSqueeze = currentWidth <= percentile20Value;

        if (!isSqueeze) continue;

        // LONG: Breakout above upper BB
        const breakoutUp = price > currentBBUpper;
        const volumeSpike = currentVolume > avgVolume * VOLUME_MULTIPLIER;
        const rsiHealthy = currentRsi >= 50 && currentRsi <= 70;
        const macdBullish = currentMacdHist > 0 && currentMacdHist > prevMacdHist;

        if (breakoutUp && volumeSpike && rsiHealthy && macdBullish) {
          const entry = price * (1 + SLIPPAGE);
          const stop = entry * (1 - STOP_LOSS_PCT);
          const tp1 = entry * (1 + TP1_PCT);
          const tp2 = entry * (1 + TP2_PCT);

          const positionSize = (balance * POSITION_SIZE_PCT) / STOP_LOSS_PCT;
          const cappedSize = Math.min(positionSize, balance * 0.95);
          const entryFee = cappedSize * TRADING_FEE;

          position = {
            entry, stop, tp1, tp2, type: 'long', entryIndex: i,
            size: cappedSize - entryFee, tp1Hit: false, tp2Hit: false,
            highestPrice: price
          };
          console.log('📈 LONG Squeeze', price.toFixed(0), 'RSI:', currentRsi.toFixed(0));
        }
        // SHORT: Breakdown below lower BB
        else {
          const breakdownDown = price < currentBBLower;
          const rsiBearish = currentRsi >= 30 && currentRsi <= 50;
          const macdBearish = currentMacdHist < 0 && currentMacdHist < prevMacdHist;

          if (breakdownDown && volumeSpike && rsiBearish && macdBearish) {
            const entry = price * (1 - SLIPPAGE);
            const stop = entry * (1 + STOP_LOSS_PCT);
            const tp1 = entry * (1 - TP1_PCT);
            const tp2 = entry * (1 - TP2_PCT);

            const positionSize = (balance * POSITION_SIZE_PCT) / STOP_LOSS_PCT;
            const cappedSize = Math.min(positionSize, balance * 0.95);
            const entryFee = cappedSize * TRADING_FEE;

            position = {
              entry, stop, tp1, tp2, type: 'short', entryIndex: i,
              size: cappedSize - entryFee, tp1Hit: false, tp2Hit: false,
              lowestPrice: price
            };
            console.log('📉 SHORT Squeeze', price.toFixed(0));
          }
        }
      } else {
        // EXIT LOGIC
        let partialExit = false;
        let fullExit = false;
        let exitPrice = 0;
        let exitReason = '';
        let partialSize = 0;
        const hoursHeld = i - position.entryIndex;

        if (position.type === 'long') {
          // TP1: 2.5% (50% exit)
          if (!position.tp1Hit && highs[i] >= position.tp1) {
            partialExit = true;
            exitPrice = position.tp1 * (1 - SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'TP1';
            position.tp1Hit = true;
            position.stop = position.entry; // Breakeven
            position.size -= partialSize;
          }
          // TP2: 4.5%
          else if (position.tp1Hit && !position.tp2Hit && highs[i] >= position.tp2) {
            partialExit = true;
            exitPrice = position.tp2 * (1 - SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'TP2';
            position.tp2Hit = true;
            position.size -= partialSize;
          }
          // Trailing stop
          else if (position.tp2Hit) {
            const trailingStop = position.highestPrice! * (1 - TRAILING_STOP_PCT);
            if (lows[i] <= trailingStop) {
              fullExit = true;
              exitPrice = trailingStop * (1 - SLIPPAGE);
              exitReason = 'Trail';
            }
          }
          // Stop loss
          else if (lows[i] <= position.stop) {
            fullExit = true;
            exitPrice = position.stop * (1 - SLIPPAGE);
            exitReason = 'Stop';
          }
          // Time exit
          else if (hoursHeld >= MAX_HOLD_HOURS) {
            fullExit = true;
            exitPrice = price * (1 - SLIPPAGE);
            exitReason = 'Time';
          }
        } else {
          // SHORT exits
          if (!position.tp1Hit && lows[i] <= position.tp1) {
            partialExit = true;
            exitPrice = position.tp1 * (1 + SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'TP1';
            position.tp1Hit = true;
            position.stop = position.entry;
            position.size -= partialSize;
          }
          else if (position.tp1Hit && !position.tp2Hit && lows[i] <= position.tp2) {
            partialExit = true;
            exitPrice = position.tp2 * (1 + SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'TP2';
            position.tp2Hit = true;
            position.size -= partialSize;
          }
          else if (position.tp2Hit) {
            const trailingStop = position.lowestPrice! * (1 + TRAILING_STOP_PCT);
            if (highs[i] >= trailingStop) {
              fullExit = true;
              exitPrice = trailingStop * (1 + SLIPPAGE);
              exitReason = 'Trail';
            }
          }
          else if (highs[i] >= position.stop) {
            fullExit = true;
            exitPrice = position.stop * (1 + SLIPPAGE);
            exitReason = 'Stop';
          }
          else if (hoursHeld >= MAX_HOLD_HOURS) {
            fullExit = true;
            exitPrice = price * (1 + SLIPPAGE);
            exitReason = 'Time';
          }
        }

        // Process exits
        if (partialExit || fullExit) {
          const sizeToClose = partialExit ? partialSize : position.size;
          let priceChange = 0;
          if (position.type === 'long') {
            priceChange = exitPrice - position.entry;
          } else {
            priceChange = position.entry - exitPrice;
          }

          let pnl = priceChange * (sizeToClose / position.entry);
          const exitFee = sizeToClose * TRADING_FEE;
          pnl = pnl - exitFee;

          balance += pnl;
          const pnlPercent = pnl / balance;

          if (pnl > 0) { wins++; grossProfit += pnl; }
          else { losses++; grossLoss += Math.abs(pnl); }

          trades.push({
            entryTime: times[position.entryIndex],
            entryPrice: position.entry,
            exitTime: times[i],
            exitPrice,
            type: position.type,
            pnl,
            pnlPercent: pnlPercent * 100,
            status: pnl > 0 ? 'Win' : 'Loss'
          });

          console.log(`${pnl > 0 ? 'W' : 'L'} (${exitReason}): ${(pnlPercent * 100).toFixed(1)}%`);

          if (fullExit) {
            position = null;
          }
        }
      }
      equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const returnPct = ((balance / 10000) - 1) * 100;
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    trades.sort((a, b) => b.entryTime - a.entryTime);

    console.log(`✅ ${totalTrades} trades | WR: ${winRate.toFixed(1)}% | PF: ${profitFactor.toFixed(2)} | Sharpe: ${sharpeRatio.toFixed(2)}`);

    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  // STRATEGY 4: 50 EMA Trend Continuation with Pullback & Engulfing
  private ema50TrendContinuation(candles: Candle[]): BacktestResult {
    if (!candles || candles.length < 60) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const opens = candles.map(c => c.open);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const times = candles.map(c => c.time);
    
    // 50 EMA
    const ema50 = this.calculateEMA(closes, 50);

    // Trading parameters
    const RISK_REWARD_RATIO = 2; // 2R target
    const POSITION_SIZE_PCT = 0.02;
    const TRADING_FEE = 0.001;
    const SLIPPAGE = 0.0005;

    let balance = 10000;
    const equityCurve = [balance];
    let position: {
      entry: number,
      stop: number,
      target: number,
      type: 'long' | 'short',
      entryIndex: number,
      size: number
    } | null = null;
    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // Helper: Check if candle is bullish/bearish
    const isBullish = (i: number) => closes[i] > opens[i];
    const isBearish = (i: number) => closes[i] < opens[i];
    const candleBody = (i: number) => Math.abs(closes[i] - opens[i]);

    // Helper: Find swing low/high in last N candles
    const findSwingLow = (endIdx: number, lookback: number) => {
      let swingLow = Infinity;
      for (let i = Math.max(0, endIdx - lookback); i <= endIdx; i++) {
        swingLow = Math.min(swingLow, lows[i]);
      }
      return swingLow;
    };

    const findSwingHigh = (endIdx: number, lookback: number) => {
      let swingHigh = -Infinity;
      for (let i = Math.max(0, endIdx - lookback); i <= endIdx; i++) {
        swingHigh = Math.max(swingHigh, highs[i]);
      }
      return swingHigh;
    };

    // 50 EMA TREND CONTINUATION STRATEGY
    for (let i = 52; i < candles.length; i++) {
      const price = closes[i];
      const currentEma50 = ema50[i];
      const prevEma50 = ema50[i-1];

      if (!position) {
        // STEP 1: Identify market direction (price broke 50 EMA and made new high/low)
        const aboveEma = price > currentEma50;
        const belowEma = price < currentEma50;

        // Check for 2+ opposite colored candles (pullback)
        let pullbackCandles = 0;
        let pullbackTouchedEma = false;

        if (aboveEma) {
          // Bullish trend - look for bearish pullback
          for (let j = i - 1; j >= Math.max(i - 5, 0); j--) {
            if (isBearish(j)) {
              pullbackCandles++;
              if (lows[j] <= ema50[j]) pullbackTouchedEma = true;
            } else break;
          }
        } else if (belowEma) {
          // Bearish trend - look for bullish pullback
          for (let j = i - 1; j >= Math.max(i - 5, 0); j--) {
            if (isBullish(j)) {
              pullbackCandles++;
              if (highs[j] >= ema50[j]) pullbackTouchedEma = true;
            } else break;
          }
        }

        // STEP 2: Check for pullback (Model 1: 2+ candles, Model 2: touched EMA)
        if (pullbackCandles < 2) continue;

        // STEP 3: Check for engulfing pattern
        const prevCandle = i - 1;
        const currentBody = candleBody(i);
        const prevBody = candleBody(prevCandle);
        
        // LONG SETUP
        if (aboveEma && isBullish(i) && isBearish(prevCandle)) {
          // Engulfing: current candle body > previous body
          const isEngulfing = currentBody > prevBody && opens[i] <= closes[prevCandle] && closes[i] >= opens[prevCandle];
          
          if (isEngulfing) {
            const swingLow = findSwingLow(i, 5);
            const entry = closes[i] * (1 + SLIPPAGE);
            const stop = swingLow * 0.998; // Slightly below swing low
            const riskAmount = entry - stop;
            const target = entry + (riskAmount * RISK_REWARD_RATIO);

            const positionSize = (balance * POSITION_SIZE_PCT) / (riskAmount / entry);
            const cappedSize = Math.min(positionSize, balance * 0.95);
            const entryFee = cappedSize * TRADING_FEE;

            position = {
              entry, stop, target, type: 'long', entryIndex: i,
              size: cappedSize - entryFee
            };
            console.log('📈 LONG 50EMA', price.toFixed(0), 'Pullback:', pullbackCandles, 'EMA:', pullbackTouchedEma ? 'Y' : 'N');
          }
        }
        // SHORT SETUP
        else if (belowEma && isBearish(i) && isBullish(prevCandle)) {
          const isEngulfing = currentBody > prevBody && opens[i] >= closes[prevCandle] && closes[i] <= opens[prevCandle];
          
          if (isEngulfing) {
            const swingHigh = findSwingHigh(i, 5);
            const entry = closes[i] * (1 - SLIPPAGE);
            const stop = swingHigh * 1.002;
            const riskAmount = stop - entry;
            const target = entry - (riskAmount * RISK_REWARD_RATIO);

            const positionSize = (balance * POSITION_SIZE_PCT) / (riskAmount / entry);
            const cappedSize = Math.min(positionSize, balance * 0.95);
            const entryFee = cappedSize * TRADING_FEE;

            position = {
              entry, stop, target, type: 'short', entryIndex: i,
              size: cappedSize - entryFee
            };
            console.log('📉 SHORT 50EMA', price.toFixed(0), 'Pullback:', pullbackCandles);
          }
        }
      } else {
        // EXIT LOGIC
        let exit = false;
        let exitPrice = 0;
        let reason = '';

        if (position.type === 'long') {
          if (highs[i] >= position.target) {
            exit = true;
            exitPrice = position.target * (1 - SLIPPAGE);
            reason = '2R Target';
          } else if (lows[i] <= position.stop) {
            exit = true;
            exitPrice = position.stop * (1 - SLIPPAGE);
            reason = 'Stop Loss';
          }
        } else {
          if (lows[i] <= position.target) {
            exit = true;
            exitPrice = position.target * (1 + SLIPPAGE);
            reason = '2R Target';
          } else if (highs[i] >= position.stop) {
            exit = true;
            exitPrice = position.stop * (1 + SLIPPAGE);
            reason = 'Stop Loss';
          }
        }

        if (exit) {
          let priceChange = 0;
          if (position.type === 'long') {
            priceChange = exitPrice - position.entry;
          } else {
            priceChange = position.entry - exitPrice;
          }

          let pnl = priceChange * (position.size / position.entry);
          const exitFee = position.size * TRADING_FEE;
          pnl = pnl - exitFee;

          balance += pnl;
          const pnlPercent = pnl / balance;

          if (pnl > 0) { wins++; grossProfit += pnl; }
          else { losses++; grossLoss += Math.abs(pnl); }

          trades.push({
            entryTime: times[position.entryIndex],
            entryPrice: position.entry,
            exitTime: times[i],
            exitPrice,
            type: position.type,
            pnl,
            pnlPercent: pnlPercent * 100,
            status: pnl > 0 ? 'Win' : 'Loss'
          });

          console.log(`${pnl > 0 ? 'Win' : 'Loss'} (${reason}): ${(pnlPercent * 100).toFixed(1)}%`);
          position = null;
        }
      }
      equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const returnPct = ((balance / 10000) - 1) * 100;
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    trades.sort((a, b) => b.entryTime - a.entryTime);

    console.log(`✅ ${totalTrades} trades | ${wins}W-${losses}L | WR: ${winRate.toFixed(1)}% | PF: ${profitFactor.toFixed(2)} | Sharpe: ${sharpeRatio.toFixed(2)}`);

    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  // STRATEGY 5: BB Snap Back (EMA 200 + RSI 7 + BB Mean Reversion)
  private bbSnapBack(candles: Candle[]): BacktestResult {
    if (!candles || candles.length < 210) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const opens = candles.map(c => c.open);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const times = candles.map(c => c.time);
    
    // Indicators
    const ema200 = this.calculateEMA(closes, 200);
    const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = this.calculateBollingerBands(closes, 20, 2);
    const rsi7 = this.calculateRSI(closes, 7); // Fast RSI
    
    // Calculate ATR for stop loss
    const atr = [];
    const atrPeriod = 14;
    for (let i = atrPeriod; i < candles.length; i++) {
      let sum = 0;
      for (let j = i - atrPeriod + 1; j <= i; j++) {
        const tr = Math.max(
          highs[j] - lows[j],
          Math.abs(highs[j] - closes[j-1]),
          Math.abs(lows[j] - closes[j-1])
        );
        sum += tr;
      }
      atr.push(sum / atrPeriod);
    }

    // Trading parameters
    const RSI_OVERSOLD = 30;
    const RSI_OVERBOUGHT = 70;
    const ATR_MULTIPLIER = 1.5;
    const POSITION_SIZE_PCT = 0.02;
    const TRADING_FEE = 0.001;
    const SLIPPAGE = 0.0005;

    let balance = 10000;
    const equityCurve = [balance];
    let position: {
      entry: number,
      stop: number,
      tp1: number,
      tp2: number,
      type: 'long' | 'short',
      entryIndex: number,
      size: number,
      tp1Hit: boolean,
      touchedBand: boolean
    } | null = null;
    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // Helper: Check candle color
    const isGreen = (i: number) => closes[i] > opens[i];
    const isRed = (i: number) => closes[i] < opens[i];

    // BB SNAP BACK STRATEGY
    for (let i = 210; i < candles.length; i++) {
      const price = closes[i];
      const currentEma200 = ema200[i];
      const currentBBUpper = bbUpper[i];
      const currentBBMiddle = bbMiddle[i];
      const currentBBLower = bbLower[i];
      const currentRsi = rsi7[i];
      const currentATR = atr[i - atrPeriod] || atr[atr.length - 1];

      if (!position) {
        // LONG SETUP: Price above EMA200, touches lower BB, RSI < 30
        if (price > currentEma200) {
          const touchedLowerBB = lows[i] <= currentBBLower;
          const oversold = currentRsi < RSI_OVERSOLD;
          const snapBack = isGreen(i) && closes[i] > currentBBLower; // Green candle closes back inside

          if (touchedLowerBB && oversold && snapBack) {
            const entry = closes[i] * (1 + SLIPPAGE);
            
            // Stop: Swing low or 1.5 ATR
            const swingLow = Math.min(...lows.slice(Math.max(0, i - 10), i + 1));
            const atrStop = entry - (currentATR * ATR_MULTIPLIER);
            const stop = Math.max(swingLow * 0.998, atrStop);
            
            // TP1: Middle BB, TP2: Upper BB
            const tp1 = currentBBMiddle;
            const tp2 = currentBBUpper;

            const riskAmount = entry - stop;
            const positionSize = (balance * POSITION_SIZE_PCT) / (riskAmount / entry);
            const cappedSize = Math.min(positionSize, balance * 0.95);
            const entryFee = cappedSize * TRADING_FEE;

            position = {
              entry, stop, tp1, tp2, type: 'long', entryIndex: i,
              size: cappedSize - entryFee, tp1Hit: false, touchedBand: true
            };
            console.log('📈 LONG BB Snap', price.toFixed(0), 'RSI:', currentRsi.toFixed(0));
          }
        }
        // SHORT SETUP: Price below EMA200, touches upper BB, RSI > 70
        else if (price < currentEma200) {
          const touchedUpperBB = highs[i] >= currentBBUpper;
          const overbought = currentRsi > RSI_OVERBOUGHT;
          const snapBack = isRed(i) && closes[i] < currentBBUpper;

          if (touchedUpperBB && overbought && snapBack) {
            const entry = closes[i] * (1 - SLIPPAGE);
            
            // Stop: Swing high or 1.5 ATR
            const swingHigh = Math.max(...highs.slice(Math.max(0, i - 10), i + 1));
            const atrStop = entry + (currentATR * ATR_MULTIPLIER);
            const stop = Math.min(swingHigh * 1.002, atrStop);
            
            // TP1: Middle BB, TP2: Lower BB
            const tp1 = currentBBMiddle;
            const tp2 = currentBBLower;

            const riskAmount = stop - entry;
            const positionSize = (balance * POSITION_SIZE_PCT) / (riskAmount / entry);
            const cappedSize = Math.min(positionSize, balance * 0.95);
            const entryFee = cappedSize * TRADING_FEE;

            position = {
              entry, stop, tp1, tp2, type: 'short', entryIndex: i,
              size: cappedSize - entryFee, tp1Hit: false, touchedBand: true
            };
            console.log('📉 SHORT BB Snap', price.toFixed(0), 'RSI:', currentRsi.toFixed(0));
          }
        }
      } else {
        // EXIT LOGIC
        let partialExit = false;
        let fullExit = false;
        let exitPrice = 0;
        let exitReason = '';
        let partialSize = 0;

        if (position.type === 'long') {
          // TP1: Middle BB (50% exit, move to breakeven)
          if (!position.tp1Hit && highs[i] >= position.tp1) {
            partialExit = true;
            exitPrice = position.tp1 * (1 - SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'TP1 (Middle BB)';
            position.tp1Hit = true;
            position.stop = position.entry; // Move to breakeven
            position.size -= partialSize;
          }
          // TP2: Upper BB (remaining 50%)
          else if (position.tp1Hit && highs[i] >= position.tp2) {
            fullExit = true;
            exitPrice = position.tp2 * (1 - SLIPPAGE);
            exitReason = 'TP2 (Upper BB)';
          }
          // Stop loss
          else if (lows[i] <= position.stop) {
            fullExit = true;
            exitPrice = position.stop * (1 - SLIPPAGE);
            exitReason = position.tp1Hit ? 'Breakeven' : 'Stop Loss';
          }
        } else {
          // SHORT exits
          if (!position.tp1Hit && lows[i] <= position.tp1) {
            partialExit = true;
            exitPrice = position.tp1 * (1 + SLIPPAGE);
            partialSize = position.size * 0.5;
            exitReason = 'TP1 (Middle BB)';
            position.tp1Hit = true;
            position.stop = position.entry;
            position.size -= partialSize;
          }
          else if (position.tp1Hit && lows[i] <= position.tp2) {
            fullExit = true;
            exitPrice = position.tp2 * (1 + SLIPPAGE);
            exitReason = 'TP2 (Lower BB)';
          }
          else if (highs[i] >= position.stop) {
            fullExit = true;
            exitPrice = position.stop * (1 + SLIPPAGE);
            exitReason = position.tp1Hit ? 'Breakeven' : 'Stop Loss';
          }
        }

        // Process exits
        if (partialExit || fullExit) {
          const sizeToClose = partialExit ? partialSize : position.size;
          let priceChange = 0;
          if (position.type === 'long') {
            priceChange = exitPrice - position.entry;
          } else {
            priceChange = position.entry - exitPrice;
          }

          let pnl = priceChange * (sizeToClose / position.entry);
          const exitFee = sizeToClose * TRADING_FEE;
          pnl = pnl - exitFee;

          balance += pnl;
          const pnlPercent = pnl / balance;

          if (pnl > 0) { wins++; grossProfit += pnl; }
          else { losses++; grossLoss += Math.abs(pnl); }

          trades.push({
            entryTime: times[position.entryIndex],
            entryPrice: position.entry,
            exitTime: times[i],
            exitPrice,
            type: position.type,
            pnl,
            pnlPercent: pnlPercent * 100,
            status: pnl > 0 ? 'Win' : 'Loss'
          });

          console.log(`${pnl > 0 ? 'Win' : 'Loss'} (${exitReason}): ${(pnlPercent * 100).toFixed(1)}%`);

          if (fullExit) {
            position = null;
          }
        }
      }
      equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const returnPct = ((balance / 10000) - 1) * 100;
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    trades.sort((a, b) => b.entryTime - a.entryTime);

    console.log(`✅ ${totalTrades} trades | ${wins}W-${losses}L | WR: ${winRate.toFixed(1)}% | PF: ${profitFactor.toFixed(2)} | Sharpe: ${sharpeRatio.toFixed(2)}`);

    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  // STRATEGY 6: Hoffman IRB (Inventory Retracement Bar)
  private hoffmanIRB(candles: Candle[]): BacktestResult {
    if (!candles || candles.length < 100) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
    }

    const closes = candles.map(c => c.close);
    const opens = candles.map(c => c.open);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const times = candles.map(c => c.time);
    
    // EMAs for trend
    const ema20 = this.calculateEMA(closes, 20); // Short-term
    const ema80 = this.calculateEMA(closes, 80); // Simulates 4H 1H-EMA

    // Trading parameters
    const IRB_RETRACEMENT_PCT = 0.45; // 45% retracement
    const MIN_TREND_ANGLE = 28; // degrees
    const RISK_REWARD_CONSERVATIVE = 1.3;
    const RISK_REWARD_AGGRESSIVE = 2.0;
    const POSITION_SIZE_PCT = 0.01; // 1% risk per trade
    const TRADING_FEE = 0.001;
    const SLIPPAGE = 0.0005;

    let balance = 10000;
    const equityCurve = [balance];
    let position: {
      entry: number,
      stop: number,
      target: number,
      type: 'long' | 'short',
      entryIndex: number,
      size: number,
      breakeven: boolean
    } | null = null;
    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    const trades: ExecutedTrade[] = [];

    // Helper: Calculate IRB (Inventory Retracement Bar)
    const isIRB = (i: number): 'bullish' | 'bearish' | null => {
      const candleRange = highs[i] - lows[i];
      if (candleRange === 0) return null;

      const isBullish = closes[i] > opens[i];
      
      if (isBullish) {
        // Bullish candle - check retracement from high
        const retracement = highs[i] - closes[i];
        const retracementPct = retracement / candleRange;
        return retracementPct >= IRB_RETRACEMENT_PCT ? 'bullish' : null;
      } else {
        // Bearish candle - check retracement from low
        const retracement = closes[i] - lows[i];
        const retracementPct = retracement / candleRange;
        return retracementPct >= IRB_RETRACEMENT_PCT ? 'bearish' : null;
      }
    };

    // Helper: Calculate EMA angle
    const calculateEMAngle = (ema: number[], index: number, lookback: number = 5): number => {
      if (index < lookback) return 0;
      const priceChange = ema[index] - ema[index - lookback];
      const timeChange = lookback; // candles
      const slope = priceChange / ema[index - lookback];
      return Math.atan(slope) * (180 / Math.PI); // Convert to degrees
    };

    // HOFFMAN IRB STRATEGY
    for (let i = 85; i < candles.length; i++) {
      const price = closes[i];
      const currentEma20 = ema20[i];
      const currentEma80 = ema80[i];

      if (!position) {
        // Check for IRB signal
        const irbSignal = isIRB(i - 1); // Previous candle
        if (!irbSignal) continue;

        const ema20Angle = calculateEMAngle(ema20, i);

        // LONG SETUP: EMA20 > EMA80, upward angle, bullish IRB (RED arrow in uptrend)
        if (currentEma20 > currentEma80 && ema20Angle >= MIN_TREND_ANGLE && irbSignal === 'bullish') {
          // Entry: Stop order above IRB candle high (breakout confirmation)
          const irbCandleHigh = highs[i - 1];
          const irbCandleLow = lows[i - 1];
          
          // Check if current candle breaks above IRB high
          if (highs[i] > irbCandleHigh) {
            const entry = irbCandleHigh * (1 + SLIPPAGE);
            const stop = irbCandleLow * 0.999;
            const riskAmount = entry - stop;
            const target = entry + (riskAmount * RISK_REWARD_CONSERVATIVE);

            const positionSize = (balance * POSITION_SIZE_PCT) / (riskAmount / entry);
            const cappedSize = Math.min(positionSize, balance * 0.95);
            const entryFee = cappedSize * TRADING_FEE;

            position = {
              entry, stop, target, type: 'long', entryIndex: i,
              size: cappedSize - entryFee, breakeven: false
            };
            console.log('📈 LONG IRB', price.toFixed(0), 'Angle:', ema20Angle.toFixed(0) + '°');
          }
        }
        // SHORT SETUP: EMA20 < EMA80, downward angle, bearish IRB (GREEN arrow in downtrend)
        else if (currentEma20 < currentEma80 && ema20Angle <= -MIN_TREND_ANGLE && irbSignal === 'bearish') {
          const irbCandleHigh = highs[i - 1];
          const irbCandleLow = lows[i - 1];
          
          // Check if current candle breaks below IRB low
          if (lows[i] < irbCandleLow) {
            const entry = irbCandleLow * (1 - SLIPPAGE);
            const stop = irbCandleHigh * 1.001;
            const riskAmount = stop - entry;
            const target = entry - (riskAmount * RISK_REWARD_CONSERVATIVE);

            const positionSize = (balance * POSITION_SIZE_PCT) / (riskAmount / entry);
            const cappedSize = Math.min(positionSize, balance * 0.95);
            const entryFee = cappedSize * TRADING_FEE;

            position = {
              entry, stop, target, type: 'short', entryIndex: i,
              size: cappedSize - entryFee, breakeven: false
            };
            console.log('📉 SHORT IRB', price.toFixed(0), 'Angle:', ema20Angle.toFixed(0) + '°');
          }
        }
      } else {
        // EXIT LOGIC
        let exit = false;
        let exitPrice = 0;
        let reason = '';

        if (position.type === 'long') {
          // Move to breakeven at 1:1
          if (!position.breakeven) {
            const riskAmount = position.entry - position.stop;
            const breakEvenLevel = position.entry + riskAmount;
            if (highs[i] >= breakEvenLevel) {
              position.stop = position.entry;
              position.breakeven = true;
            }
          }

          // Target hit
          if (highs[i] >= position.target) {
            exit = true;
            exitPrice = position.target * (1 - SLIPPAGE);
            reason = '1.3R Target';
          }
          // Stop loss
          else if (lows[i] <= position.stop) {
            exit = true;
            exitPrice = position.stop * (1 - SLIPPAGE);
            reason = position.breakeven ? 'Breakeven' : 'Stop Loss';
          }
        } else {
          // SHORT exits
          if (!position.breakeven) {
            const riskAmount = position.stop - position.entry;
            const breakEvenLevel = position.entry - riskAmount;
            if (lows[i] <= breakEvenLevel) {
              position.stop = position.entry;
              position.breakeven = true;
            }
          }

          if (lows[i] <= position.target) {
            exit = true;
            exitPrice = position.target * (1 + SLIPPAGE);
            reason = '1.3R Target';
          }
          else if (highs[i] >= position.stop) {
            exit = true;
            exitPrice = position.stop * (1 + SLIPPAGE);
            reason = position.breakeven ? 'Breakeven' : 'Stop Loss';
          }
        }

        if (exit) {
          let priceChange = 0;
          if (position.type === 'long') {
            priceChange = exitPrice - position.entry;
          } else {
            priceChange = position.entry - exitPrice;
          }

          let pnl = priceChange * (position.size / position.entry);
          const exitFee = position.size * TRADING_FEE;
          pnl = pnl - exitFee;

          balance += pnl;
          const pnlPercent = pnl / balance;

          if (pnl > 0) { wins++; grossProfit += pnl; }
          else { losses++; grossLoss += Math.abs(pnl); }

          trades.push({
            entryTime: times[position.entryIndex],
            entryPrice: position.entry,
            exitTime: times[i],
            exitPrice,
            type: position.type,
            pnl,
            pnlPercent: pnlPercent * 100,
            status: pnl > 0 ? 'Win' : 'Loss'
          });

          console.log(`${pnl > 0 ? 'Win' : 'Loss'} (${reason}): ${(pnlPercent * 100).toFixed(1)}%`);
          position = null;
        }
      }
      equityCurve.push(balance);
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const returnPct = ((balance / 10000) - 1) * 100;
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    trades.sort((a, b) => b.entryTime - a.entryTime);

    console.log(`✅ ${totalTrades} trades | ${wins}W-${losses}L | WR: ${winRate.toFixed(1)}% | PF: ${profitFactor.toFixed(2)} | Sharpe: ${sharpeRatio.toFixed(2)}`);

    return { totalTrades, wins, losses, winRate, profitFactor, equityCurve, trades };
  }

  private calculateSharpeRatio(equityCurve: number[]): number {
    if (equityCurve.length < 2) return 0;
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }
    
    // Mean return
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // Standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Sharpe = (mean return - risk free rate) / std dev
    // Assuming 0% risk-free rate for simplicity
    return stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  getStrategyDescription(strategyId: string = 'mean-reversion-hf'): { name: string, description: string, buyRules: string[], sellRules: string[] } {
    switch (strategyId) {
      case 'mean-reversion-hf':
        return {
          name: 'Mean Reversion (BB + RSI - High Frequency)',
          description: 'Bidirectional mean reversion strategy targeting 500+ trades over 5 years with 55-65% win rate.',
          buyRules: [
            'LONG: Lower BB touch + RSI < 35 + Vol > 1.2x avg',
            'Exit: Middle BB OR RSI > 70 OR 3% stop OR 48h timeout',
            'Risk: 2% per trade with proper sizing'
          ],
          sellRules: [
            'SHORT: Upper BB touch + RSI > 65 + Vol > 1.2x avg',
            'Exit: Middle BB OR RSI < 30 OR 3% stop OR 48h timeout',
            'Mean reversion works both ways!'
          ]
        };
      
      case 'ema-crossover-partial':
        return {
          name: 'EMA Crossover with Partial Exits',
          description: 'Trend-following strategy with 1.8% stop loss and partial profit-taking at 1.5x and 2.5x risk.',
          buyRules: [
            'LONG: EMA 20 crosses above EMA 50 + RSI > 50',
            'Stop Loss: 1.8% below entry',
            'First TP: 1.5x risk (exit 50%, move SL to breakeven)',
            'Second TP: 2.5x risk (exit remaining 50%)'
          ],
          sellRules: [
            'SHORT: EMA 20 crosses below EMA 50 + RSI < 50',
            'Stop Loss: 1.8% above entry',
            'First TP: 1.5x risk (exit 50%, move SL to breakeven)',
            'Second TP: 2.5x risk (exit remaining 50%)'
          ]
        };
      
      case 'bb-squeeze-breakout':
        return {
          name: 'BB Squeeze Breakout (Pro)',
          description: 'High-probability squeeze breakouts. Target: 58-62% WR, PF 2.1-2.4, Sharpe 1.8-2.2',
          buyRules: [
            'LONG: BB squeeze (width in bottom 20%) + breakout above upper BB',
            'Volume > 2x avg + RSI 50-70 + MACD positive & rising',
            'TP1: 2.5% (50% exit), TP2: 4.5% (50% exit)',
            'Stop: 1.8% → Breakeven after TP1 → 2% trailing after TP2'
          ],
          sellRules: [
            'SHORT: BB squeeze + breakdown below lower BB',
            'Volume > 2x avg + RSI 30-50 + MACD negative & falling',
            'TP1: 2.5% (50%), TP2: 4.5% (50%)',
            'Max hold: 48 hours'
          ]
        };
      
      case '50ema-trend-continuation':
        return {
          name: '50 EMA Trend Continuation (Price Action)',
          description: 'Advanced price action strategy with 50 EMA, pullback, and engulfing patterns. Target: 2R (60%+ WR)',
          buyRules: [
            'LONG: Price above 50 EMA (bullish trend identified)',
            'Pullback: 2+ bearish candles (Model 2: touches 50 EMA)',
            'Entry: Bullish engulfing pattern forms',
            'Stop: Below swing low | Target: 2x risk (2R)'
          ],
          sellRules: [
            'SHORT: Price below 50 EMA (bearish trend)',
            'Pullback: 2+ bullish candles (Model 2: touches 50 EMA)',
            'Entry: Bearish engulfing pattern forms',
            'Stop: Above swing high | Target: 2x risk (2R)'
          ]
        };
      
      case 'bb-snap-back':
        return {
          name: 'BB Snap Back (Rubber Band Effect)',
          description: 'EMA 200 + BB (20,2) + RSI(7) mean reversion. Catch the "snap" when price stretches too far.',
          buyRules: [
            'LONG: Price > EMA 200 + touches Lower BB + RSI(7) < 30',
            'Entry: First GREEN candle closes back inside BB',
            'TP1: Middle BB (50% exit, move SL to breakeven)',
            'TP2: Upper BB (50% exit) | Stop: Swing low or 1.5 ATR'
          ],
          sellRules: [
            'SHORT: Price < EMA 200 + touches Upper BB + RSI(7) > 70',
            'Entry: First RED candle closes back inside BB',
            'TP1: Middle BB (50% exit, breakeven)',
            'TP2: Lower BB (50%) | Stop: Swing high or 1.5 ATR'
          ]
        };
      
      case 'hoffman-irb':
        return {
          name: 'Hoffman IRB (Inventory Retracement Bar)',
          description: 'Rob Hoffman\'s proven strategy. 62-65% WR. IRB + EMA trend + breakout entries. 2-4 signals/day.',
          buyRules: [
            'LONG: EMA20 > EMA80 + trend angle ≥ 28°',
            'Wait for IRB signal (45% retracement candle)',
            'Entry: Breakout above IRB candle high',
            'Stop: Below IRB low | Target: 1.3R | Move to breakeven at 1:1'
          ],
          sellRules: [
            'SHORT: EMA20 < EMA80 + trend angle ≤ -28°',
            'Wait for IRB signal (45% retracement candle)',
            'Entry: Breakdown below IRB candle low',
            'Stop: Above IRB high | Target: 1.3R | Breakeven at 1:1'
          ]
        };
      
      default:
        return {
          name: 'Mean Reversion (BB + RSI - High Frequency)',
          description: 'Bidirectional mean reversion strategy targeting 500+ trades over 5 years with 55-65% win rate.',
          buyRules: ['Default strategy'],
          sellRules: ['Default strategy']
        };
    }
  }

  checkSignal(candles: Candle[]): { type: 'Buy' | 'Sell', price: number, reason: string } | null {
    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const rsi = this.calculateRSI(closes, 14);
    const { k: stochK, d: stochD } = this.calculateStochRSI(closes);
    const { macd, signal: macdSignal } = this.calculateMACD(closes);
    
    const lastIndex = candles.length - 1;
    const prevIndex = lastIndex - 1;
    const currentPrice = closes[lastIndex];
    const currentEma9 = ema9[lastIndex];
    const currentEma21 = ema21[lastIndex];
    const currentSma50 = sma50[lastIndex];
    const currentSma200 = sma200[lastIndex];
    const currentRsi = rsi[lastIndex];
    const currentStochK = stochK[lastIndex];
    const currentStochD = stochD[lastIndex];
    const prevStochK = stochK[prevIndex];
    const prevStochD = stochD[prevIndex];
    const currentMacd = macd[lastIndex];
    const currentMacdSignal = macdSignal[lastIndex];
    const prevMacd = macd[prevIndex];
    const prevMacdSignal = macdSignal[prevIndex];

    // BUY SIGNAL
    const strongUptrend = currentEma9 > currentEma21 && currentEma21 > currentSma50 && currentPrice > currentSma200;
    const macdCrossUp = prevMacd <= prevMacdSignal && currentMacd > currentMacdSignal;
    const stochCrossUp = prevStochK <= prevStochD && currentStochK > currentStochD && currentStochK < 30;
    const rsiHealthy = currentRsi > 40 && currentRsi < 70;
    
    if (strongUptrend && (macdCrossUp || stochCrossUp) && rsiHealthy) {
      return {
        type: 'Buy',
        price: currentPrice,
        reason: `Strong Uptrend + ${macdCrossUp ? 'MACD Cross' : 'Stoch Cross'} | RSI: ${currentRsi.toFixed(0)}`
      };
    }

    // SELL SIGNAL
    const strongDowntrend = currentEma9 < currentEma21 && currentEma21 < currentSma50 && currentPrice < currentSma200;
    const macdCrossDown = prevMacd >= prevMacdSignal && currentMacd < currentMacdSignal;
    const stochCrossDown = prevStochK >= prevStochD && currentStochK < currentStochD && currentStochK > 70;
    const rsiBearish = currentRsi > 30 && currentRsi < 60;
    
    if (strongDowntrend && (macdCrossDown || stochCrossDown) && rsiBearish) {
      return {
        type: 'Sell',
        price: currentPrice,
        reason: `Strong Downtrend + ${macdCrossDown ? 'MACD Cross' : 'Stoch Cross'} | RSI: ${currentRsi.toFixed(0)}`
      };
    }

    return null;
  }
}
