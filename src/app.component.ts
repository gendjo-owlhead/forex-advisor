
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ForexComponent } from './components/forex/forex.component';
import { CryptoComponent } from './components/crypto/crypto.component';
import { StocksComponent } from './components/stocks/stocks.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ForexComponent, CryptoComponent, StocksComponent],
})
export class AppComponent {
  title = 'MarketPulse AI';
  activeTab = signal<'forex' | 'crypto' | 'stocks'>('forex');
}