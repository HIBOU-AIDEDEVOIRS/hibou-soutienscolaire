import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Clock, Gift, Mail, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DAILY_CREDITS } from "@/lib/credits";
import { PRO_DAILY_CREDITS, PRO_PRICE, PRO_YEARLY_PRICE, PRO_EMAIL, proQuery, trialQuery } from "@/lib/pro";

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
  const { data: trial } = useQuery(trialQuery);
  const [sending, setSending] = useState(false);

  async function startTrial() {
    setSending(true);
    const { error } = await supabase.rpc("start_pro_trial");
    setSending(false);
    if (error) { toast.error(error.message.includes("already") ? "Tu as déjà utilisé ton essai gratuit." : "Impossible d'activer l'essai."); return; }
    toast.success("Ton essai gratuit de 7 jours est activé ✨");
    qc.invalidateQueries({ queryKey: ["pro-trial"] });
    qc.invalidateQueries({ queryKey: ["credits"] });
    qc.invalidateQueries({ queryKey: ["pro"] });
  }
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
              {status !== "active" && (
                <div className="mt-3 space-y-2">
                  {trial?.used && trial.daysLeft > 0 ? (
                    <p className="text-center text-sm font-semibold text-success">Essai gratuit en cours : {trial.daysLeft} jour{trial.daysLeft > 1 ? "s" : ""} restant{trial.daysLeft > 1 ? "s" : ""} ✨</p>
                  ) : !trial?.used ? (
                    <Button variant="secondary" className="w-full rounded-xl font-semibold" disabled={sending} onClick={startTrial}>
                      Essai gratuit de 7 jours <span className="ml-1 text-xs font-normal opacity-80">(sans carte bancaire)</span>
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">Ton essai gratuit est terminé.</p>
                  )}
                  <FreeProDialog />
                </div>
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

function FreeProDialog() {
  const subject = encodeURIComponent("Justificatif Duolingo pour Hibou Pro");
  const body = encodeURIComponent("Salut ! Voici mon nom d'utilisateur Duolingo (ou ma capture d'écran en pièce jointe) :\n\nMon e-mail Hibou : ");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full rounded-xl font-semibold"><Gift className="mr-2 h-4 w-4" /> Avoir Pro gratuitement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Débloquer Hibou Pro gratuitement 🦉</DialogTitle>
          <DialogDescription>Remplis une de ces conditions :</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          <Item>🟢 Tu as un abonnement Super Duolingo</Item>
          <Item>🔥 Tu as un streak d'au moins 30 jours sur Duolingo</Item>
        </ul>
        <p className="text-sm text-muted-foreground">Envoie une capture d'écran ou ton nom d'utilisateur Duolingo à <strong className="text-foreground">{PRO_EMAIL}</strong>. On active ton Pro dès que c'est vérifié.</p>
        <Button asChild className="rounded-xl font-semibold">
          <a href={`mailto:${PRO_EMAIL}?subject=${subject}&body=${body}`}><Mail className="mr-2 h-4 w-4" /> Envoyer un e-mail</a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
