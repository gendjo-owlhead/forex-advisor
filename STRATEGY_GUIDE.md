# How to Add New Trading Strategies

## Current Setup

The strategy system is now modular and supports multiple strategies. Users can select which strategy to use via the dropdown in the dashboard.

## Adding a New Strategy

### Step 1: Add Strategy to List

In `market-dashboard.component.ts`, add your new strategy to the `availableStrategies` array:

```typescript
availableStrategies = [
  { id: 'mean-reversion-hf', name: 'Mean Reversion (High Frequency)' },
  { id: 'your-new-strategy', name: 'Your New Strategy Name' },  // ADD HERE
];
```

### Step 2: Create Strategy Method

In `strategy.service.ts`, add a new private method for your strategy:

```typescript
// STRATEGY 2: Your New Strategy
private yourNewStrategy(candles: Candle[]): BacktestResult {
  if (!candles || candles.length < 50) {
    return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, equityCurve: [], trades: [] };
  }

  const closes = candles.map(c => c.close);
  // ... your indicators ...
  const sma50 = this.calculateSMA(closes, 50);
  
  let balance = 10000;
  const equityCurve = [balance];
  let wins = 0, losses = 0;
  const trades: ExecutedTrade[] = [];
  
  // YOUR STRATEGY LOGIC HERE
  for (let i = 50; i < candles.length; i++) {
    // Entry logic
    // Exit logic
    // Track trades
  }
  
  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  
  return { totalTrades, wins, losses, winRate, profitFactor: 1.0, equityCurve, trades };
}
```

### Step 3: Add to Router

In `strategy.service.ts`, add your strategy to the switch statement in `runBacktest()`:

```typescript
runBacktest(candles: Candle[], strategyId: string = 'mean-reversion-hf'): BacktestResult {
  switch (strategyId) {
    case 'mean-reversion-hf':
      return this.meanReversionHighFrequency(candles);
    case 'your-new-strategy':
      return this.yourNewStrategy(candles);  // ADD HERE
    default:
      return this.meanReversionHighFrequency(candles);
  }
}
```

### Step 4: Update Strategy Description (Optional)

Update `getStrategyDescription()` to return different descriptions based on the selected strategy.

## Example Strategy Template

```typescript
private exampleStrategy(candles: Candle[]): BacktestResult {
  const closes = candles.map(c => c.close);
  const times = candles.map(c => c.time);
  
  // Your indicators
  const sma20 = this.calculateSMA(closes, 20);
  const rsi = this.calculateRSI(closes, 14);
  
  let balance = 10000;
  let wins = 0, losses = 0;
  const trades: ExecutedTrade[] = [];
  
  let position: { entry: number, entryIndex: number } | null = null;
  
  for (let i = 50; i < candles.length; i++) {
    if (!position) {
      // ENTRY CONDITIONS
      if (closes[i] > sma20[i] && rsi[i] < 30) {
        position = { entry: closes[i], entryIndex: i };
      }
    } else {
      // EXIT CONDITIONS
      if (rsi[i] > 70) {
        const pnl = closes[i] - position.entry;
        if (pnl > 0) wins++;
        else losses++;
        
        trades.push({
          entryTime: times[position.entryIndex],
          entryPrice: position.entry,
          exitTime: times[i],
          exitPrice: closes[i],
          type: 'long',
          pnl,
          pnlPercent: (pnl / position.entry) * 100,
          status: pnl > 0 ? 'Win' : 'Loss'
        });
        
        position = null;
      }
    }
  }
  
  return {
    totalTrades: wins + losses,
    wins,
    losses,
    winRate: (wins / (wins + losses)) * 100,
    profitFactor: 1.0,
    equityCurve: [balance],
    trades
  };
}
```

## Ready for Your Strategies!

The system is now ready. When you provide your new strategy details, I will:
1. Add it to the dropdown list
2. Implement the strategy logic
3. Add it to the router

Just give me the strategy name and rules!
