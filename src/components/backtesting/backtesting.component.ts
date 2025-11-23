
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backtesting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceComponent {
  winRate = input.required<number>();
  totalTrades = input.required<number>();
  profitFactor = input.required<number>();
}