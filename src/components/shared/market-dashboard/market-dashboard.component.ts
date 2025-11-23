
import { Component, ChangeDetectionStrategy, signal, effect, ChangeDetectorRef, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../../services/gemini.service';
import { ControlsComponent } from '../../controls/controls.component';
import { ChartComponent } from '../../chart/chart.component';
import { AnalysisComponent } from '../../analysis/analysis.component';
import { ConclusionComponent } from '../../conclusion/conclusion.component';
import { AlertsComponent } from '../../alerts/alerts.component';
import { SentimentDashboardComponent } from '../../sentiment-dashboard/sentiment-dashboard.component';
import { PerformanceComponent } from '../../backtesting/backtesting.component';
import { TradeLogComponent } from '../../trade-log/trade-log.component';
import { ForexAnalysis, TradeRecord, Conclusion } from '../../../models/analysis.model';
import { MarketDataService } from '../../../services/market-data.service';
import { StrategyService, ExecutedTrade } from '../../../services/strategy.service';

@Component({
  selector: 'app-market-dashboard',
  standalone: true,
  templateUrl: './market-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ControlsComponent,
    ChartComponent,
    AnalysisComponent,
    ConclusionComponent,
    AlertsComponent,
    SentimentDashboardComponent,
    PerformanceComponent,
    TradeLogComponent
  ],
})
export class MarketDashboardComponent {
  marketType = input.required<'forex' | 'crypto' | 'stocks'>();
  initialPair = input.required<string>();
  availablePairs = input<string[]>([]);

