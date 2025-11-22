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
  
  chartContainer = viewChild.required<ElementRef>('chartContainer');

  private widget: any = null;
  private isViewInitialized = false;

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    this.createWidget();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-create the widget if the pair changes after the view has been initialized.
    if (this.isViewInitialized && changes['pair'] && !changes['pair'].isFirstChange()) {
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
    
    // TradingView symbols for forex are like 'FX_IDC:EURUSD'
    const symbol = `FX_IDC:${this.pair().replace('/', '')}`;

    this.widget = new TradingView.widget({
      autosize: true,
      symbol: symbol,
      interval: "60", // 1 Hour interval
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
