
import { Component, ChangeDetectionStrategy, signal, inject, ViewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatbotComponent {
  private geminiService = inject(GeminiService);

  messages = signal<ChatMessage[]>([
    { role: 'model', text: 'Hello! How can I help you today? Ask me anything about finance, trading, or technology.' }
  ]);
  userInput = signal('');
  isLoading = signal(false);

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  constructor() {
    afterNextRender(() => {
        this.scrollToBottom();
    });
  }

  async sendMessage(): Promise<void> {
    const userMessage = this.userInput().trim();
    if (!userMessage || this.isLoading()) return;

    // Add user message and clear input
    this.messages.update(m => [...m, { role: 'user', text: userMessage }]);
    this.userInput.set('');
    this.isLoading.set(true);
    this.scrollToBottom();

    // Prepare for streaming model response
    this.messages.update(m => [...m, { role: 'model', text: '' }]);
    
    try {
      const stream = await this.geminiService.sendMessageStream(userMessage);
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        this.messages.update(m => {
          const lastMessage = m[m.length - 1];
          lastMessage.text += chunkText;
          return [...m];
        });
        this.scrollToBottom();
      }
    } catch (e) {
      console.error('Error sending message:', e);
      this.messages.update(m => {
          const lastMessage = m[m.length - 1];
          lastMessage.text = 'Sorry, I encountered an error. Please try again.';
          return [...m];
        });
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private scrollToBottom(): void {
    setTimeout(() => {
        if (this.chatContainer) {
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        }
    }, 0);
  }
}
