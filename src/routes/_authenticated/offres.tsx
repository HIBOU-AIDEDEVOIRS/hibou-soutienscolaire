import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DAILY_CREDITS } from "@/lib/credits";
import { PRO_DAILY_CREDITS, PRO_PRICE, PRO_YEARLY_PRICE, proQuery } from "@/lib/pro";

export const Route = createFileRoute("/_authenticated/offres")({
  head: () => ({
    meta: [
      { title: "Offres — Hibou Pro" },
      { name: "description", content: "Passe à Hibou Pro : 30 crédits par jour et le mode Corriger pour 1 € par mois ou 10 € par an." },
      { property: "og:title", content: "Offres — Hibou Pro" },
      { property: "og:description", content: "30 crédits par jour et le mode Corriger pour 1 € par mois ou 10 € par an." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OffresPage,
});

function OffresPage() {
  const qc = useQueryClient();
  const { data: status } = useQuery(proQuery);
  const [sending, setSending] = useState(false);
  const [plan, setPlan] = useState<"mensuel" | "annuel">("mensuel");

  async function request() {
    setSending(true);
    const { error } = await supabase.rpc("request_pro_plan", { _plan: plan });
    setSending(false);
    if (error) { toast.error("Impossible d'envoyer ta demande."); return; }
    toast.success("Demande envoyée ✨");
    qc.invalidateQueries({ queryKey: ["pro"] });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/chat" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux discussions
        </Link>
        <h1 className="font-display text-3xl font-extrabold">Choisis ton offre</h1>
        <p className="mt-2 text-muted-foreground">Plus de crédits, et les modes Corriger et Rechercher.</p>

        <div className="mt-6 inline-flex rounded-xl border bg-card p-1" role="tablist">
          {(["mensuel", "annuel"] as const).map((p) => (
            <button key={p} role="tab" aria-selected={plan === p} onClick={() => setPlan(p)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${plan === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {p === "mensuel" ? "Mensuel" : "Annuel"}
              {p === "annuel" && <span className="ml-2 rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">2 mois offerts</span>}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-display text-xl font-bold">Gratuit</h2>
            <p className="mt-1 font-display text-3xl font-extrabold">0 €</p>
            <ul className="mt-5 space-y-2 text-sm">
              <Item>{DAILY_CREDITS} crédits par jour</Item>
              <Item>Modes Expliquer, Générer, Réviser, Organiser</Item>
              <Item>Quiz et flashcards interactifs</Item>
            </ul>
            {status !== "active" && <p className="mt-6 text-sm font-semibold text-muted-foreground">Ton offre actuelle</p>}
          </div>

          <div className="rounded-2xl border-2 border-primary bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Sparkles className="h-5 w-5 text-primary" /> Pro</h2>
            <p className="mt-1 font-display text-3xl font-extrabold">{plan === "annuel" ? PRO_YEARLY_PRICE : PRO_PRICE}<span className="text-base font-semibold text-muted-foreground"> / {plan === "annuel" ? "an" : "mois"}</span></p>
            <ul className="mt-5 space-y-2 text-sm">
              <Item>{PRO_DAILY_CREDITS} crédits par jour</Item>
              <Item>Mode Corriger : Hibou vérifie tes réponses</Item>
              <Item>Mode Rechercher : prépare tes exposés</Item>
              <Item>Tout ce qu'il y a dans Gratuit</Item>
            </ul>
            <div className="mt-6">
              {status === "active" ? (
                <p className="font-semibold text-success">Tu es Pro ✨</p>
              ) : status === "pending" ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Clock className="h-4 w-4" /> Demande envoyée, en attente de validation</p>
              ) : (
                <Button className="w-full rounded-xl font-semibold" disabled={sending} onClick={request}>Demander Pro</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{children}</li>;
}
