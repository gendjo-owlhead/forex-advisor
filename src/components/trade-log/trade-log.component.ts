import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { ExecutedTrade, StrategyService } from '../../services/strategy.service';

@Component({
  selector: 'app-trade-log',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, DecimalPipe],
  templateUrl: './trade-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeLogComponent {
  trades = input.required<ExecutedTrade[]>();
  strategyId = input.required<string>(); // New input for strategy ID
  private strategyService = inject(StrategyService);
  
  // Computed strategy info based on selected strategy
  get strategyInfo() {
    return this.strategyService.getStrategyDescription(this.strategyId());
  }
}
