
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForexAnalysis, Conclusion } from '../../models/analysis.model';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisComponent {
  isLoading = input.required<boolean>();
  analysis = input.required<ForexAnalysis | null>();
  error = input.required<string | null>();
  conclusion = input.required<Conclusion | null>();
}