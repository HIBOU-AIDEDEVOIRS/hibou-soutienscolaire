import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Json } from "@/integrations/supabase/types";
import { buildSystemPrompt, isMode, type PromptProfile, type WordPair } from "./prompt";
import { getUserClient } from "./supabase-user.server";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";

const MODEL = "openai/gpt-6-astra";
const BASE_URL = "https://ai.gateway.lovable.dev/v1";

const json = (status: number, error: string) => Response.json({ error }, { status });

export async function handleChat(request: Request) {
  const user = await getUserClient(request);
  if (!user) return json(401, "Connecte-toi pour discuter.");
  const { supabase, userId } = user;

  const body = (await request.json().catch(() => null)) as {
    messages?: UIMessage[];
    threadId?: string;
    mode?: string;
  } | null;
  const messages = body?.messages;
  if (!Array.isArray(messages) || !messages.length || !body?.threadId) return json(400, "Requête invalide.");
  const mode = isMode(body.mode) ? body.mode : "expliquer";

  const { data: thread } = await supabase.from("threads").select("id,title").eq("id", body.threadId).maybeSingle();
  if (!thread) return json(404, "Discussion introuvable.");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  const p: PromptProfile = {
    nickname: profile?.nickname ?? "",
    first_name: profile?.first_name ?? "",
    grade: profile?.grade ?? "",
    age: profile?.age ?? null,
    tone: profile?.tone ?? "cool",
    use_emojis: profile?.use_emojis ?? true,
    answer_length: profile?.answer_length ?? "normal",
    correct_mistakes: profile?.correct_mistakes ?? true,
    interests: profile?.interests ?? "",
    word_map: (Array.isArray(profile?.word_map) ? profile.word_map : []) as unknown as WordPair[],
  };

  // Save the new user message
  const last = messages[messages.length - 1]!;
  if (last.role === "user") {
    const { data: ok } = await supabase.rpc("consume_credits", { _cost: 1 });
    if (!ok) return json(402, "Tu as utilisé tous tes crédits pour aujourd'hui. Reviens demain 🦉");
    const { error } = await supabase.from("messages").insert({
      thread_id: thread.id,
      user_id: userId,
      sdk_id: last.id,
      role: "user",
      parts: last.parts as unknown as Json,
    });
    if (error) {
      console.error("save user message", error);
      return json(500, "Impossible d'enregistrer ton message.");
    }
    const firstText = last.parts.find((x) => x.type === "text")?.text?.trim();
    const update: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
    if (thread.title === "Nouvelle discussion" && firstText) update.title = firstText.slice(0, 50);
    else if (thread.title === "Nouvelle discussion") update.title = "Photo d'exercice";
    await supabase.from("threads").update(update).eq("id", thread.id);
  }

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return json(500, "Clé IA manquante.");
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: BASE_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: buildSystemPrompt(p, mode),
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  } as Parameters<typeof streamText>[0]);

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: false,
      onFinish: async ({ responseMessage }) => {
        const { error } = await supabase.from("messages").insert({
          thread_id: thread.id,
          user_id: userId,
          sdk_id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts.filter((x) => x.type === "text") as unknown as Json,
        });
        if (error) console.error("save assistant message", error);
      },
      onError: (e) => {
        console.error(e);
        return "Oups, Hibou a eu un bug. Réessaie dans un instant.";
      },
    }),
    runIdFetch,
  );
}

export async function handleTranscribe(request: Request) {
  const user = await getUserClient(request);
  if (!user) return json(401, "Connecte-toi.");
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > 20 * 1024 * 1024) return json(413, "Vocal trop long.");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size || !file.type.startsWith("audio/")) return json(400, "Vocal vide.");
  const { data: ok } = await user.supabase.rpc("consume_credits", { _cost: 0.25 });
  if (!ok) return json(402, "Plus assez de crédits pour un vocal aujourd'hui.");
  const apiKey = process.env["LOVABLE_API_KEY"]!;
  const out = new FormData();
  out.append("model", "openai/gpt-transcribe");
  out.append("file", file, file.name);
  out.append("response_format", "json");
  out.append("stream", "true");
  out.append("language", "fr");
  const upstream = await fetch(`https://ai.gateway.lovable.dev/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: out,
    signal: request.signal,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "text/event-stream" },
  });
}
