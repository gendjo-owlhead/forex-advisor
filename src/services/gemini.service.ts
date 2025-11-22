
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { ForexAnalysis } from '../models/analysis.model';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getForexPrediction(pair: string, useThinkingMode: boolean): Promise<ForexAnalysis> {
    const prompt = `
      Analyze the Forex currency pair: ${pair}. 
      Provide a detailed technical analysis, considering major trends, support/resistance levels, and key indicators.
      Based on your analysis, generate potential upward and downward signals.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        pair: { type: Type.STRING, description: 'The currency pair analyzed.' },
        prediction: { type: Type.STRING, description: "A brief summary of the market sentiment (e.g., 'Bullish', 'Bearish', 'Neutral')." },
        upwardSignal: { type: Type.STRING, description: 'A detailed explanation for a potential upward movement, including possible entry points and targets.' },
        downwardSignal: { type: Type.STRING, description: 'A detailed explanation for a potential downward movement, including possible entry points and targets.' },
        confidence: { type: Type.STRING, description: "Confidence level in this prediction (e.g., 'High', 'Medium', 'Low')." },
        disclaimer: { type: Type.STRING, description: 'A standard trading disclaimer about risks.' },
      },
      required: ['pair', 'prediction', 'upwardSignal', 'downwardSignal', 'confidence', 'disclaimer']
    };

    const config: any = {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5,
    };

    if (useThinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: config
      });

      const jsonText = response.text.trim();
      return JSON.parse(jsonText) as ForexAnalysis;

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to get prediction from AI model.');
    }
  }

  async analyzeImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    };
    const textPart = { text: prompt };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
      });
      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API for image analysis:', error);
      throw new Error('Failed to analyze the image.');
    }
  }

  startChat(): void {
    this.chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are an expert AI trading analyst named 'Signal'. Your purpose is to assist users by providing speculative trading analysis, insights, and potential trading ideas for the Forex market and other financial instruments. You can analyze market trends, identify patterns, and suggest potential buy or sell signals based on the data you have. 
It is crucial that with every response that contains a trading suggestion, you MUST include the following disclaimer: 'Disclaimer: This is not financial advice. All trading involves significant risk. The analysis provided is for informational purposes only and should not be considered a recommendation to buy or sell any security. Always do your own research and consult with a qualified financial advisor before making any investment decisions.'`,
        },
    });
  }

  async sendMessageStream(message: string): Promise<AsyncGenerator<GenerateContentResponse>> {
    if (!this.chat) {
        this.startChat();
    }
    return this.chat!.sendMessageStream({ message });
  }
}
