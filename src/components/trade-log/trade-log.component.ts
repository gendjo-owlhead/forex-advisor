
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeRecord } from '../../models/analysis.model';

@Component({
  selector: 'app-trade-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trade-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeLogComponent {
  trades = input.required<TradeRecord[]>();
  validate = output<{ id: number; status: 'Win' | 'Loss' }>();

  onValidate(id: number, status: 'Win' | 'Loss'): void {
    this.validate.emit({ id, status });
  }
}
