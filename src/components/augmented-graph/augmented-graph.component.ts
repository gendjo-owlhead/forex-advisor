
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-augmented-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './augmented-graph.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AugmentedGraphComponent {}