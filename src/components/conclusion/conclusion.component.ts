
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Conclusion } from '../../models/analysis.model';

@Component({
  selector: 'app-conclusion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conclusion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConclusionComponent {
  conclusion = input<Conclusion | null>();
}