
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ForexComponent } from './components/forex/forex.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { ImageAnalyzerComponent } from './components/image-analyzer/image-analyzer.component';

type View = 'forex' | 'chat' | 'image';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ForexComponent, ChatbotComponent, ImageAnalyzerComponent],
})
export class AppComponent {
  title = 'Forex Signal AI';
  activeView = signal<View>('forex');

  setView(view: View): void {
    this.activeView.set(view);
  }
}
