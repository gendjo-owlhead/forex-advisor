
import { Component, ChangeDetectionStrategy, output, input, signal, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <label for="currency-pair" class="block text-sm font-medium text-gray-300 mb-2">Currency Pair</label>
        <select id="currency-pair" 
                [(ngModel)]="selectedPair"
                (ngModelChange)="onPairChange($event)"
                class="w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
          @for (pair of currencyPairs; track pair) {
            <option [value]="pair">{{ pair }}</option>
          }
        </select>
      </div>

      <div class="flex items-center justify-between bg-gray-700/50 p-3 rounded-md">
          <label for="thinking-mode" class="flex flex-col">
            <span class="font-medium text-gray-200">Thinking Mode</span>
            <span class="text-xs text-gray-400">For more complex analysis</span>
          </label>
          <div class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="thinking-mode" class="sr-only peer" [(ngModel)]="useThinkingMode">
            <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          </div>
      </div>

      <button 
        (click)="triggerAnalysis()"
        class="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-gray-900 transition-transform transform hover:scale-105">
        Analyze
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ControlsComponent {
  initialPair = input.required<string>();
  pairSelected = output<string>();
  analyze = output<{ pair: string, useThinkingMode: boolean }>();

  selectedPair = 'EUR/USD';
  useThinkingMode = false;

  readonly currencyPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
  ];

  constructor(private cdr: ChangeDetectorRef) {
    effect(() => {
        this.selectedPair = this.initialPair();
        this.cdr.markForCheck();
    });
  }

  onPairChange(pair: string): void {
    this.selectedPair = pair;
    this.pairSelected.emit(pair);
  }

  triggerAnalysis(): void {
    this.analyze.emit({ pair: this.selectedPair, useThinkingMode: this.useThinkingMode });
  }
}
