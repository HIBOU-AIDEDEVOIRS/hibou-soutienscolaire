import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, MailCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isRecoveryUrl, resetRedirectUrl } from "@/lib/auth-redirect";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Hibou" },
      {
        name: "description",
        content: "Choisis un nouveau mot de passe pour ton compte Hibou.",
      },
      { property: "og:title", content: "Nouveau mot de passe — Hibou" },
      {
        property: "og:description",
        content: "Choisis un nouveau mot de passe pour retrouver l'accès à Hibou.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function friendly(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/different from the old password/i.test(msg)) return "Choisis un mot de passe différent de l'ancien.";
  if (/at least 6 characters|too short|password/i.test(msg) && /character/i.test(msg))
    return "Mot de passe trop court : 6 caractères minimum.";
  if (/Auth session missing|invalid grant|expired|Invalid refresh token/i.test(msg))
    return "Ton lien a expiré. Demande un nouveau lien de réinitialisation.";
  return msg;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    // Supabase fires PASSWORD_RECOVERY once the link's token has been exchanged.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && alive) setRecovery(true);
    });
    if (isRecoveryUrl(window.location.href)) setRecovery(true);
    void supabase.auth.getSession().finally(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Choisis un mot de passe d'au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setLoading(true);
    try {
      // Recovery sessions are exempt from the current-password requirement.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe changé ✅");
      await navigate({ to: "/chat" });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  async function resend(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectUrl(window.location.origin),
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(friendly(err));
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

        {!ready ? (
          <p className="animate-pulse text-muted-foreground">On vérifie ton lien…</p>
        ) : recovery ? (
          <>
            <h1 className="font-display text-2xl font-bold">Choisis un nouveau mot de passe 🔑</h1>
            <p className="mt-2 text-muted-foreground">
              Choisis-en un que tu vas retenir, puis retourne discuter avec Hibou.
            </p>
            <form onSubmit={save} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newpw">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="newpw"
                    required
                    minLength={6}
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Cacher le mot de passe" : "Montrer le mot de passe"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmpw">Répète le mot de passe</Label>
                <Input
                  id="confirmpw"
                  required
                  minLength={6}
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full rounded-full font-semibold"
              >
                {loading ? "…" : "Enregistrer le mot de passe"}
              </Button>
            </form>
          </>
        ) : sent ? (
          <div>
            <MailCheck className="mb-3 h-9 w-9 text-muted-foreground" />
            <h1 className="font-display text-2xl font-bold">Vérifie tes mails 📬</h1>
            <p className="mt-2 text-muted-foreground">
              On t'a renvoyé un lien à <b>{email}</b>. Il est valable quelques minutes.
            </p>
          </div>
        ) : (
          <>
            <KeyRound className="mb-3 h-9 w-9 text-muted-foreground" />
            <h1 className="font-display text-2xl font-bold">Lien de réinitialisation expiré</h1>
            <p className="mt-2 text-muted-foreground">
              Ce lien n'est plus valide. Réclame-en un nouveau et Hibou t'en renvoie un tout de
              suite.
            </p>
            <form onSubmit={resend} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rp-email">Ton e-mail</Label>
                <Input
                  id="rp-email"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full rounded-full font-semibold"
              >
                {loading ? "…" : "M'envoyer un nouveau lien"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="font-semibold text-foreground underline"
              >
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
