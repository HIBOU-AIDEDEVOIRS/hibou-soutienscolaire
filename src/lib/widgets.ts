export type QuizQuestion = {
  type: "single" | "truefalse" | "multiple";
  question: string;
  options: string[];
  answer: number[];
  explanation?: string;
};
export type Quiz = { title?: string; questions: QuizQuestion[] };
export type Flashcards = { title?: string; cards: { front: string; back: string }[] };

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "quiz"; data: Quiz }
  | { kind: "flashcards"; data: Flashcards }
  | { kind: "pending"; widget: "quiz" | "flashcards" };

function parseQuiz(raw: string): Quiz | null {
  try {
    const d = JSON.parse(raw) as Quiz;
    const questions = (d.questions ?? []).filter(
      (q) =>
        q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 2 &&
        Array.isArray(q.answer) && q.answer.length > 0 && q.answer.every((a) => Number.isInteger(a) && a >= 0 && a < q.options.length),
    );
    if (!questions.length) return null;
    return { title: d.title, questions: questions.map((q) => ({ ...q, type: q.type === "multiple" ? "multiple" : q.type === "truefalse" ? "truefalse" : "single" })) };
  } catch {
    return null;
  }
}

function parseCards(raw: string): Flashcards | null {
  try {
    const d = JSON.parse(raw) as Flashcards;
    const cards = (d.cards ?? []).filter((c) => c && typeof c.front === "string" && typeof c.back === "string");
    return cards.length ? { title: d.title, cards } : null;
  } catch {
    return null;
  }
}

/** Splits an assistant message into markdown text and interactive quiz/flashcard blocks. */
export function splitWidgets(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /```(quiz|flashcards)\s*\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    const data = m[1] === "quiz" ? parseQuiz(m[2]!) : parseCards(m[2]!);
    if (data) out.push(m[1] === "quiz" ? { kind: "quiz", data: data as Quiz } : { kind: "flashcards", data: data as Flashcards });
    else out.push({ kind: "text", text: m[0] });
    last = re.lastIndex;
  }
  const rest = text.slice(last);
  const open = rest.match(/```(quiz|flashcards)/);
  if (open && open.index !== undefined) {
    if (open.index > 0) out.push({ kind: "text", text: rest.slice(0, open.index) });
    out.push({ kind: "pending", widget: open[1] as "quiz" | "flashcards" });
  } else if (rest) out.push({ kind: "text", text: rest });
  return out;
}

export function isCorrect(q: QuizQuestion, picked: number[]): boolean {
  const a = [...q.answer].sort();
  const p = [...picked].sort();
  return a.length === p.length && a.every((v, i) => v === p[i]);
}
