
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './alerts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsComponent {
  currentSignal = input<{ type: 'Buy' | 'Sell', price: number, reason: string } | null>(null);
}