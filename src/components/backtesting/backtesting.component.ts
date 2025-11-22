


import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-backtesting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backtesting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BacktestingComponent {
  winRate = input.required<number>();
  totalTrades = input.required<number>();
  profitFactor = input.required<number>();
}
