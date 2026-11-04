import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resetRedirectUrl } from "@/lib/auth-redirect";

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
  const [forgot, setForgot] = useState(false);
  const [f, setF] = useState({
    email: "", password: "", first_name: "", last_name: "", nickname: "", grade: "", age: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  // Leaving a screen (changing login <-> signup) drops the forgot / sent panels.
  useEffect(() => {
    setForgot(false);
    setSent(false);
  }, [mode]);

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
      } else if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), {
          redirectTo: resetRedirectUrl(window.location.origin),
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
              On t'a envoyé un lien à <b>{f.email}</b>.{" "}
              {mode === "signup"
                ? "Clique dessus pour activer ton compte."
                : "Clique dessus pour choisir un nouveau mot de passe."}
            </p>
            {mode === "login" && (
              <p className="mt-6 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-semibold text-foreground underline"
                >
                  Revenir à la connexion
                </button>
              </p>
            )}
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">
              {mode === "signup"
                ? "Crée ton compte (gratuit)"
                : forgot
                  ? "Mot de passe oublié ?"
                  : "Re-salut 👋"}
            </h1>
            {forgot && (
              <p className="mt-2 text-muted-foreground">
                Donne-moi ton e-mail : je t'envoie un lien pour en choisir un nouveau.
              </p>
            )}
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
              <Field label="E-mail"><Input required type="email" autoComplete="email" value={f.email} onChange={set("email")} /></Field>
              {!forgot && (
                <>
                  <Field label="Mot de passe"><Input required type="password" minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={f.password} onChange={set("password")} /></Field>
                  {mode === "login" && (
                    <div className="-mt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setForgot(true)}
                        className="text-sm text-muted-foreground underline hover:text-foreground"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}
                </>
              )}
              <Button type="submit" disabled={loading} className="w-full rounded-full font-semibold" size="lg">
                {loading
                  ? "…"
                  : mode === "signup"
                    ? "Créer mon compte"
                    : forgot
                      ? "M'envoyer le lien"
                      : "Se connecter"}
              </Button>
            </form>
            {forgot ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Tu t'en souviens ?{" "}
                <button
                  type="button"
                  onClick={() => setForgot(false)}
                  className="font-semibold text-foreground underline"
                >
                  Se connecter
                </button>
              </p>
            ) : (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? "Déjà un compte ? " : "Pas encore de compte ? "}
                <Link to="/auth" search={{ mode: mode === "signup" ? "login" : "signup" }} className="font-semibold text-foreground underline">
                  {mode === "signup" ? "Se connecter" : "Créer un compte"}
                </Link>
              </p>
            )}
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
