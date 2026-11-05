import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { CreditsGauge } from "@/components/credits-gauge";
import { DAILY_CREDITS, TEXT_COST, VOICE_COST, formatCredits } from "@/lib/credits";
import { applyTheme, type Theme } from "@/lib/theme";
import type { WordPair } from "@/lib/prompt";
import { friendlyPasswordError, passwordIssue } from "@/lib/password";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — Hibou" },
      { name: "description", content: "Personnalise Hibou : ton, vocabulaire, thème et profil." },
      { property: "og:title", content: "Paramètres — Hibou" },
      { property: "og:description", content: "Personnalise ton assistant devoirs." },
    ],
  }),
  component: SettingsPage,
});

type Profile = Tables<"profiles">;

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile-full"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user!.id).single();
      if (error) throw error;
      return data;
    },
  });
  const [p, setP] = useState<Profile | null>(null);
  const [words, setWords] = useState<WordPair[]>([]);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  useEffect(() => {
    if (data) {
      setP(data);
      setWords(Array.isArray(data.word_map) ? (data.word_map as unknown as WordPair[]) : []);
    }
  }, [data]);

  if (!p) return <div className="min-h-screen bg-background" />;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  async function save() {
    if (!p) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: p.first_name,
        last_name: p.last_name,
        nickname: p.nickname,
        grade: p.grade,
        age: p.age,
        theme: p.theme,
        tone: p.tone,
        use_emojis: p.use_emojis,
        answer_length: p.answer_length,
        correct_mistakes: p.correct_mistakes,
        interests: p.interests,
        word_map: words.filter((w) => w.from.trim() && w.to.trim()),
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    setSaving(false);
    if (error) {
      toast.error("Sauvegarde ratée.");
      return;
    }
    applyTheme(p.theme as Theme);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("C'est enregistré ✅");
  }

  async function savePassword() {
    const issue = passwordIssue(pw, pw2);
    if (issue) {
      toast.error(issue);
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) {
      toast.error(friendlyPasswordError(error));
      return;
    }
    setPw("");
    setPw2("");
    toast.success("Mot de passe changé ✅");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/chat" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux discussions
        </Link>
        <h1 className="font-display text-3xl font-extrabold">Paramètres</h1>

        <Section title="Mes crédits du jour">
          <CreditsGauge />
          <p className="text-xs text-muted-foreground">
            Chaque jour tu as {DAILY_CREDITS} crédits : un message écrit coûte {TEXT_COST}, un message vocal {formatCredits(VOICE_COST)}. Le compteur repart à zéro à minuit (heure de Paris).
          </p>
        </Section>

        <Section title="Mon profil">
          <div className="grid grid-cols-2 gap-3">
            <F label="Prénom"><Input value={p.first_name} onChange={(e) => set("first_name", e.target.value)} /></F>
            <F label="Nom"><Input value={p.last_name} onChange={(e) => set("last_name", e.target.value)} /></F>
            <F label="Comment Hibou t'appelle"><Input value={p.nickname} onChange={(e) => set("nickname", e.target.value)} /></F>
            <F label="Classe"><Input value={p.grade} onChange={(e) => set("grade", e.target.value)} /></F>
            <F label="Âge">
              <Input type="number" value={p.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)} />
            </F>
            <F label="E-mail"><Input value={p.email ?? ""} disabled /></F>
          </div>
          <F label="Tes passions (pour des exemples qui te parlent)">
            <Textarea placeholder="ex : foot, Minecraft, dessin…" value={p.interests} onChange={(e) => set("interests", e.target.value)} />
          </F>
        </Section>

        <Section title="Style de Hibou">
          <div className="grid grid-cols-2 gap-3">
            <F label="Ton">
              <Choice value={p.tone} onChange={(v) => set("tone", v)} options={[["cool", "Cool 😎"], ["motivant", "Coach motivant 💪"], ["calme", "Calme 🧘"]]} />
            </F>
            <F label="Longueur des réponses">
              <Choice value={p.answer_length} onChange={(v) => set("answer_length", v)} options={[["court", "Courtes"], ["normal", "Normales"], ["long", "Détaillées"]]} />
            </F>
            <F label="Thème">
              <Choice value={p.theme} onChange={(v) => set("theme", v)} options={[["dark", "Sombre (noir)"], ["light", "Clair (blanc)"]]} />
            </F>
          </div>
          <Toggle label="Emojis dans les réponses" checked={p.use_emojis} onChange={(v) => set("use_emojis", v)} />
          <Toggle label="Me signaler mes fautes d'orthographe" checked={p.correct_mistakes} onChange={(v) => set("correct_mistakes", v)} />
        </Section>

        <Section title="Mon vocabulaire">
          <p className="text-sm text-muted-foreground">Choisis les mots que Hibou doit utiliser. Ex : « Bonjour » → « Salut ».</p>
          {words.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Mot" value={w.from} onChange={(e) => setWords(words.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
              <span className="text-muted-foreground">→</span>
              <Input placeholder="Remplacé par" value={w.to} onChange={(e) => setWords(words.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
              <Button variant="ghost" size="icon" onClick={() => setWords(words.filter((_, j) => j !== i))} aria-label="Supprimer">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={() => setWords([...words, { from: "", to: "" }])} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter un mot
          </Button>
        </Section>

        <Button onClick={save} disabled={saving} size="lg" className="mt-8 w-full rounded-full font-semibold">
          {saving ? "…" : "Enregistrer"}
        </Button>

        <Section title="Sécurité & mot de passe">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Nouveau mot de passe">
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={6}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Cacher le mot de passe" : "Montrer le mot de passe"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </F>
            <F label="Répète le mot de passe">
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />
            </F>
          </div>
          <Button onClick={savePassword} disabled={savingPw} variant="secondary" className="rounded-full font-semibold">
            {savingPw ? "…" : "Changer le mot de passe"}
          </Button>
          <p className="text-xs text-muted-foreground">
            6 caractères minimum, et tu n'as pas besoin de l'ancien. Si tu ne le retrouves plus,
            utilise « Mot de passe oublié ? » sur la page de connexion.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
