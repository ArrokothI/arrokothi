
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Icons, PROPERTIES } from '../constants';
import { ChatMessage } from '../types';

// Audio helpers
function pcmEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function pcmDecode(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function toAudioBuffer(data: Uint8Array, ctx: AudioContext, rate: number): Promise<AudioBuffer> {
  const int16 = new Int16Array(data.buffer);
  const buf = ctx.createBuffer(1, int16.length, rate);
  const channel = buf.getChannelData(0);
  for (let i = 0; i < int16.length; i++) channel[i] = int16[i] / 32768.0;
  return buf;
}

// ── Types ──
interface SessionData {
  stage: 'intent' | 'core_needs' | 'core_needs_timeline' | 'intent_specific' | 'value_exchange' | 'lead_name' | 'lead_phone' | 'lead_email' | 'handoff' | 'complete';
  intent?: string;
  location?: string;
  budget?: string;
  timeline?: string;
  financing?: string;
  bedrooms?: string;
  zipCode?: string;
  listingPreference?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  contactPreference?: string;
  bestTime?: string;
}

const INITIAL_SESSION: SessionData = { stage: 'intent' };

const WELCOME = "Hi! I'm your real estate AI assistant. I can help you buy, rent, or sell... Are you looking to buy, rent, or sell today?";

// ── System prompt (shared by text & voice) ──
function systemPrompt(s: SessionData): string {
  return `You are a friendly, warm real estate assistant for EstatePro. Talk like a real person — short, casual, natural sentences. You are a helpful friend who knows real estate.

RULES:
- NEVER use markdown (no **, ##, bullet points).
- NEVER reveal internal reasoning, plans, or what you're "about to do."
- NEVER say things like "I've registered", "shifting focus", "my assessment".
- 1-3 short sentences max. Sound human, not robotic.

STAGE: ${s.stage}
DATA: ${JSON.stringify(s)}
PROPERTIES: ${JSON.stringify(PROPERTIES)}

WHAT TO SAY (only for current stage):

intent → Figure out buy/rent/sell. Unclear? "Sorry, I didn't catch that. Are you looking to buy, rent, or sell?" Clear? "Great! Which area are you targeting? And what's your approximate budget range?"
core_needs → They said area/budget. Acknowledge, then: "And what's your timeline?"
core_needs_timeline → They said timeline. Then ask: buy→"Are you already pre-approved for a mortgage, or paying cash?" rent→"How many bedrooms are you looking for?" sell→"What's the zip code of the property you'd like to sell?"
intent_specific → They answered. Pick 2 matching properties: "Found it! Here are 2 quick previews: 1. [Price] in [Location] — [feature]. 2. [Price] in [Location] — [feature]. Which one catches your eye, 1 or 2?"
value_exchange → They picked. "Great taste! Can I get your name?"
lead_name → Got name. "Thanks, [Name]! To send you the full photos and details, what's your cell phone number?"
lead_phone → Got number? "Got it! And what's your email address?" Refused? "I totally get it — but I do need a way to send you the photos. How about just sharing your number for now?"
lead_email → Got/skipped email. "Last thing — would you prefer our agent to reach out by text or call? And what time works best for you?"
handoff → Got preference+time. "Perfect, [Name]! Our agent will [text/call] you around [time]. Excited to help you out!"
complete → Chat naturally about properties.

IMPORTANT — After your response, on a NEW line add (user won't see this):
|||EXTRACT|||{"stage":"${s.stage}","next_stage":"<next>","data":{<fields>}}|||END|||
Transitions: intent→core_needs→core_needs_timeline→intent_specific→value_exchange→lead_name→lead_phone→lead_email→handoff→complete
Keys: intent, location, budget, timeline, financing, bedrooms, zipCode, listingPreference, firstName, lastName, phone, email, contactPreference, bestTime
Keep next_stage = current stage if extraction incomplete.`;
}

// ── Email helpers ──
async function buildAnalysis(msgs: ChatMessage[], s: SessionData): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const log = msgs.map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.text}`).join('\n');
    const r = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `Analyze this real estate lead conversation:\n\n${log}\n\nLead data:\n${JSON.stringify(s, null, 2)}\n\nProvide: Lead quality (Hot/Warm/Cold), intent, requirements, follow-up approach, contact details.`,
      config: { systemInstruction: 'You are a real estate lead analyst. Be concise and professional.' }
    });
    return r.text || 'Analysis unavailable.';
  } catch {
    return `Name: ${s.firstName} ${s.lastName}\nPhone: ${s.phone}\nEmail: ${s.email || 'N/A'}\nIntent: ${s.intent}\nLocation: ${s.location}\nBudget: ${s.budget}\nTimeline: ${s.timeline}\nContact: ${s.contactPreference} at ${s.bestTime}`;
  }
}

async function sendEmail(s: SessionData, analysis: string): Promise<boolean> {
  try {
    const r = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadName: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        phone: s.phone || '', email: s.email || '', intent: s.intent || '',
        location: s.location || '', budget: s.budget || '', timeline: s.timeline || '',
        financing: s.financing || '', bedrooms: s.bedrooms || '', zipCode: s.zipCode || '',
        listingPreference: s.listingPreference || '', contactPreference: s.contactPreference || '',
        bestTime: s.bestTime || '', analysis,
      }),
    });
    return r.ok;
  } catch { return false; }
}

// ── Component ──
const AIConcierge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [messages, setMessages] = useState<(ChatMessage & { grounding?: any[] })[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isModelTyping, setIsModelTyping] = useState(false);
  const [session, setSession] = useState<SessionData>(INITIAL_SESSION);
  const [emailSent, setEmailSent] = useState(false);

  // Refs
  const welcomeSent = useRef(false);
  const hasAutoPopped = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const sessionRef = useRef<any>(null);
  const sessionDataRef = useRef(session);
  const emailSentRef = useRef(false);

  // Audio refs
  const inputAudioCtx = useRef<AudioContext | null>(null);
  const outputAudioCtx = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlayTime = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecRef = useRef<any>(null);

  // Voice text accumulator
  const voiceTextBuf = useRef('');
  const voiceMsgId = useRef<string | null>(null);
  const isGeneratingText = useRef(false);

  // Keep refs synced
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { sessionDataRef.current = session; }, [session]);
  useEffect(() => { emailSentRef.current = emailSent; }, [emailSent]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Auto-pop on scroll to bottom
  useEffect(() => {
    const onScroll = () => {
      if (hasAutoPopped.current) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        setIsOpen(true);
        hasAutoPopped.current = true;
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0 && !welcomeSent.current) {
      welcomeSent.current = true;
      pushMsg('model', WELCOME);
    }
  }, [isOpen]);

  // ── Message helpers ──
  const pushMsg = useCallback((role: 'user' | 'model', text: string, grounding?: any[]) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      role, text, timestamp: new Date(), grounding,
    }]);
  }, []);

  const clearChat = () => {
    if (!window.confirm('Clear chat and start over?')) return;
    setMessages([]);
    setSession(INITIAL_SESSION);
    setEmailSent(false);
    welcomeSent.current = false;
  };

  // ── Extraction parser ──
  const parseExtraction = useCallback((fullText: string) => {
    if (!fullText.includes('|||EXTRACT|||')) return fullText;
    const [display, rest] = fullText.split('|||EXTRACT|||');
    const jsonStr = rest?.split('|||END|||')[0]?.trim();
    if (jsonStr) {
      try {
        const { data, next_stage } = JSON.parse(jsonStr);
        setSession(prev => {
          const updated = { ...prev };
          if (data) Object.entries(data).forEach(([k, v]) => { if (v) (updated as any)[k] = v; });
          if (next_stage) updated.stage = next_stage;

          // Trigger email at completion
          if (updated.stage === 'complete' && updated.bestTime && !emailSentRef.current) {
            setEmailSent(true);
            emailSentRef.current = true;
            (async () => {
              try {
                const analysis = await buildAnalysis(messagesRef.current, updated);
                const ok = await sendEmail(updated, analysis);
                pushMsg('model', ok
                  ? "Awesome — I've sent your details over to our team. They'll be reaching out soon!"
                  : "Your info is saved! Our team will reach out to you soon.");
              } catch {
                pushMsg('model', "Your info is saved! Our team will reach out to you soon.");
              }
            })();
          }
          return updated;
        });
      } catch (e) { console.error('Extract parse error:', e); }
    }
    return display.trim();
  }, [pushMsg]);

  // ── Text submit ──
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    pushMsg('user', text);
    setIsModelTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const history = [...messages.map(m => ({ role: m.role as 'user' | 'model', parts: [{ text: m.text }] })),
        { role: 'user' as const, parts: [{ text }] }];

      const r = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: history,
        config: { tools: [{ googleMaps: {} }], systemInstruction: systemPrompt(session) },
      });

      const fullText = r.text || "Sorry, I couldn't process that. Could you try again?";
      const grounding = r.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const display = parseExtraction(fullText);
      pushMsg('model', display, grounding);
    } catch {
      pushMsg('model', "Something went wrong on my end. Could you try again?");
    } finally {
      setIsModelTyping(false);
    }
  };

  // ── Audio helpers ──
  const stopAudio = () => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current.clear();
    nextPlayTime.current = 0;
  };

  // ── Voice session ──
  const startVoice = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setMode('voice');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      if (!inputAudioCtx.current) inputAudioCtx.current = new AudioContext({ sampleRate: 16000 });
      if (!outputAudioCtx.current) outputAudioCtx.current = new AudioContext({ sampleRate: 24000 });

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = mic;

      // SpeechRecognition for user transcript
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (ev: any) => {
          const t = ev.results[ev.results.length - 1][0].transcript.trim();
          if (t) pushMsg('user', t);
        };
        rec.onerror = (ev: any) => {
          if (ev.error !== 'aborted') try { rec.start(); } catch {}
        };
        rec.onend = () => {
          // auto-restart while voice mode is active
          if (sessionRef.current) try { rec.start(); } catch {}
        };
        rec.start();
        speechRecRef.current = rec;
      }

      const voiceSysPrompt = `You are a friendly real estate assistant on a voice call. Talk like a real person — casual, warm, short sentences.

