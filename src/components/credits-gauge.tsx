import { useQuery } from "@tanstack/react-query";
import { creditsQuery, formatCredits } from "@/lib/credits";
import { cn } from "@/lib/utils";

/** Barre des crédits restants du jour (totalement en vert, en orange sous 50 %, en rouge sous 20 %). */
export function CreditsGauge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { data } = useQuery(creditsQuery);
  if (!data || data.total <= 0) return null;

  const left = Math.max(0, data.total - data.used);
  const pct = Math.min(100, Math.max(0, (left / data.total) * 100));
  const tone = pct <= 20 ? "bg-destructive" : pct <= 50 ? "bg-warning" : "bg-success";

  const bar = (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label="Crédits restants aujourd'hui"
      aria-valuenow={left}
      aria-valuemin={0}
      aria-valuemax={data.total}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${pct}%` }} />
    </div>
  );

  const count = (
    <span className="text-xs font-semibold tabular-nums">
      {formatCredits(left)} / {formatCredits(data.total)}
    </span>
  );

  if (compact)
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span aria-hidden className="text-xs">⚡</span>
        <div className="min-w-0 flex-1">{bar}</div>
        {count}
      </div>
    );

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Crédits du jour</span>
        {count}
      </div>
      {bar}
    </div>
  );
}
