"use client";

import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Bot,
  Calculator,
  Check,
  ChevronDown,
  Flame,
  Hammer,
  Home,
  Leaf,
  Mail,
  MessageCircle,
  Mic,
  MicOff,
  Mountain,
  Package,
  Ruler,
  Send,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  TreePine,
  Waves,
  Wheat,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  live?: boolean;
};

type LiveTokenResponse = {
  error?: string;
  model?: string;
  token?: string;
};

type LiveSessionLike = {
  close(): void;
  sendRealtimeInput(params: {
    audio?: { data: string; mimeType: string };
    audioStreamEnd?: boolean;
  }): void;
};

type LiveServerMessage = {
  goAway?: { timeLeft?: string };
  serverContent?: {
    inputTranscription?: { text?: string };
    interrupted?: boolean;
    modelTurn?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
  };
  setupComplete?: unknown;
};

function createChatMessage(role: ChatMessage["role"], content: string, live = false): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    live
  };
}

const quickPrompts = [
  "I want to build a small backyard office, about 180 sq. ft. How much Hempcrete do I need?",
  "Can Hempcrete support my roof, and is it legal under U.S. codes?",
  "How long does it take to dry before I can move in?"
];

const productCards = [
  {
    icon: Hammer,
    title: "Starter DIY Kits",
    price: "Placeholder pricing",
    fit: "Interior retrofits, damp rooms, weekend projects",
    note: "Designed around hand-tamping between furring strips."
  },
  {
    icon: Blocks,
    title: "Pre-Cast Block Pallets",
    price: "Placeholder pricing",
    fit: "Backyard offices, ADUs, cabins, garage conversions",
    note: "Factory-cured blocks laid with thin lime mortar."
  },
  {
    icon: Package,
    title: "Loose-Mix Bulk Bundles",
    price: "Placeholder pricing",
    fit: "Custom cast-in-situ homes and multi-room builds",
    note: "Bulk hurds and binder for on-site mixing."
  }
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "Natural mold and pest defense",
    body: "High-pH lime helps regulate moisture and deters mold-friendly condensation."
  },
  {
    icon: ThermometerSun,
    title: "Superior thermal mass",
    body: "Warm in winter, cool in summer, with 30-40% lower heating and cooling bills."
  },
  {
    icon: Flame,
    title: "Fire-resistant and safe",
    body: "Mineral-rich hemp-lime is flame resistant and avoids toxic smoke from synthetics."
  },
  {
    icon: Sparkles,
    title: "DIY and skin-friendly",
    body: "Zero formaldehyde, no fiberglass itch, non-toxic handling for family-scale projects."
  }
];

const stories = [
  {
    image: "/images/case-study-basement.png",
    title: "Damp Basement to Warm Theater",
    before: "Cold walls, musty air, and recurring condensation.",
    after: "Breathable interior retrofit, quieter acoustics, and a dry mineral finish."
  },
  {
    image: "/images/case-study-backyard-office.png",
    title: "Backyard Studio Without the Chemical Box Feel",
    before: "A small office plan that needed speed, comfort, and clean air.",
    after: "Pre-cast hemp-lime blocks, lime plaster, and steady thermal comfort."
  },
  {
    image: "/images/hero-hempcrete-living-room.png",
    title: "Cold Bedroom to Natural Retreat",
    before: "Drafty exterior wall and concern over mold behind drywall.",
    after: "Thin hemp-lime layer over furring strips with a soft lime finish."
  }
];

const faqItems = [
  {
    question: "Is hempcrete related to marijuana?",
    answer:
      "No. Building hemp-lime uses industrial hemp hurds, is 0% THC, and has nothing to do with recreational marijuana."
  },
  {
    question: "Can it carry structural loads?",
    answer:
      "Hempcrete is non-load-bearing infill. A standard timber frame carries roof, floor, wind, and seismic loads."
  },
  {
    question: "Is it recognized by residential building codes?",
    answer:
      "Yes. The current 2024 International Residential Code includes hemp-lime construction in Appendix BL, giving designers and permit offices a clearer reference."
  },
  {
    question: "Will pests eat it?",
    answer:
      "The high-pH lime binder and mineralized matrix are naturally unattractive to pests compared with many organic cavities."
  }
];

