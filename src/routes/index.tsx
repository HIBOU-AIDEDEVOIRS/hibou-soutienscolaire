import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, CalendarCheck, Lightbulb, Mic, Brain } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hibou — ton pote pour les devoirs" },
      { name: "description", content: "Comprends tes devoirs, révise et organise-toi avec Hibou. Gratuit, et il ne fait jamais tes devoirs à ta place." },
      { property: "og:title", content: "Hibou — ton pote pour les devoirs" },
      { property: "og:description", content: "Explications, quiz, révisions et organisation, adaptés à ta classe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Lightbulb, title: "Expliquer", text: "Un exo, une erreur, une méthode : on décortique ensemble." },
  { icon: Brain, title: "Générer", text: "Quiz, flashcards et exercices à ton niveau." },
  { icon: BookOpen, title: "Réviser", text: "Prépare ton contrôle sans stress." },
  { icon: CalendarCheck, title: "Organiser", text: "Tes devoirs classés par priorité, avec le temps estimé." },
];

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-16 text-center">
        <img src={logo} alt="Hibou" width={112} height={112} className="mb-6 h-28 w-28" />
        <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
          Tes devoirs, <span className="rounded-xl bg-primary px-2 text-primary-foreground">sans galère</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Hibou t'explique, te fait réviser et t'aide à t'organiser. Par contre, il ne te donnera jamais
          la réponse : c'est toi le boss 😉
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-8 text-base font-semibold">
            <Link to="/auth" search={{ mode: "signup" }}>Créer mon compte gratuit</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8 text-base">
            <Link to="/auth" search={{ mode: "login" }}>Se connecter</Link>
          </Button>
        </div>
        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 text-left">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Mic className="h-4 w-4" /> Vocaux et photos d'exercices acceptés
        </p>
      </div>
    </main>
  );
}
