import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Conclusion } from '../../models/analysis.model';

@Component({
  selector: 'app-sentiment-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col">
      <h3 class="text-xl font-semibold mb-4 text-sky-300 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Global Market Sentiment
      </h3>

      @if (conclusion()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          
          <!-- Fear & Greed Gauge -->
          <div class="bg-gray-900/50 rounded-lg p-4 border border-gray-700 flex flex-col items-center justify-center relative">
            <h4 class="text-gray-400 text-sm uppercase tracking-wider mb-2">Fear & Greed Index</h4>
            
            <div class="relative w-48 h-24 overflow-hidden">
               <!-- Gauge Background -->
               <div class="absolute top-0 left-0 w-full h-full bg-gray-700 rounded-t-full"></div>
               <!-- Gauge Value -->
               <div class="absolute top-0 left-0 w-full h-full rounded-t-full origin-bottom transition-transform duration-1000 ease-out"
                    [style.transform]="'rotate(' + ((fearGreedValue() / 100) * 180 - 180) + 'deg)'"
                    [class]="getGaugeColor(fearGreedValue())">
               </div>
               <!-- Mask -->
               <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-gray-900 rounded-t-full"></div>
            </div>
            
            <div class="absolute bottom-4 text-center">
              <span class="text-3xl font-bold text-white">{{ fearGreedValue() }}</span>
              <p class="text-xs text-gray-400">{{ getFearGreedLabel(fearGreedValue()) }}</p>
            </div>
          </div>

          <!-- Market Mood & News Impact -->
          <div class="flex flex-col gap-4">
             <div class="bg-gray-900/50 rounded-lg p-4 border border-gray-700 flex-1 flex flex-col justify-center items-center relative">
                <h4 class="text-gray-400 text-sm uppercase tracking-wider mb-2">AI Forecast</h4>
                <div class="text-2xl font-bold flex items-center gap-2"
                     [class.text-emerald-400]="conclusion()?.market_sentiment === 'Bullish'"
                     [class.text-rose-400]="conclusion()?.market_sentiment === 'Bearish'"
                     [class.text-gray-300]="conclusion()?.market_sentiment === 'Neutral'">
                   @if(conclusion()?.market_sentiment === 'Bullish') { 🚀 }
                   @if(conclusion()?.market_sentiment === 'Bearish') { 🐻 }
                   {{ conclusion()?.market_sentiment || 'Neutral' }}
                </div>
                
                @if (isContrarian()) {
                    <div class="absolute top-2 right-2 bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/50" 
                         title="Sentiment is Fearful but AI predicts Bullish (or vice versa)">
                        Contrarian
                    </div>
                }
             </div>

             <div class="bg-gray-900/50 rounded-lg p-4 border border-gray-700 flex-1 flex flex-col justify-center">
                <h4 class="text-gray-400 text-sm uppercase tracking-wider mb-2 text-center">News Impact Score</h4>
                <div class="w-full bg-gray-700 h-4 rounded-full relative overflow-hidden">
                   <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-500"></div>
                   <div class="h-full transition-all duration-1000 ease-out"
                        [style.width.%]="(Math.abs(newsScore()) / 10) * 50"
                        [style.left.%]="newsScore() >= 0 ? 50 : 50 - ((Math.abs(newsScore()) / 10) * 50)"
                        [class]="newsScore() >= 0 ? 'bg-emerald-500' : 'bg-rose-500'">
                   </div>
                </div>
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Negative</span>
                  <span>Neutral</span>
                  <span>Positive</span>
                </div>
             </div>
          </div>

        </div>
      } @else {
        <div class="flex-1 flex items-center justify-center text-gray-500 italic">
          Run analysis to see real-time sentiment data.
        </div>
      }
      
      <div class="mt-4 text-center text-xs text-gray-600 border-t border-gray-800 pt-2">
        Data Source: Real-time AI Web Search & Analysis
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SentimentDashboardComponent {
  conclusion = input<Conclusion | null | undefined>(null);
  Math = Math;

  fearGreedValue = computed(() => this.conclusion()?.fear_greed_index ?? 50);
  newsScore = computed(() => this.conclusion()?.news_impact_score ?? 0);
  
  isContrarian = computed(() => {
      const sentiment = this.conclusion()?.market_sentiment;
      const fearGreed = this.fearGreedValue();
      
      // Fear (Low Index) + Bullish = Contrarian Buy
      if (fearGreed < 45 && sentiment === 'Bullish') return true;
      
      // Greed (High Index) + Bearish = Contrarian Sell
      if (fearGreed > 55 && sentiment === 'Bearish') return true;
      
      return false;
  });

  getGaugeColor(value: number): string {
    if (value < 25) return 'bg-rose-600'; // Extreme Fear
    if (value < 45) return 'bg-orange-500'; // Fear
    if (value < 55) return 'bg-yellow-400'; // Neutral
    if (value < 75) return 'bg-emerald-400'; // Greed
    return 'bg-emerald-600'; // Extreme Greed
  }

  getFearGreedLabel(value: number): string {
    if (value < 25) return 'Extreme Fear';
    if (value < 45) return 'Fear';
    if (value < 55) return 'Neutral';
    if (value < 75) return 'Greed';
    return 'Extreme Greed';
  }
}