function round(value: number, decimals = 1) {
  return Number.isFinite(value) ? value.toFixed(decimals) : "0.0";
}

function volumeM3(areaSqFt: number, thicknessInches: number) {
  const cubicFeet = areaSqFt * (thicknessInches / 12);
  return cubicFeet * 0.0283168;
}

function mergeTranscript(current: string, next: string) {
  const cleanNext = next.trim();
  if (!cleanNext) return current;
  if (!current) return cleanNext;
  if (cleanNext.startsWith(current)) return cleanNext;
  if (current.endsWith(cleanNext)) return current;
  return `${current}${/[a-zA-Z0-9]$/.test(current) ? " " : ""}${cleanNext}`;
}

function downsampleToPcm16(input: Float32Array, inputSampleRate: number, outputSampleRate = 16000) {
  if (inputSampleRate === outputSampleRate) {
    return floatToPcm16(input);
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) {
      sum += input[j];
    }
    output[i] = sum / Math.max(end - start, 1);
  }

  return floatToPcm16(output);
}

function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function pcm16ToBase64(input: Int16Array) {
  const bytes = new Uint8Array(input.buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function base64ToPcm16(input: string) {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function sampleRateFromMimeType(mimeType?: string) {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

function Estimator() {
  const [wallArea, setWallArea] = useState(420);
  const [thickness, setThickness] = useState(10);
  const [mode, setMode] = useState<"retrofit" | "blocks" | "cast">("blocks");

  const estimate = useMemo(() => {
    const m3 = volumeM3(wallArea, thickness);
    const cubicFeet = wallArea * (thickness / 12);
    const projectDays =
      mode === "retrofit" ? "2-4 DIY weekends" : mode === "blocks" ? "3-7 install days" : "3-6 week cure window";
    return {
      m3,
      cubicFeet,
      planningUnits:
        mode === "retrofit"
          ? Math.ceil(m3 / 0.55)
          : mode === "blocks"
            ? Math.ceil(m3 / 2.1)
            : Math.ceil(m3 / 3.5),
      projectDays
    };
  }, [mode, thickness, wallArea]);

  return (
    <div className="tool-panel" id="estimator">
      <div className="tool-heading">
        <Calculator aria-hidden="true" />
        <div>
          <p className="eyebrow">Live project estimator</p>
          <h3>Start with wall area, not final SKUs.</h3>
        </div>
      </div>
      <div className="input-grid">
        <label>
          <span>Wall area</span>
          <div className="input-unit">
            <input
              min="50"
              max="5000"
              type="number"
              value={wallArea}
              onChange={(event) => setWallArea(Number(event.target.value))}
            />
            <span>sq. ft.</span>
          </div>
        </label>
        <label>
          <span>Target thickness</span>
          <div className="input-unit">
            <input
              min="2"
              max="16"
              type="number"
              value={thickness}
              onChange={(event) => setThickness(Number(event.target.value))}
            />
            <span>in.</span>
          </div>
        </label>
      </div>
      <div className="segmented" role="group" aria-label="Project approach">
        {[
          ["retrofit", "Interior"],
          ["blocks", "Blocks"],
          ["cast", "Cast-in-situ"]
        ].map(([value, label]) => (
          <button
            className={mode === value ? "active" : ""}
            key={value}
            type="button"
            onClick={() => setMode(value as typeof mode)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="estimate-output">
        <div>
          <span>Material volume</span>
          <strong>{round(estimate.m3)} m³</strong>
          <small>{Math.round(estimate.cubicFeet)} cu. ft.</small>
        </div>
        <div>
          <span>Demo planning equivalent</span>
          <strong>{estimate.planningUnits}</strong>
          <small>final packaging TBD</small>
        </div>
        <div>
          <span>Typical pace</span>
          <strong>{estimate.projectDays}</strong>
          <small>site and weather dependent</small>
        </div>
      </div>
    </div>
  );
}

function CarbonCalculator() {
  const [floorArea, setFloorArea] = useState(1200);
  const [climate, setClimate] = useState("mixed");

  const results = useMemo(() => {
    const climateFactors: Record<string, { label: string; energy: number; wall: number }> = {
      hot: { label: "Hot / humid", energy: 0.95, wall: 0.24 },
      mixed: { label: "Mixed", energy: 1.15, wall: 0.28 },
      cold: { label: "Cold", energy: 1.45, wall: 0.33 }
    };
    const factor = climateFactors[climate];
    const wallArea = floorArea * factor.wall * 10;
    const m3 = volumeM3(wallArea, 10);
    const lockedKg = m3 * 115;
    const trees = lockedKg / 21.8;
    const annualSpend = floorArea * factor.energy;
    const savings = annualSpend * 0.35;
    return { factor, wallArea, m3, lockedKg, trees, savings };
  }, [climate, floorArea]);

  return (
    <section className="section calculator-section" id="calculator">
      <div className="section-inner split">
        <div>
          <p className="eyebrow">Carbon and energy calculator</p>
          <h2>Show the comfort case in numbers.</h2>
          <p className="section-copy">
            These live formulas are intentionally simple for a sales demo. They keep the logic in floor area,
            climate, wall volume, carbon storage, and plausible annual HVAC savings.
          </p>
          <div className="calculator-note">
            <TreePine aria-hidden="true" />
            <span>Planning estimate only. Final engineering depends on wall design, climate, openings, and code path.</span>
          </div>
        </div>
        <div className="tool-panel">
          <div className="input-grid">
            <label>
              <span>Project floor area</span>
              <div className="input-unit">
                <input
                  min="200"
                  max="8000"
                  type="number"
                  value={floorArea}
                  onChange={(event) => setFloorArea(Number(event.target.value))}
                />
                <span>sq. ft.</span>
              </div>
            </label>
            <label>
              <span>Climate zone</span>
              <select value={climate} onChange={(event) => setClimate(event.target.value)}>
                <option value="hot">Hot / humid</option>
                <option value="mixed">Mixed</option>
                <option value="cold">Cold</option>
              </select>
            </label>
          </div>
          <div className="estimate-output energy-output">
            <div>
              <span>Estimated wall volume</span>
              <strong>{round(results.m3)} m³</strong>
              <small>{Math.round(results.wallArea)} sq. ft. envelope proxy</small>
            </div>
            <div>
              <span>CO2 locked away</span>
              <strong>{Math.round(results.lockedKg).toLocaleString()} kg</strong>
              <small>about {Math.round(results.trees)} tree-years</small>
            </div>
            <div>
              <span>Annual HVAC savings</span>
              <strong>${Math.round(results.savings).toLocaleString()}</strong>
              <small>based on 35% efficiency gain</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "listening" | "speaking" | "error">("idle");
  const [voiceError, setVoiceError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    createChatMessage(
      "assistant",
      "Hi, I am the Craig Hempcrete project guide. Tell me what you are building, and I will help scope wall area, thickness, material volume in m³, and the best approach."
    )
  ]);
  const liveSessionRef = useRef<LiveSessionLike | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const setupCompleteRef = useRef(false);
  const activeUserTranscriptIdRef = useRef<string | null>(null);
  const activeAssistantTranscriptIdRef = useRef<string | null>(null);
  const playbackTimeRef = useRef(0);
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    return () => stopVoiceSession();
  }, []);

  function appendLiveTranscript(role: ChatMessage["role"], text: string) {
    const idRef = role === "user" ? activeUserTranscriptIdRef : activeAssistantTranscriptIdRef;

    setMessages((current) => {
      if (!idRef.current) {
        const message = createChatMessage(role, text.trim(), true);
        idRef.current = message.id;
        return [...current, message];
      }

      let found = false;
      const nextMessages = current.map((message) => {
        if (message.id !== idRef.current) return message;
        found = true;
        return {
          ...message,
          content: mergeTranscript(message.content, text),
          live: true
        };
      });

      if (found) return nextMessages;

      const message = createChatMessage(role, text.trim(), true);
      idRef.current = message.id;
      return [...current, message];
    });
  }

  function clearPlaybackQueue() {
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    });
    playbackSourcesRef.current = [];
    playbackTimeRef.current = outputAudioContextRef.current?.currentTime ?? 0;
  }

  async function ensureOutputAudioContext() {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error("This browser does not support Web Audio playback.");
    }

    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === "closed") {
      outputAudioContextRef.current = new AudioContextCtor();
      playbackTimeRef.current = outputAudioContextRef.current.currentTime;
    }

    if (outputAudioContextRef.current.state === "suspended") {
      await outputAudioContextRef.current.resume();
    }

    return outputAudioContextRef.current;
  }

  async function playAudioChunk(data: string, mimeType?: string) {
    const outputAudioContext = await ensureOutputAudioContext();
    const pcm = base64ToPcm16(data);
    const sourceSampleRate = sampleRateFromMimeType(mimeType);
    const audioBuffer = outputAudioContext.createBuffer(1, pcm.length, sourceSampleRate);
    const channel = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcm.length; i += 1) {
      channel[i] = pcm[i] / 0x8000;
    }

    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContext.destination);
    source.onended = () => {
      playbackSourcesRef.current = playbackSourcesRef.current.filter((item) => item !== source);
    };

    const startAt = Math.max(outputAudioContext.currentTime + 0.03, playbackTimeRef.current);
    source.start(startAt);
    playbackTimeRef.current = startAt + audioBuffer.duration;
    playbackSourcesRef.current.push(source);
    setVoiceStatus("speaking");
  }

  async function startAudioCapture(stream: MediaStream) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error("This browser does not support microphone audio processing.");
    }

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;

    processor.onaudioprocess = (event) => {
      const session = liveSessionRef.current;
      if (!setupCompleteRef.current || !session) return;

      const pcm = downsampleToPcm16(event.inputBuffer.getChannelData(0), audioContext.sampleRate);
      session.sendRealtimeInput({
        audio: {
          data: pcm16ToBase64(pcm),
          mimeType: "audio/pcm;rate=16000"
        }
      });
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    inputAudioContextRef.current = audioContext;
    micSourceRef.current = source;
    processorRef.current = processor;
    silentGainRef.current = silentGain;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  }

  function handleLiveMessage(response: LiveServerMessage) {

    if (response.setupComplete) {
      setupCompleteRef.current = true;
      setVoiceStatus("listening");
      return;
    }

    if (response.goAway?.timeLeft) {
      setVoiceError("Gemini Live session is nearing its time limit. Restart voice mode if needed.");
    }

    if (!response.serverContent) return;

    const serverContent = response.serverContent;

    if (serverContent.interrupted) {
      clearPlaybackQueue();
    }

    if (serverContent.inputTranscription?.text) {
      appendLiveTranscript("user", serverContent.inputTranscription.text);
    }

    if (serverContent.outputTranscription?.text) {
      appendLiveTranscript("assistant", serverContent.outputTranscription.text);
    }

    const parts = serverContent.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inlineData = part.inlineData;
      if (inlineData?.data) {
        void playAudioChunk(inlineData.data, inlineData.mimeType);
      }
    }

    if (serverContent.turnComplete) {
      activeUserTranscriptIdRef.current = null;
      activeAssistantTranscriptIdRef.current = null;
      setVoiceStatus("listening");
    }
  }

  async function startVoiceSession() {
    if (voiceStatus === "connecting" || voiceStatus === "listening" || voiceStatus === "speaking") {
      stopVoiceSession();
      return;
    }

    setOpen(true);
    setVoiceStatus("connecting");
    setVoiceError("");
    setupCompleteRef.current = false;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not available in this browser.");
      }

      await ensureOutputAudioContext();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      micStreamRef.current = stream;
      await startAudioCapture(stream);

      const tokenResponse = await fetch("/api/live-token", { method: "POST" });
      const tokenData = (await tokenResponse.json()) as LiveTokenResponse;

      if (!tokenResponse.ok || !tokenData.token || !tokenData.model) {
        throw new Error(tokenData.error || "Unable to start Gemini Live voice mode.");
      }

      const { ActivityHandling, EndSensitivity, GoogleGenAI, Modality, StartSensitivity } = await import(
        "@google/genai/web"
      );
      const ai = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: "v1alpha" }
      });

      const session = await ai.live.connect({
        model: tokenData.model,
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 0.55,
          speechConfig: {
            languageCode: "en-US"
          },
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
        },
        callbacks: {
          onopen: () => {
            setupCompleteRef.current = true;
            setVoiceStatus("listening");
          },
          onmessage: handleLiveMessage,
          onerror: (event) => {
            setVoiceStatus("error");
            setVoiceError(
              event.message || "Gemini Live connection failed. Check API access and redeploy environment variables."
            );
          },
          onclose: (event) => {
            setupCompleteRef.current = false;
            liveSessionRef.current = null;
            if (event.code !== 1000 && event.code !== 1005) {
              setVoiceError(event.reason || `Gemini Live closed unexpectedly (${event.code}).`);
            }
            setVoiceStatus((current) => (current === "error" ? "error" : "idle"));
          }
        }
      });

      liveSessionRef.current = session;
      setupCompleteRef.current = true;
      setVoiceStatus("listening");
    } catch (error) {
      stopVoiceSession("error");
      setVoiceError(error instanceof Error ? error.message : "Unable to start voice mode.");
    }
  }

  function stopVoiceSession(nextStatus: "idle" | "error" = "idle") {
    setupCompleteRef.current = false;

    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // The session may already be closing.
      }
    }
    liveSessionRef.current?.close();
    liveSessionRef.current = null;

    processorRef.current?.disconnect();
    micSourceRef.current?.disconnect();
    silentGainRef.current?.disconnect();
    processorRef.current = null;
    micSourceRef.current = null;
    silentGainRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== "closed") {
      void inputAudioContextRef.current.close();
    }
    inputAudioContextRef.current = null;

    clearPlaybackQueue();
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== "closed") {
      void outputAudioContextRef.current.close();
    }
    outputAudioContextRef.current = null;

    activeUserTranscriptIdRef.current = null;
    activeAssistantTranscriptIdRef.current = null;
    if (nextStatus === "idle") {
      setVoiceError("");
    }
    setVoiceStatus(nextStatus);
  }

  async function sendMessage(value?: string) {
    const content = (value ?? input).trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, createChatMessage("user", content)];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });
      const data = await response.json();
      setMessages((current) => [
        ...current,
        createChatMessage(
          "assistant",
          data.reply ||
            "I can help scope that from wall area and thickness. What square footage are you considering?"
        )
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        createChatMessage(
          "assistant",
          "I could not reach the assistant service, but the project math still starts with wall area in sq. ft. and thickness in inches. What dimensions are you working with?"
        )
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`chat-widget ${open ? "open" : ""}`}>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Craig Hempcrete AI Assistant">
          <div className="chat-header">
            <div>
              <span className="chat-kicker">
                <Bot size={16} aria-hidden="true" />
                AI project guide
              </span>
              <strong>Scope your Hempcrete build</strong>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close chat"
              onClick={() => {
                stopVoiceSession();
                setOpen(false);
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((message) => (
              <div className={`message ${message.role} ${message.live ? "live" : ""}`} key={message.id}>
                {message.content}
              </div>
            ))}
            {loading && <div className="message assistant">Thinking through the project volume...</div>}
          </div>
          <div className="quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          {voiceError && <p className="chat-error" role="alert">{voiceError}</p>}
          <form
            className={`chat-form voice-${voiceStatus}`}
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              aria-label="Ask the Hempcrete assistant"
              placeholder="Ask about volume, codes, cost, or drying..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              className="icon-button voice-toggle"
              type="button"
              aria-label={
                voiceStatus === "listening" || voiceStatus === "speaking" || voiceStatus === "connecting"
                  ? "Stop voice mode"
                  : "Start voice mode"
              }
              title={
                voiceStatus === "listening" || voiceStatus === "speaking" || voiceStatus === "connecting"
                  ? "Stop voice"
                  : "Start voice"
              }
              onClick={startVoiceSession}
            >
              {voiceStatus === "listening" || voiceStatus === "speaking" || voiceStatus === "connecting" ? (
                <MicOff size={18} aria-hidden="true" />
              ) : (
                <Mic size={18} aria-hidden="true" />
              )}
            </button>
            <button className="icon-button send" type="submit" aria-label="Send message" disabled={loading}>
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
        )}
      <button
        className="chat-toggle"
        type="button"
        onClick={() => {
          if (open) {
            stopVoiceSession();
          }
          setOpen((value) => !value);
        }}
      >
        {open ? <ChevronDown aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
        <span>{open ? "Close" : "Ask Craig AI"}</span>
      </button>
    </div>
  );
}

