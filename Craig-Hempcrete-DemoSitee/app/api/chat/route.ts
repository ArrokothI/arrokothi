import { NextRequest, NextResponse } from "next/server";
import { HEMPCRETE_SYSTEM_PROMPT } from "../../lib/hempcretePrompt";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function formatFallback(question: string) {
  const normalized = question.toLowerCase();

  if (normalized.includes("backyard") || normalized.includes("office") || normalized.includes("180")) {
    return "For a small backyard office around 180 sq. ft., I would plan from the wall surface first, not from product packaging. A simple studio often lands around 400-450 sq. ft. of net exterior wall area. At a 10-12 inch hemp-lime wall thickness, that is roughly 10-12 m³ of material volume. For a clean, fast build, pre-cast hempcrete blocks are usually the best fit because they arrive cured and go up like masonry with lime mortar. Would you rather prioritize a 12-inch wall for insulation or a thinner 8-inch wall to preserve interior floor space?";
  }

  if (normalized.includes("bedroom") || normalized.includes("mold") || normalized.includes("damp")) {
    return "Yes, this is one of hempcrete's strongest interior retrofit use cases. For about 300 sq. ft. of cold or damp wall area, a thin 2.5-3 inch breathable layer would be roughly 2.5-3 m³ of hemp-lime material. The usual approach is furring strips plus lightweight hand-tamping, which creates a moisture-regulating layer without formaldehyde, VOC fumes, or fiberglass handling. What is the existing wall surface: drywall, brick, concrete, or something else?";
  }

  if (
    normalized.includes("roof") ||
    normalized.includes("load") ||
    normalized.includes("legal") ||
    normalized.includes("code") ||
    normalized.includes("permit")
  ) {
    return "Two important facts: hempcrete is non-load-bearing infill, so a standard 2x4 or 2x6 timber frame carries the roof, floor, and structural loads. It is also a legal hemp-lime building material with 0% THC, unrelated to recreational marijuana, and the 2024 International Residential Code includes hemp-lime construction in Appendix BL, which gives owner-builders and permit offices a clearer reference path. Where are you in planning: early concept, drawings, permit prep, or already framing?";
  }

  if (
    normalized.includes("cost") ||
    normalized.includes("budget") ||
    normalized.includes("drywall") ||
    normalized.includes("fiberglass")
  ) {
    return "A fair planning frame is that hempcrete materials may run about 15-20% higher upfront than drywall plus fiberglass, but the assembly can win over time. You are combining insulation, vapor control, acoustic mass, and a clean wall substrate in one breathable layer, with possible 30-40% annual HVAC savings and a 3-5 year payback in many homes. If you share wall length, wall height, and target thickness, I can estimate the square footage and m³ volume for a budget conversation. What wall dimensions do you have so far?";
  }

  if (
    normalized.includes("dry") ||
    normalized.includes("cure") ||
    normalized.includes("move in") ||
    normalized.includes("timeline")
  ) {
    return "You have two practical pathways. Pre-cast blocks arrive cured, so you mainly wait on thin lime mortar for about 2-3 days before plaster sequencing. Cast-in-situ hand-tamping is more hands-on: the formwork can usually come off the next day, but the wall needs roughly 3-6 weeks of natural curing before final plaster, depending on thickness and ventilation. Is your bigger constraint a hard move-in deadline or wanting the hands-on DIY experience?";
  }

  return "I can help scope that from the physical project dimensions first. The most useful starting points are wall area in sq. ft., target thickness in inches, and whether this is an interior retrofit, a pre-cast block build, or cast-in-situ work. From there we can estimate material volume in m³ without depending on final SKUs or package counts. What wall area and thickness are you considering?";
}

function toGeminiRole(role: ChatMessage["role"]) {
  return role === "assistant" ? "model" : "user";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

    if (!lastUserMessage?.content?.trim()) {
      return NextResponse.json(
        { error: "A user message is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

    if (!apiKey) {
      return NextResponse.json({
        reply: formatFallback(lastUserMessage.content),
        source: "fallback"
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: HEMPCRETE_SYSTEM_PROMPT }]
          },
          contents: messages.map((message) => ({
            role: toGeminiRole(message.role),
            parts: [{ text: message.content }]
          })),
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 720
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error", response.status, errorText);
      return NextResponse.json({
        reply: formatFallback(lastUserMessage.content),
        source: "fallback"
      });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text)
        .filter(Boolean)
        .join("\n")
        .trim() || formatFallback(lastUserMessage.content);

    return NextResponse.json({ reply, source: "gemini" });
  } catch (error) {
    console.error("Chat route failed", error);
    return NextResponse.json(
      {
        error: "Unable to process the chat request.",
        reply:
          "I can still help with a planning estimate. Share wall area in sq. ft. and desired thickness in inches, and I will convert that into m³ of hemp-lime material for an early project conversation. What wall dimensions are you working with?"
      },
      { status: 500 }
    );
  }
}
