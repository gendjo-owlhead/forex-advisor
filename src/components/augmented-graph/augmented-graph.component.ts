
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-augmented-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-64 bg-gray-900/50 rounded-lg p-4">
      <h3 class="text-sky-400 font-semibold mb-2">Strategy Equity Curve (Simulated)</h3>
      @if (equityCurve().length > 0) {
        <div class="relative w-full h-full flex items-end space-x-1">
           <!-- Simple SVG Line Chart -->
           <svg class="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path [attr.d]="pathData()" fill="none" stroke="#10b981" stroke-width="2" vector-effect="non-scaling-stroke" />
           </svg>
        </div>
      } @else {
        <div class="flex items-center justify-center h-full text-gray-500">
          No backtest data available
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AugmentedGraphComponent {
  equityCurve = input<number[]>([]);

  pathData = computed(() => {
    const data = this.equityCurve();
    if (!data.length) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Normalize points to 0-100 range
    const points = data.map((val, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  });
}