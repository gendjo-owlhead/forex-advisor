
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MarketDashboardComponent } from '../shared/market-dashboard/market-dashboard.component';

@Component({
  selector: 'app-stocks',
  standalone: true,
  template: `
    <app-market-dashboard 
      marketType="stocks" 
      initialPair="AAPL"
      [availablePairs]="stockPairs">
    </app-market-dashboard>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarketDashboardComponent],
})
export class StocksComponent {
  readonly stockPairs = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'NFLX', 'INTC'
  ];
}
