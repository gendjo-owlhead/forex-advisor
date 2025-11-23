
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MarketDashboardComponent } from '../shared/market-dashboard/market-dashboard.component';

@Component({
  selector: 'app-crypto',
  standalone: true,
  template: `
    <app-market-dashboard 
      marketType="crypto" 
      initialPair="BTC/USDT"
      [availablePairs]="cryptoPairs">
    </app-market-dashboard>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarketDashboardComponent],
})
export class CryptoComponent {
  readonly cryptoPairs = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT'
  ];
}
