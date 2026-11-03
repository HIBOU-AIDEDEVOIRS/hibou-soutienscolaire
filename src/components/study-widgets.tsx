import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isCorrect, type Flashcards, type Quiz } from "@/lib/widgets";

export function QuizCard({ quiz }: { quiz: Quiz }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = quiz.questions[i]!;
  const total = quiz.questions.length;

  function validate(sel: number[]) {
    setDone(true);
    if (isCorrect(q, sel)) setScore((s) => s + 1);
  }
  function click(idx: number) {
    if (done) return;
    if (q.type === "multiple") setPicked((p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]));
    else {
      setPicked([idx]);
      validate([idx]);
    }
  }
  function next() {
    if (i + 1 >= total) return setFinished(true);
    setI(i + 1);
    setPicked([]);
    setDone(false);
  }
  function restart() {
    setI(0); setPicked([]); setDone(false); setScore(0); setFinished(false);
  }

  return (
    <div className="my-3 w-full rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-display font-extrabold">🧠 {quiz.title || "Quiz"}</span>
        <span className="text-sm text-muted-foreground">{finished ? `${total}/${total}` : `${i + 1}/${total}`}</span>
      </div>
      <Progress value={((finished ? total : i + (done ? 1 : 0)) / total) * 100} className="mb-4 h-2" />
      {finished ? (
        <div className="py-4 text-center">
          <p className="font-display text-3xl font-extrabold">{score}/{total}</p>
          <p className="mt-1 text-muted-foreground">
            {score === total ? "Parfait, t'as tout bon ! 🎉" : score >= total / 2 ? "Bien joué, encore un petit effort 💪" : "Pas grave, on révise et on recommence !"}
          </p>
          <Button onClick={restart} variant="outline" className="mt-4 gap-2 rounded-full"><RotateCcw className="h-4 w-4" /> Recommencer</Button>
        </div>
      ) : (
        <>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
            {q.type === "truefalse" ? "Vrai ou faux" : q.type === "multiple" ? "Plusieurs réponses possibles" : "Une seule réponse"}
          </p>
          <p className="mb-4 font-semibold">{q.question}</p>
          <div className={cn("grid gap-2", q.type === "truefalse" && "grid-cols-2")}>
            {q.options.map((o, idx) => {
              const good = q.answer.includes(idx);
              const sel = picked.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => click(idx)}
                  disabled={done}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                    !done && "hover:border-primary",
                    !done && sel && "border-primary bg-primary/10",
                    done && good && "border-success bg-success/15",
                    done && sel && !good && "border-destructive bg-destructive/10",
                    done && !good && !sel && "opacity-60",
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                    {done && good ? <Check className="h-3.5 w-3.5" /> : done && sel ? <X className="h-3.5 w-3.5" /> : q.type === "truefalse" ? "" : String.fromCharCode(65 + idx)}
                  </span>
                  {o}
                </button>
              );
            })}
          </div>
          {done && (
            <div className={cn("mt-4 rounded-xl p-3 text-sm", isCorrect(q, picked) ? "bg-success/15" : "bg-destructive/10")}>
              <p className="font-bold">{isCorrect(q, picked) ? "Bravo, c'est juste ! ✅" : "Pas tout à fait ❌"}</p>
              {q.explanation && <p className="mt-1">{q.explanation}</p>}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            {!done && q.type === "multiple" ? (
              <Button onClick={() => validate(picked)} disabled={!picked.length} className="rounded-full">Valider</Button>
            ) : done ? (
              <Button onClick={next} className="gap-1 rounded-full">{i + 1 >= total ? "Voir mon score" : "Suivant"} <ChevronRight className="h-4 w-4" /></Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function FlashcardDeck({ deck }: { deck: Flashcards }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Record<number, boolean>>({});
  const c = deck.cards[i]!;
  const total = deck.cards.length;
  const knownCount = Object.values(known).filter(Boolean).length;
  const go = (n: number) => { setI((n + total) % total); setFlipped(false); };
  const mark = (v: boolean) => { setKnown((k) => ({ ...k, [i]: v })); go(i + 1); };

  return (
    <div className="my-3 w-full rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display font-extrabold">🃏 {deck.title || "Flashcards"}</span>
        <span className="text-sm text-muted-foreground">{i + 1}/{total} · {knownCount} su{knownCount > 1 ? "es" : "e"}</span>
      </div>
      <button type="button" onClick={() => setFlipped((f) => !f)} className="block w-full [perspective:1000px]" aria-label="Retourner la carte">
        <div className={cn("relative h-48 w-full transition-transform duration-500 [transform-style:preserve-3d]", flipped && "[transform:rotateY(180deg)]")}>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-primary/40 bg-background p-4 text-center [backface-visibility:hidden]">
            <p className="text-lg font-semibold">{c.front}</p>
            <p className="mt-3 text-xs text-muted-foreground">Clique pour voir la réponse</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-primary bg-primary/10 p-4 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="font-medium">{c.back}</p>
          </div>
        </div>
      </button>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => go(i - 1)} aria-label="Carte précédente"><ChevronLeft className="h-5 w-5" /></Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mark(false)} className="rounded-full">À revoir</Button>
          <Button onClick={() => mark(true)} className="rounded-full">Je sais ✓</Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => go(i + 1)} aria-label="Carte suivante"><ChevronRight className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