  private geminiService = inject(GeminiService);
  private marketDataService = inject(MarketDataService);
  private strategyService = inject(StrategyService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(false);
  analysisResult = signal<ForexAnalysis | null>(null);
  error = signal<string | null>(null);
  selectedPair = signal<string>('');
  selectedTimeframe = signal<string>('1H');
  selectedStrategy = signal<string>('mean-reversion-hf'); // Default strategy
  tradeHistory = signal<TradeRecord[]>([]);
  
  // Available strategies
  availableStrategies = [
    { id: 'mean-reversion-hf', name: 'Mean Reversion (High Frequency)' },
    { id: 'ema-crossover-partial', name: 'EMA Crossover with Partial Exits' },
    { id: 'bb-squeeze-breakout', name: 'BB Squeeze Breakout (High Win Rate)' },
    { id: '50ema-trend-continuation', name: '50 EMA Trend Continuation (Price Action)' },
    { id: 'bb-snap-back', name: 'BB Snap Back (EMA200 + RSI7)' },
    { id: 'hoffman-irb', name: 'Hoffman IRB (62-65% WR)' },
    { id: 'htf-sma-crossover-momentum', name: 'HTF Trend SMA Crossover + Momentum' },
    { id: 'dynamic-retest', name: '1H Dynamic Retest (Trend Continuation)' },
  ];

  // Backtest Signals
  realWinRate = signal<number>(0);
  realTotalTrades = signal<number>(0);
  realProfitFactor = signal<number>(0);
  realEquityCurve = signal<number[]>([]);
  realTrades = signal<ExecutedTrade[]>([]);
  currentSignal = signal<{ type: 'Buy' | 'Sell', price: number, reason: string } | null>(null);
  candlesUsed = signal<number>(0);

  // Computed signals for performance metrics based on validated trades
  validatedTrades = computed(() => this.tradeHistory().filter(t => t.status !== 'Pending'));
  totalTrades = computed(() => this.validatedTrades().length);
  wins = computed(() => this.validatedTrades().filter(t => t.status === 'Win').length);
  losses = computed(() => this.totalTrades() - this.wins());
  winRate = computed(() => {
    const total = this.totalTrades();
    if (total === 0) return 0;
    return (this.wins() / total) * 100;
  });
  profitFactor = computed(() => {
    // Assuming a fixed 1.5 Risk-to-Reward ratio for wins and 1 for losses.
    const grossProfit = this.wins() * 1.5;
    const grossLoss = this.losses() * 1;
    if (grossLoss === 0) {
      return grossProfit > 0 ? Infinity : 0;
    }
    return grossProfit / grossLoss;
  });

  constructor() {
    effect(() => {
      this.isLoading();
      this.analysisResult();
      this.error();
      this.selectedPair();
      this.selectedTimeframe();
      
      // Trigger backtest when pair or timeframe changes
      if (this.selectedPair() && this.selectedTimeframe()) {
          this.runBacktest();
      }

      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
      if (this.initialPair()) {
          this.selectedPair.set(this.initialPair());
          // Explicitly run backtest on init for crypto
          if (this.marketType() === 'crypto') {
              this.runBacktest();
          }
      }
  }

  async runBacktest() {
      console.log('🎯 runBacktest called for', this.selectedPair(), this.selectedTimeframe(), this.marketType());
      
      const data = await this.marketDataService.getHistoricalData(this.selectedPair(), this.selectedTimeframe(), this.marketType());
      
      console.log('📊 Fetched data:', data.length, 'candles');
      if (data.length > 0) {
          console.log('First candle:', data[0]);
          console.log('Last candle:', data[data.length - 1]);
      }
      
      this.candlesUsed.set(data.length);
      const result = this.strategyService.runBacktest(data, this.selectedStrategy());
      
      console.log('📈 Backtest result:', result);
      
      this.realWinRate.set(result.winRate);
      this.realTotalTrades.set(result.totalTrades);
      this.realProfitFactor.set(result.profitFactor);
      this.realEquityCurve.set(result.equityCurve);
      this.realTrades.set(result.trades);
      
      // Check for real-time signal on latest data
      const signal = this.strategyService.checkSignal(data);
      this.currentSignal.set(signal);
  }

  handlePairSelection(pair: string): void {
    this.selectedPair.set(pair);
    this.analysisResult.set(null);
    this.error.set(null);
  }

  handleTimeframeSelection(timeframe: string): void {
    this.selectedTimeframe.set(timeframe);
    this.analysisResult.set(null);
    this.error.set(null);
  }

  handleStrategySelection(strategyId: string) {
    console.log('🎯 Strategy selected:', strategyId);
    this.selectedStrategy.set(strategyId);
    // Re-run backtest with new strategy
    if (this.selectedPair()) {
      this.runBacktest();
    }
    this.analysisResult.set(null);
    this.error.set(null);
  }

  async handleAnalysisRequest({ pair, useThinkingMode, timeframe }: { pair: string, useThinkingMode: boolean, timeframe: string }): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.analysisResult.set(null);
    try {
      this.selectedPair.set(pair);
      this.selectedTimeframe.set(timeframe);
      // TODO: Pass marketType to the service to customize the prompt
      const result = await this.geminiService.getForexPrediction(pair, useThinkingMode, timeframe, this.marketType());
      this.analysisResult.set(result);

      if (result.conclusion && result.conclusion.signal !== 'Hold') {
        this.addTradeToLog(result.conclusion, pair, timeframe);
      }

    } catch (e) {
      console.error('Error getting analysis:', e);
      this.error.set('Failed to retrieve analysis. Please check the console for more details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private addTradeToLog(conclusion: Conclusion, pair: string, timeframe: string): void {
    const newRecord: TradeRecord = {
      id: Date.now(), // Simple unique ID
      conclusion,
      status: 'Pending',
      pair,
      timeframe,
    };

    this.tradeHistory.update(currentHistory => [newRecord, ...currentHistory]);
  }

  handleTradeValidation(event: { id: number; status: 'Win' | 'Loss' }): void {
    this.tradeHistory.update(currentHistory =>
      currentHistory.map(trade =>
        trade.id === event.id ? { ...trade, status: event.status } : trade
      )
    );
  }
}