export function HempcreteSite() {
  const [cartMessage, setCartMessage] = useState("");
  const [guideMessage, setGuideMessage] = useState("");

  function handleGuideSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuideMessage("Guide request captured for the demo. A real email/PDF backend can be connected later.");
    event.currentTarget.reset();
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Craig Hempcrete home">
          <span>CH</span>
          <strong>Craig Hempcrete</strong>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#material">Material</a>
          <a href="#shop">Shop</a>
          <a href="#calculator">Calculator</a>
          <a href="#maker">Maker</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <img src="/images/hero-hempcrete-living-room.png" alt="" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <p className="eyebrow">Carbon-negative hemp-lime walls for U.S. homeowners</p>
            <h1>Breathable Walls. Healthier Living.</h1>
            <p>
              Zero-VOC, mold-resistant, fire-resistant, insulating hempcrete for DIY retrofits, pre-cast
              backyard builds, and natural custom homes.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#shop">
                <Hammer size={18} aria-hidden="true" />
                Explore DIY Projects
              </a>
              <a className="button secondary" href="#calculator">
                <Calculator size={18} aria-hidden="true" />
                Calculate My Energy Savings
              </a>
            </div>
            <div className="hero-proof" aria-label="Key facts">
              <span>100% legal</span>
              <span>0% THC</span>
              <span>Fire-resistant</span>
              <span>2024 IRC Appendix BL</span>
            </div>
          </div>
        </section>

        <section className="section material-section" id="material">
          <div className="section-inner">
            <div className="section-header">
              <p className="eyebrow">What is Hempcrete?</p>
              <h2>A simple mineral wall system that cures harder over time.</h2>
              <p>
                Hempcrete is made from industrial hemp hurds, lime binder, and water. As the lime carbonates,
                the wall becomes a breathable, stone-like mineral matrix that manages moisture and stores carbon.
              </p>
            </div>
            <div className="formula" aria-label="Hempcrete material formula">
              <div>
                <Wheat aria-hidden="true" />
                <strong>Industrial Hemp Hurds</strong>
                <span>woody core, 0% THC</span>
              </div>
              <span className="operator">+</span>
              <div>
                <Mountain aria-hidden="true" />
                <strong>Lime Binder</strong>
                <span>high-pH mineral matrix</span>
              </div>
              <span className="operator">+</span>
              <div>
                <Waves aria-hidden="true" />
                <strong>Water</strong>
                <span>mix, tamp, cure</span>
              </div>
              <span className="operator">=</span>
              <div className="result">
                <Home aria-hidden="true" />
                <strong>Breathable Hemp-Lime Wall</strong>
                <span>legal, fire-resistant, unrelated to recreational marijuana</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section benefits-section">
          <div className="section-inner">
            <div className="section-header compact">
              <p className="eyebrow">Health and lifestyle benefits</p>
              <h2>Built for comfort without sealing your home in chemicals.</h2>
            </div>
            <div className="benefit-grid">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article className="benefit-card" key={benefit.title}>
                    <Icon aria-hidden="true" />
                    <h3>{benefit.title}</h3>
                    <p>{benefit.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section shop-section" id="shop">
          <div className="section-inner">
            <div className="section-header">
              <p className="eyebrow">Shop by project stage</p>
              <h2>Choose the approach before the package count.</h2>
              <p>
                Pricing is intentionally shown as placeholder because final SKUs are not set. The demo keeps
                decisions anchored to wall area, thickness, and project fit.
              </p>
            </div>
            <div className="product-grid">
              {productCards.map((product) => {
                const Icon = product.icon;
                return (
                  <article className="product-card" key={product.title}>
                    <div className="product-icon">
                      <Icon aria-hidden="true" />
                    </div>
                    <h3>{product.title}</h3>
                    <p className="price">{product.price}</p>
                    <p>{product.fit}</p>
                    <small>{product.note}</small>
                    <button
                      type="button"
                      onClick={() => setCartMessage(`${product.title} added to the demo cart. Checkout is out of scope.`)}
                    >
                      Add to mock cart
                    </button>
                  </article>
                );
              })}
            </div>
            {cartMessage && <p className="toast" role="status">{cartMessage}</p>}
            <Estimator />
          </div>
        </section>

        <CarbonCalculator />

        <section className="section maker-section" id="maker">
          <div className="section-inner maker-grid">
            <div className="maker-copy">
              <p className="eyebrow">Meet the maker</p>
              <h2>Homes should feel like healthy sanctuaries, not chemical boxes.</h2>
              <p>
                Craig came to hempcrete through hands-on natural building: mixing, tamping, testing, and
                watching ordinary walls become quieter, warmer, and more forgiving. The promise is not just a
                product sale. It is a guided path from first mix to final wall.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> Field-tested expertise from a founder who actually builds.</li>
                <li><Check aria-hidden="true" /> Supportive guidance for first-time natural builders.</li>
                <li><Check aria-hidden="true" /> Practical choices for retrofits, blocks, and cast-in-place homes.</li>
              </ul>
            </div>
            <div className="founder-photos" aria-label="Founder photos">
              <figure>
                <img src="/images/founder-mixing.jpg" alt="Founder mixing hempcrete on-site with a drum mixer" />
                <figcaption>Mixing hemp-lime on site.</figcaption>
              </figure>
              <figure>
                <img src="/images/founder-wall.jpg" alt="Founder standing beside a tamped hempcrete wall section" />
                <figcaption>Reviewing a tamped wall assembly.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="section guide-section">
          <div className="section-inner">
            <div className="section-header compact">
              <p className="eyebrow">Build sequence and workshops</p>
              <h2>From timber frame to lime plaster finish.</h2>
            </div>
            <div className="step-grid">
              {[
                ["01", "Timber Framing", "A conventional frame carries structural loads."],
                ["02", "Slip-Forming", "Temporary forms define the wall cavity and thickness."],
                ["03", "Mixing and Tamping", "Hemp hurds, lime, and water are lightly tamped in lifts."],
                ["04", "Lime Plaster Finish", "A breathable mineral finish protects the wall."]
              ].map(([number, title, body]) => (
                <article className="step-card" key={title}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
            <div className="lead-grid">
              <form className="lead-form" onSubmit={handleGuideSubmit}>
                <div>
                  <p className="eyebrow">Free homeowner guide</p>
                  <h3>Get the DIY installation and tool checklist.</h3>
                </div>
                <label>
                  <span>Email address</span>
                  <input required type="email" placeholder="you@example.com" />
                </label>
                <button className="button primary" type="submit">
                  <Mail size={18} aria-hidden="true" />
                  Request Guide
                </button>
                {guideMessage && <p role="status">{guideMessage}</p>}
              </form>
              <aside className="workshop-card">
                <p className="eyebrow">Workshop preview</p>
                <h3>Natural Building Field Day</h3>
                <p>Fall 2026, Pacific Northwest learning site. Hands-on mixing, tamping, and lime plaster demos.</p>
                <a href="#top">Join interest list</a>
              </aside>
            </div>
          </div>
        </section>

        <section className="section proof-section" id="faq">
          <div className="section-inner">
            <div className="section-header">
              <p className="eyebrow">Proof and homeowner questions</p>
              <h2>Clear answers for the first concerns prospects raise.</h2>
            </div>
            <div className="story-grid">
              {stories.map((story) => (
                <article className="story-card" key={story.title}>
                  <img src={story.image} alt="" />
                  <div>
                    <h3>{story.title}</h3>
                    <p><strong>Before:</strong> {story.before}</p>
                    <p><strong>After:</strong> {story.after}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="faq-grid">
              {faqItems.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <div className="code-note">
              <BadgeCheck aria-hidden="true" />
              <p>
                Demo citation note: hemp-lime construction is referenced in the 2024 IRC as Appendix BL. Local
                adoption and permit details still depend on the jurisdiction.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Craig Hempcrete demo site</span>
      </footer>

      <ChatWidget />
    </>
  );
}
