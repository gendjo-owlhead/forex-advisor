
import { Component, ChangeDetectionStrategy, input, AfterViewInit, OnChanges, SimpleChanges, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// Declare TradingView to inform TypeScript that it's a global variable
// loaded from an external script in index.html.
declare const TradingView: any;

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #chartContainer class="w-full h-[450px] rounded-md overflow-hidden">
      <!-- TradingView widget will be injected here -->
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements AfterViewInit, OnChanges {
  pair = input.required<string>();
  timeframe = input.required<string>();
  marketType = input<'forex' | 'crypto' | 'stocks'>('forex');
  
  chartContainer = viewChild.required<ElementRef>('chartContainer');

  private widget: any = null;
  private isViewInitialized = false;

  private timeframeMap: { [key: string]: string } = {
    '15m': '15',
    '1H': '60',
    '4H': '240',
    '1D': 'D',
  };

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    this.createWidget();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-create the widget if the pair or timeframe changes after the view has been initialized.
    if (this.isViewInitialized && (changes['pair'] || changes['timeframe'] || changes['marketType'])) {
      this.createWidget();
    }
  }

  private createWidget(): void {
    // Ensure TradingView script is loaded and the container element is available.
    if (typeof TradingView === 'undefined' || !this.isViewInitialized) {
      return;
    }

    const container = this.chartContainer().nativeElement;
    // Clearing the container is essential when the pair changes.
    container.innerHTML = ''; 
    
    // Determine symbol prefix based on market type
    let prefix = 'FX_IDC:';
    if (this.marketType() === 'crypto') {
      prefix = 'BINANCE:';
    } else if (this.marketType() === 'stocks') {
      prefix = 'NASDAQ:'; // Defaulting to NASDAQ for now
    }

    const symbol = `${prefix}${this.pair().replace('/', '')}`;
    const interval = this.timeframeMap[this.timeframe()] || '60';

    this.widget = new TradingView.widget({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1", // Candlesticks
      locale: "en",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false, // Control symbol changes via app controls
      container_id: this.getContainerId(),
      details: true,
      hotlist: true,
      calendar: true,
      withdateranges: true,
      hide_top_toolbar: false,
    });
  }

  private getContainerId(): string {
    const container = this.chartContainer().nativeElement;
    if (!container.id) {
      // Generate a unique ID if one doesn't exist to avoid conflicts.
      container.id = `tradingview-widget-container-${Math.random().toString(36).substring(2, 10)}`;
    }
    return container.id;
  }
}
