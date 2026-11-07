import { createFileRoute } from "@tanstack/react-router";
import { proQuery } from "@/lib/pro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Mic, Square, X } from "lucide-react";
import { EventSourceParserStream } from "eventsource-parser/stream";
import logo from "@/assets/logo.png";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { MODES, type Mode } from "@/lib/prompt";
import { messagesQuery } from "@/lib/threads";
import { recordWav } from "@/lib/record-wav";
import { creditsQuery, dataUrlBytes, formatCredits, imageCost, TEXT_COST } from "@/lib/credits";
import { CreditsGauge } from "@/components/credits-gauge";
import { splitWidgets } from "@/lib/widgets";
import { FlashcardDeck, QuizCard } from "@/components/study-widgets";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data, isLoading } = useQuery(messagesQuery(threadId));
  if (isLoading || !data) return <div className="flex-1" />;
  return <ChatWindow key={threadId} threadId={threadId} initial={data} />;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

const SUGGESTIONS: { mode: Mode; text: string }[] = [
  { mode: "expliquer", text: "J'comprends pas les fractions, tu m'expliques ?" },
  { mode: "generer", text: "Fais-moi un quiz de 5 questions sur la Révolution française" },
  { mode: "reviser", text: "J'ai un contrôle de SVT vendredi sur la digestion" },
  { mode: "organiser", text: "J'ai maths pour demain, anglais pour jeudi et un exposé pour lundi" },
];

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("expliquer");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const voiceRef = useRef(false);
  const { data: credits } = useQuery(creditsQuery);
  const { data: proStatus } = useQuery(proQuery);
  const isPro = proStatus === "active";
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("nickname,first_name").eq("id", u.user!.id).single();
      return data;
    },
  });

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: authHeader,
        body: () => ({ threadId, mode: modeRef.current, voice: voiceRef.current }),
      }),
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => {
      let msg = e.message;
      try {
        msg = JSON.parse(e.message).error ?? msg;
      } catch {
        /* plain text */
      }
      if (msg.includes("429")) msg = "Trop de messages d'un coup, attends un peu.";
      toast.error(msg || "Oups, ça n'a pas marché.");
      qc.invalidateQueries({ queryKey: ["credits"] });
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.setQueryData(messagesQuery(threadId).queryKey, undefined);
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const name = profile?.nickname || profile?.first_name || "";

  function handleSubmit(msg: PromptInputMessage) {
    if (busy || (!msg.text.trim() && !msg.files.length)) return;
    const left = credits ? credits.total - credits.used : 1;
    const imgCost = msg.files.reduce((a, f) => a + imageCost(dataUrlBytes(f.url ?? "")), 0);
    const cost = (voiceRef.current || !msg.text.trim() ? 0 : TEXT_COST) + imgCost || TEXT_COST;
    if (left < cost) {
      toast.error("Tu as utilisé tous tes crédits pour aujourd'hui. Reviens demain 🦉");
      return;
    }
    sendMessage({ text: msg.text, files: msg.files }).finally(() => {
      voiceRef.current = false;
    });
  }

  return (
    <PromptInputProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center pt-[12vh] text-center">
                <img src={logo} alt="" width={80} height={80} className="h-20 w-20" />
                <h1 className="mt-4 font-display text-3xl font-extrabold">Salut{name ? ` ${name}` : ""} ! On bosse sur quoi ?</h1>
                <p className="mt-2 text-muted-foreground">Choisis un mode en bas, envoie une photo ou un vocal.</p>
                <SuggestionGrid onPick={(s) => setMode(s.mode)} />
              </div>
            )}
            {messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent
                  className={
                    m.role === "user"
                      ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                      : "bg-transparent"
                  }
                >
                  {m.parts.map((part, i) => {
                    if (part.type === "text")
                      return m.role === "assistant" ? (
                        <div key={i} className="w-full">
                          {splitWidgets(part.text).map((seg, j) =>
                            seg.kind === "quiz" ? (
                              <QuizCard key={j} quiz={seg.data} />
                            ) : seg.kind === "flashcards" ? (
                              <FlashcardDeck key={j} deck={seg.data} />
                            ) : seg.kind === "pending" ? (
                              <Shimmer key={j}>{seg.widget === "quiz" ? "Hibou prépare ton quiz…" : "Hibou prépare tes flashcards…"}</Shimmer>
                            ) : (
                              <MessageResponse key={j}>{seg.text}</MessageResponse>
                            ),
                          )}
                        </div>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                      );
                    if (part.type === "file" && part.mediaType.startsWith("image/"))
                      return <img key={i} src={part.url} alt="Pièce jointe" className="max-h-64 rounded-xl" />;
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent className="bg-transparent">
                  <Shimmer>Hibou réfléchit…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <PromptInput
            onSubmit={handleSubmit}
            accept="image/*"
            multiple
            maxFiles={4}
            maxFileSize={8 * 1024 * 1024}
            onError={(e) => toast.error(e.code === "accept" ? "Seules les images sont acceptées." : e.message)}
            className="rounded-3xl"
          >
            <AttachmentPreview />
            <PromptInputTextarea autoFocus placeholder="Pose ta question à Hibou…" />
            <PromptInputFooter>
              <PromptInputTools>
                <AddImageButton />
                <VoiceButton disabled={busy} onVoice={() => { voiceRef.current = true; qc.invalidateQueries({ queryKey: ["credits"] }); }} />
                <PromptInputSelect value={mode} onValueChange={(v) => {
                  const m = MODES.find((x) => x.value === v);
                  if (m?.pro && !isPro) {
                    toast(`Le mode ${m.label} est réservé à Pro ✨`, { action: { label: "Voir les offres", onClick: () => { window.location.href = "/offres"; } } });
                    return;
                  }
                  setMode(v as Mode);
                }}>
                  <PromptInputSelectTrigger className="h-8 w-auto gap-1 rounded-full px-3 text-sm font-semibold">
                    <PromptInputSelectValue />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {MODES.map((m) => (
                      <PromptInputSelectItem key={m.value} value={m.value}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{m.label}{m.pro && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">PRO</span>}</span>
                          <span className="text-xs text-muted-foreground">{m.hint}</span>
                        </div>
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={stop} className="rounded-full" />
            </PromptInputFooter>
          </PromptInput>
          <div className="mt-2 space-y-1.5">
            <CreditsGauge compact />
            <p className="text-center text-xs text-muted-foreground">
              Hibou t'aide à comprendre, mais il ne fera pas tes devoirs à ta place 🦉
            </p>
          </div>
        </div>
      </div>
    </PromptInputProvider>
  );
}

function SuggestionGrid({ onPick }: { onPick: (s: { mode: Mode; text: string }) => void }) {
  const { textInput } = usePromptInputController();
  return (
    <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.text}
          type="button"
          onClick={() => {
            onPick(s);
            textInput.setInput(s.text);
          }}
          className="rounded-2xl border bg-card p-4 text-left text-sm transition-colors hover:border-primary"
        >
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-primary">
            {MODES.find((m) => m.value === s.mode)?.label}
          </span>
          {s.text}
        </button>
      ))}
    </div>
  );
}

function AddImageButton() {
  const att = usePromptInputAttachments();
  return (
    <PromptInputButton onClick={() => att.openFileDialog()} aria-label="Ajouter une image" className="rounded-full">
      <ImagePlus className="size-4" />
    </PromptInputButton>
  );
}

function AttachmentPreview() {
  const att = usePromptInputAttachments();
  if (!att.files.length) return null;
  return (
    <div className="flex w-full flex-wrap gap-2 px-3 pt-3">
      {att.files.map((f) => (
        <div key={f.id} className="relative">
          <img src={f.url} alt={f.filename ?? ""} className="h-16 w-16 rounded-lg object-cover" />
          <span className="absolute bottom-0.5 left-0.5 rounded bg-background/85 px-1 text-[10px] font-semibold">
            ⚡ {formatCredits(imageCost((f as { size?: number }).size ?? 0))}
          </span>
          <button
            type="button"
            onClick={() => att.remove(f.id)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background"
            aria-label="Retirer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function VoiceButton({ disabled, onVoice }: { disabled: boolean; onVoice: () => void }) {
  const { textInput } = usePromptInputController();
  const rec = useRef<{ stop: () => Promise<File> } | null>(null);
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle");
  const valueRef = useRef(textInput.value);
  valueRef.current = textInput.value;

  useEffect(() => () => void rec.current?.stop().catch(() => {}), []);

  async function toggle() {
    if (state === "idle") {
      try {
        rec.current = await recordWav();
        setState("rec");
      } catch {
        toast.error("Impossible d'accéder au micro.");
      }
      return;
    }
    if (state !== "rec" || !rec.current) return;
    setState("busy");
    try {
      const file = await rec.current.stop();
      rec.current = null;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", headers: await authHeader(), body: form });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Transcription impossible");
      }
      onVoice();
      const base = valueRef.current ? valueRef.current.trimEnd() + " " : "";
      let text = "";
      const reader = res.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream())
        .getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.data === "[DONE]") continue;
        const ev = JSON.parse(value.data) as { type: string; delta?: string; text?: string };
        if (ev.type === "transcript.text.delta" && ev.delta) text += ev.delta;
        else if (ev.type === "transcript.text.done" && ev.text) text = ev.text;
        textInput.setInput(base + text);
      }
      if (!text.trim()) toast.error("J'ai rien entendu, réessaie !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vocal raté, réessaie.");
    } finally {
      setState("idle");
    }
  }

  return (
    <PromptInputButton
      onClick={toggle}
      disabled={disabled || state === "busy"}
      aria-label={state === "rec" ? "Arrêter le vocal" : "Vocal"}
      className={state === "rec" ? "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" : "rounded-full"}
    >
      {state === "rec" ? <Square className="size-4" /> : <Mic className="size-4" />}
    </PromptInputButton>
  );
}