RULES:
- NEVER describe what you're doing internally.
- NEVER use markdown.
- NEVER narrate your thought process.
- Just say what you would actually say out loud to a person on the phone.
- 1-3 short, natural sentences only.

STAGE: ${session.stage}
DATA: ${JSON.stringify(session)}
PROPERTIES: ${JSON.stringify(PROPERTIES)}

WHAT TO SAY (current stage only):
intent → buy/rent/sell? Unclear: "Sorry, I didn't catch that. Are you looking to buy, rent, or sell?" Clear: "Great! Which area are you targeting? And what's your approximate budget range?"
core_needs → Acknowledge area/budget, ask: "What's your timeline?"
core_needs_timeline → Acknowledge timeline, ask: buy→"Are you pre-approved for a mortgage, or paying cash?" rent→"How many bedrooms?" sell→"What's the zip code?"
intent_specific → Pick 2 properties: "Here are 2 options: 1. [Price] in [Location], [feature]. 2. [Price] in [Location], [feature]. Which sounds better, 1 or 2?"
value_exchange → "Great taste! Can I get your name?"
lead_name → "Thanks [Name]! What's your cell number so I can send you photos?"
lead_phone → Got number: "Got it! And your email?" Refused: "I totally get it, but I need a way to send the photos. How about just your number for now?"
lead_email → "Last thing — prefer a text or call from our agent? And what time works best?"
handoff → "Perfect [Name]! Our agent will [text/call] you around [time]. Excited to help!"
complete → Chat naturally.`;

      const liveSession = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsListening(true);
            // Stream mic audio to Gemini
            const src = inputAudioCtx.current!.createMediaStreamSource(mic);
            const proc = inputAudioCtx.current!.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              const inp = e.inputBuffer.getChannelData(0);
              const i16 = new Int16Array(inp.length);
              for (let i = 0; i < inp.length; i++) i16[i] = inp[i] * 32768;
              if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({
                  media: { data: pcmEncode(new Uint8Array(i16.buffer)), mimeType: 'audio/pcm;rate=16000' }
                });
              }
            };
            src.connect(proc);
            proc.connect(inputAudioCtx.current!.destination);
          },

          onmessage: async (msg: LiveServerMessage) => {
            const parts = msg.serverContent?.modelTurn?.parts || [];
            for (const p of parts) {
              // Play audio
              if (p.inlineData?.data && outputAudioCtx.current) {
                const ctx = outputAudioCtx.current;
                nextPlayTime.current = Math.max(nextPlayTime.current, ctx.currentTime);
                const buf = await toAudioBuffer(pcmDecode(p.inlineData.data), ctx, 24000);
                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(ctx.destination);
                src.start(nextPlayTime.current);
                nextPlayTime.current += buf.duration;
                sourcesRef.current.add(src);
                src.onended = () => sourcesRef.current.delete(src);
              }
            }

            // On turn complete → generate matching text for chat
            if (msg.serverContent?.turnComplete && !isGeneratingText.current) {
              isGeneratingText.current = true;
              try {
                const textAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
                const curMsgs = messagesRef.current;
                const curSession = sessionDataRef.current;

                // Build history — only user messages so the text model generates what assistant should say
                const history = curMsgs.slice(-12).map(m => ({
                  role: m.role as 'user' | 'model',
                  parts: [{ text: m.text }]
                }));
                if (history.length === 0) {
                  history.push({ role: 'user' as const, parts: [{ text: 'Hello' }] });
                }
                // Make sure last message is from user
                const lastMsg = history[history.length - 1];
                if (lastMsg.role !== 'user') {
                  // Nothing new from user, skip text generation
                  isGeneratingText.current = false;
                  return;
                }

                const r = await textAi.models.generateContent({
                  model: 'gemini-3.5-flash-lite',
                  contents: history,
                  config: {
                    systemInstruction: systemPrompt(curSession),
                  },
                });

                const fullText = r.text?.trim() || '';
                if (fullText) {
                  const display = parseExtraction(fullText);
                  if (display) pushMsg('model', display);
                }
              } catch (err) {
                console.error('Voice text gen error:', err);
              } finally {
                isGeneratingText.current = false;
              }
            }

            if (msg.serverContent?.interrupted) stopAudio();
          },

          onerror: () => { setIsConnecting(false); setIsListening(false); },
          onclose: () => { setIsListening(false); setIsConnecting(false); },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: voiceSysPrompt,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      sessionRef.current = liveSession;
    } catch (err) {
      console.error('Voice start failed:', err);
      setIsConnecting(false);
      setMode('text');
    }
  };

  const stopVoice = () => {
    if (speechRecRef.current) { try { speechRecRef.current.stop(); } catch {} speechRecRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    stopAudio();
    voiceTextBuf.current = '';
    voiceMsgId.current = null;
    isGeneratingText.current = false;
    setIsListening(false);
    setMode('text');
  };

  const handleClose = () => { stopVoice(); setIsOpen(false); };

  const stageLabel: Record<string, string> = {
    intent: 'Getting Started', core_needs: 'Understanding Needs', core_needs_timeline: 'Timeline',
    intent_specific: 'Details', value_exchange: 'Property Matching', lead_name: 'Almost There',
    lead_phone: 'Contact Info', lead_email: 'Contact Info', handoff: 'Scheduling', complete: 'Connected',
  };

  // ── Render ──
  return (
    <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-red-950 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center"><Icons.Chat /></div>
              <div>
                <h3 className="font-bold tracking-tight">AI Assistant</h3>
                <p className="text-[10px] text-red-300 uppercase tracking-widest">
                  {mode === 'voice' ? 'Listening...' : stageLabel[session.stage] || ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={clearChat} className="hover:bg-white/10 p-2 rounded-lg transition-colors text-slate-400 hover:text-white" title="Clear">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
              <button onClick={handleClose} className="hover:bg-white/10 p-1 rounded-lg transition-colors"><Icons.X /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50">
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-red-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                  {m.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
                  ))}
                  {m.grounding && m.grounding.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Verified Locations</p>
                      {m.grounding.map((c, i) => c.maps && <a key={i} href={c.maps.uri} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-red-600 hover:underline truncate">📍 {c.maps.title || 'View on Maps'}</a>)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
            {isModelTyping && (
              <div className="flex gap-1 p-2">
                <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            )}
            {mode === 'voice' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="flex items-end gap-1.5 h-16">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="w-1.5 bg-red-600 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s`, height: isListening ? `${24 + Math.random() * 40}px` : '6px' }} />
                  ))}
                </div>
                <p className="text-xs text-slate-500">Voice conversation is transcribed below</p>
                <button onClick={stopVoice} className="mt-6 bg-red-950 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-red-600 transition-all active:scale-95">
                  Return to Text
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {mode === 'text' && (
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleTextSubmit} className="flex gap-2 mb-2">
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-grow bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-all" />
                <button type="submit" className="bg-red-600 text-white w-12 h-12 rounded-xl hover:bg-red-700 transition-all shadow-sm flex items-center justify-center flex-shrink-0" aria-label="Send">
                  <span className="rotate-90 inline-block transform scale-125"><Icons.Send /></span>
                </button>
              </form>
              <div className="flex justify-between items-center px-1">
                <button type="button" onClick={startVoice} className="flex items-center gap-1.5 text-red-600 text-[11px] font-bold hover:text-red-700 transition-colors">
                  <Icons.Mic />Talk
                </button>
                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">EstatePro AI v3.0</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="bg-red-950 text-white w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-105 transition-all active:scale-95 group relative border border-white/10">
          <Icons.Chat />
          <span className="absolute -top-12 right-0 bg-red-950 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl border border-white/10">AI Assistant</span>
        </button>
      )}
    </div>
  );
};

export default AIConcierge;
