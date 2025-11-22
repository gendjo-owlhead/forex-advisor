
import { Component, ChangeDetectionStrategy, signal, effect, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import { ControlsComponent } from '../controls/controls.component';
import { ChartComponent } from '../chart/chart.component';
import { AnalysisComponent } from '../analysis/analysis.component';
import { ForexAnalysis } from '../../models/analysis.model';

@Component({
  selector: 'app-forex',
  standalone: true,
  templateUrl: './forex.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ControlsComponent, ChartComponent, AnalysisComponent],
})
export class ForexComponent {
  private geminiService = inject(GeminiService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(false);
  analysisResult = signal<ForexAnalysis | null>(null);
  error = signal<string | null>(null);
  selectedPair = signal<string>('EUR/USD');
  selectedTimeframe = signal<string>('1H');

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
    // Optional: Clear previous analysis when timeframe changes for clarity
    this.analysisResult.set(null); 
    this.error.set(null);
  }

  async handleAnalysisRequest({ pair, useThinkingMode, timeframe }: { pair: string, useThinkingMode: boolean, timeframe: string }): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.analysisResult.set(null);
    try {
      // Ensure the component's state is in sync before the request
      this.selectedPair.set(pair);
      this.selectedTimeframe.set(timeframe);
      const result = await this.geminiService.getForexPrediction(pair, useThinkingMode, timeframe);
      this.analysisResult.set(result);
    } catch (e) {
      console.error('Error getting analysis:', e);
      this.error.set('Failed to retrieve analysis. Please check the console for more details.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
