import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Search = { mode?: "login" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s["mode"] === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Connexion — Hibou" },
      { name: "description", content: "Connecte-toi ou crée ton compte Hibou gratuitement." },
      { property: "og:title", content: "Connexion — Hibou" },
      { property: "og:description", content: "Crée ton compte gratuit pour discuter avec Hibou." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({
    email: "", password: "", first_name: "", last_name: "", nickname: "", grade: "", age: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: {
            emailRedirectTo: window.location.origin + "/chat",
            data: {
              first_name: f.first_name.trim(),
              last_name: f.last_name.trim(),
              nickname: f.nickname.trim() || f.first_name.trim(),
              grade: f.grade.trim(),
              age: f.age,
            },
          },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
        navigate({ to: "/chat" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg.includes("Invalid login") ? "E-mail ou mot de passe incorrect." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={logo} alt="" width={40} height={40} className="h-10 w-10" />
          <span className="font-display text-2xl font-extrabold">Hibou</span>
        </Link>
        {sent ? (
          <div>
            <h1 className="font-display text-2xl font-bold">Vérifie tes mails 📬</h1>
            <p className="mt-2 text-muted-foreground">
              On t'a envoyé un lien à <b>{f.email}</b>. Clique dessus pour activer ton compte.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">
              {mode === "signup" ? "Crée ton compte (gratuit)" : "Re-salut 👋"}
            </h1>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prénom"><Input required value={f.first_name} onChange={set("first_name")} /></Field>
                    <Field label="Nom"><Input required value={f.last_name} onChange={set("last_name")} /></Field>
                  </div>
                  <Field label="Comment Hibou doit t'appeler ?">
                    <Input placeholder="ex : Sam" value={f.nickname} onChange={set("nickname")} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Classe"><Input required placeholder="ex : 4e" value={f.grade} onChange={set("grade")} /></Field>
                    <Field label="Âge"><Input required type="number" min={5} max={120} value={f.age} onChange={set("age")} /></Field>
                  </div>
                </>
              )}
              <Field label="E-mail"><Input required type="email" value={f.email} onChange={set("email")} /></Field>
              <Field label="Mot de passe"><Input required type="password" minLength={6} value={f.password} onChange={set("password")} /></Field>
              <Button type="submit" disabled={loading} className="w-full rounded-full font-semibold" size="lg">
                {loading ? "…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Déjà un compte ? " : "Pas encore de compte ? "}
              <Link to="/auth" search={{ mode: mode === "signup" ? "login" : "signup" }} className="font-semibold text-foreground underline">
                {mode === "signup" ? "Se connecter" : "Créer un compte"}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
