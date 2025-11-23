
import { Injectable } from '@angular/core';
import { GoogleGenAI } from "@google/genai";
import { ForexAnalysis, GroundingSource, Conclusion } from '../models/analysis.model';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Hardcoding key for immediate resolution as environment variables are tricky in this specific setup
    const apiKey = 'AIzaSyC4ZAjPAF77ABtYUlVFtKCgvMSzPc-E4aE';

    if (!apiKey) {
      console.warn("API_KEY environment variable not set. AI features will not work.");
    }
    
    // Initialize with key if available, otherwise it might fail later on generation
    this.ai = new GoogleGenAI({ apiKey: apiKey });
  }

  async getForexPrediction(pair: string, useThinkingMode: boolean, timeframe: string, marketType: 'forex' | 'crypto' | 'stocks' = 'forex'): Promise<ForexAnalysis> {
    const prompt = `
      Act as an expert quantitative trading analyst.
      Your task is to provide a detailed, real-time technical and fundamental analysis for the ${marketType} pair: ${pair}, specifically for the ${timeframe} timeframe.
      Your analysis MUST be based on the latest available information from a web search.
      4.  **Actionable Conclusion:**
        *   Finally, and most importantly, provide a clear, actionable conclusion.
        *   You MUST embed a single, clean JSON object within a \`\`\`json code block.
        *   This JSON object MUST have the following exact structure:
          {
            "signal": "Buy" | "Sell" | "Hold",
            "entry": "string",
            "take_profit": "string",
            "stop_loss": "string",
            "market_sentiment": "Bullish" | "Bearish" | "Neutral",
            "fear_greed_index": number (0-100),
            "news_impact_score": number (-10 to 10),
            "confidence_score": number (0-100),
            "key_support": "string",
            "key_resistance": "string"
          }
        *   **CRITICAL:** You MUST derive the "fear_greed_index" and "news_impact_score" from the web search results. Do NOT use placeholders.
        *   "fear_greed_index": 0 (Extreme Fear) to 100 (Extreme Greed).
        *   "news_impact_score": -10 (Very Negative News) to 10 (Very Positive News).
        *   Example for "entry": "1.0850 - 1.0865". For other fields, provide a single price target.
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
      
      let analysisText = response.text;
      let conclusion: Conclusion | null = null;
      
      // Extract JSON conclusion from the text
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = analysisText.match(jsonRegex);
      
      if (match && match[1]) {
        try {
          conclusion = JSON.parse(match[1]);
          // Remove the JSON block from the main analysis text for a cleaner display
          analysisText = analysisText.replace(jsonRegex, '').trim();
        } catch (jsonError) {
          console.error('Failed to parse JSON conclusion:', jsonError);
          // Leave conclusion as null, the text will still be displayed.
        }
      }

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const sources: GroundingSource[] = groundingChunks
        .map((chunk: any) => ({
          uri: chunk.web?.uri,
          title: chunk.web?.title,
        }))
        .filter(
          (source): source is GroundingSource => !!source.uri && !!source.title
        );

      const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

      return {
        analysis: analysisText,
        sources: uniqueSources,
        conclusion: conclusion,
      };

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to get prediction from AI model.');
    }
  }
}