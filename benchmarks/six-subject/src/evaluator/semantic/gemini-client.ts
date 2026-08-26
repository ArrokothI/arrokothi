import type { JudgeClient } from "./judge.ts";

export interface GeminiJudgeClientOptions {
  apiKey: string;
  model: string;
  temperature?: number;
}

interface GeminiGenerateContentResponse {
  modelVersion?: string;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export class GeminiJudgeClient implements JudgeClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor(options: GeminiJudgeClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.temperature = options.temperature ?? 0;
  }

  async judge(prompt: string): Promise<{ text: string; providerReportedModel?: string }> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.temperature,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini judge request failed: ${response.status} ${body.slice(0, 500)}`);
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("")
        .trim() ?? "";
    if (!text) throw new Error("Gemini judge returned no text");
    return { text, providerReportedModel: data.modelVersion };
  }
}
