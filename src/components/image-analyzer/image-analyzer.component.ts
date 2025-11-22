
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-image-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-analyzer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageAnalyzerComponent {
  private geminiService = inject(GeminiService);

  prompt = signal<string>('What is shown in this image?');
  imagePreview = signal<string | null>(null);
  private imageFile: { content: string, mimeType: string } | null = null;

  result = signal<string | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.imagePreview.set(dataUrl);
      const [mimeType, content] = dataUrl.split(';base64,');
      this.imageFile = { content, mimeType: mimeType.replace('data:', '') };
      this.result.set(null);
      this.error.set(null);
    };
    reader.readAsDataURL(file);
  }

  async analyzeImage(): Promise<void> {
    if (!this.imageFile || !this.prompt()) {
      this.error.set('Please upload an image and provide a prompt.');
      return;
    }

    this.isLoading.set(true);
    this.result.set(null);
    this.error.set(null);

    try {
      const analysis = await this.geminiService.analyzeImage(this.prompt(), this.imageFile.content, this.imageFile.mimeType);
      this.result.set(analysis);
    } catch (e) {
      console.error('Image analysis failed:', e);
      this.error.set('Failed to analyze the image. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
