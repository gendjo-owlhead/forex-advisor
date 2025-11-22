


import { Component, ChangeDetectionStrategy, signal, effect, ChangeDetectorRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import { ControlsComponent } from '../controls/controls.component';
import { ChartComponent } from '../chart/chart.component';
import { AnalysisComponent } from '../analysis/analysis.component';
import { ConclusionComponent } from '../conclusion/conclusion.component';
import { AlertsComponent } from '../alerts/alerts.component';
import { AugmentedGraphComponent } from '../augmented-graph/augmented-graph.component';
import { BacktestingComponent } from '../backtesting/backtesting.component';
import { ForexAnalysis, TradeRecord, Conclusion } from '../../models/analysis.model';

@Component({
  selector: 'app-forex',
  standalone: true,
  templateUrl: './forex.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    ControlsComponent, 
    ChartComponent, 
    AnalysisComponent,
    ConclusionComponent,
    AlertsComponent,
    AugmentedGraphComponent,
    BacktestingComponent
  ],
})
export class ForexComponent {
  private geminiService = inject(GeminiService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(false);
  analysisResult = signal<ForexAnalysis | null>(null);
  error = signal<string | null>(null);
  selectedPair = signal<string>('EUR/USD');
  selectedTimeframe = signal<string>('1H');
  tradeHistory = signal<TradeRecord[]>([]);

  // Computed signals for backtesting
  totalTrades = computed(() => this.tradeHistory().length);
  wins = computed(() => this.tradeHistory().filter(t => t.outcome === 'Win').length);
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
      this.cdr.markForCheck();
    });
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

  async handleAnalysisRequest({ pair, useThinkingMode, timeframe }: { pair: string, useThinkingMode: boolean, timeframe: string }): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.analysisResult.set(null);
    try {
      this.selectedPair.set(pair);
      this.selectedTimeframe.set(timeframe);
      const result = await this.geminiService.getForexPrediction(pair, useThinkingMode, timeframe);
      this.analysisResult.set(result);
      
      // Add to backtesting history if there is a trade signal
      if (result.conclusion && result.conclusion.signal !== 'Hold') {
        this.updateTradeHistory(result.conclusion, pair, timeframe);
      }

    } catch (e) {
      console.error('Error getting analysis:', e);
      this.error.set('Failed to retrieve analysis. Please check the console for more details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private updateTradeHistory(conclusion: Conclusion, pair: string, timeframe: string): void {
    // Simulate the outcome of the trade for demonstration purposes
    const outcome = Math.random() < 0.725 ? 'Win' : 'Loss'; // Simulating a ~72.5% win rate

    const newRecord: TradeRecord = {
      conclusion,
      outcome,
      pair,
      timeframe,
    };

    this.tradeHistory.update(currentHistory => [...currentHistory, newRecord]);
  }
}
