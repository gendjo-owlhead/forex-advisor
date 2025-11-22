
import { Injectable } from '@angular/core';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
// FIX: Import GroundingSource to correctly type the API response data.
import { ForexAnalysis, GroundingSource } from '../models/analysis.model';

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

  async getForexPrediction(pair: string, useThinkingMode: boolean, timeframe: string): Promise<ForexAnalysis> {
    const prompt = `
      Act as an expert quantitative trading analyst.
      Your task is to provide a detailed, real-time technical and fundamental analysis for the Forex currency pair: ${pair}, specifically for the ${timeframe} timeframe.

      Your analysis MUST be based on the latest available information from a web search.

      1.  **Technical Analysis (${timeframe} chart):**
        *   Analyze the current price action and identify key candlestick patterns (e.g., Doji, Engulfing, Hammer).
        *   Identify major support and resistance levels relevant to this timeframe.
        *   Incorporate multiple technical indicators appropriate for the ${timeframe} timeframe. For shorter timeframes (1H and below), focus on momentum indicators like RSI and Stochastics. For longer timeframes (4H, 1D), use trend-following indicators like Moving Averages (e.g., 50, 200 EMA) and MACD.
        *   Mention how these indicators, when backtested on historical data for this pair, typically perform.

      2.  **Fundamental Analysis:**
        *   Briefly summarize any recent high-impact news or economic data (e.g., interest rate decisions, inflation reports, geopolitical events) that could be influencing the pair's movement right now.

      3.  **Synthesis & Outlook:**
        *   Synthesize the technical and fundamental analysis. Is there a confluence of signals? Are indicators confirming the price action?
        *   Conclude with a potential short-term outlook (next few periods on the ${timeframe} chart) and a medium-term outlook. Provide a clear, actionable summary.
    `;

    const config: any = {
        tools: [{googleSearch: {}}],
        temperature: 0.2,
    };

    if (useThinkingMode) {
      config.temperature = 0.7;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: config
      });
      
      const analysisText = response.text;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const sources: GroundingSource[] = groundingChunks
        .map((chunk: any) => ({
          uri: chunk.web?.uri,
          title: chunk.web?.title,
        }))
        .filter(
          (source): source is GroundingSource => !!source.uri && !!source.title
        );

      // Deduplicate sources based on URI
      const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

      return {
        analysis: analysisText,
        sources: uniqueSources,
      };

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
