import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity
} from "@google/genai";
import { NextResponse } from "next/server";
import { HEMPCRETE_SYSTEM_PROMPT } from "../../lib/hempcretePrompt";

export const runtime = "nodejs";

const LIVE_MODEL = "gemini-3.1-flash-live-preview";

const liveConfig = {
  responseModalities: [Modality.AUDIO],
  temperature: 0.55,
  speechConfig: {
    languageCode: "en-US",
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: process.env.GEMINI_LIVE_VOICE || "Kore"
      }
    }
  },
  systemInstruction: HEMPCRETE_SYSTEM_PROMPT,
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  realtimeInputConfig: {
    activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
    automaticActivityDetection: {
      startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
      endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
      silenceDurationMs: 700
    }
  }
};

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "GEMINI_API_KEY is required to start Gemini Live voice mode."
      },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" }
    });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: liveConfig
        }
      }
    });

    if (!token.name) {
      return NextResponse.json(
        { error: "Gemini did not return a Live API token." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      model: LIVE_MODEL,
      token: token.name
    });
  } catch (error) {
    console.error("Failed to create Gemini Live token", error);
    return NextResponse.json(
      {
        error:
          "Unable to create a Gemini Live token. Confirm the API key has Gemini Live API access for gemini-3.1-flash-live-preview."
      },
      { status: 502 }
    );
  }
}
