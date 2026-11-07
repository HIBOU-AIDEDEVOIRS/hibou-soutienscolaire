import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { DAILY_CREDITS, formatCredits } from "@/lib/credits";
import { PRO_DAILY_CREDITS } from "@/lib/pro";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/chat" });
  },
  head: () => ({
    meta: [
      { title: "Administration — Hibou" },
      { name: "description", content: "Gestion des crédits et statistiques de Hibou." },
      { property: "og:title", content: "Administration — Hibou" },
      { property: "og:description", content: "Espace d'administration de Hibou." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users3");
      if (error) throw error;
      return data;
    },
  });
  const views = useQuery({
    queryKey: ["admin-views"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase.from("page_views").select("path,user_id,created_at").gte("created_at", since).limit(10000);
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const v = views.data ?? [];
    const today = new Date().toDateString();
    const byDay = new Map<string, number>();
    for (let d = 13; d >= 0; d--) byDay.set(new Date(Date.now() - d * 86400000).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), 0);
    const byPath = new Map<string, number>();
    for (const r of v) {
      const k = new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      if (byDay.has(k)) byDay.set(k, byDay.get(k)! + 1);
      const p = r.path.startsWith("/chat/") ? "/chat/…" : r.path;
      byPath.set(p, (byPath.get(p) ?? 0) + 1);
    }
    return {
      total: v.length,
      today: v.filter((r) => new Date(r.created_at).toDateString() === today).length,
      visitors: new Set(v.map((r) => r.user_id).filter(Boolean)).size,
      days: [...byDay.entries()],
      paths: [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }, [views.data]);
  const maxDay = Math.max(1, ...stats.days.map((d) => d[1]));

  async function update(id: string, bonus: number, reset: boolean) {
    const { error } = await supabase.rpc("admin_set_credits", { _user: id, _bonus: bonus, _reset: reset });
    if (error) {
      toast.error("Modification impossible.");
      return;
    }
    toast.success("Crédits mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function setPro(id: string, active: boolean) {
    const { error } = await supabase.rpc("admin_set_pro", { _user: id, _active: active });
    if (error) { toast.error("Modification impossible."); return; }
    toast.success(active ? "Pro activé ✨" : "Pro désactivé");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const pending = (users.data ?? []).filter((u) => u.pro === "pending");
  const list = (users.data ?? []).filter((u) =>
    `${u.email ?? ""} ${u.name}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/chat" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux discussions
        </Link>
        <h1 className="font-display text-3xl font-extrabold">Administration</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat icon={<Eye className="h-4 w-4" />} label="Vues (30 j)" value={stats.total} />
          <Stat icon={<Eye className="h-4 w-4" />} label="Vues aujourd'hui" value={stats.today} />
          <Stat icon={<Users className="h-4 w-4" />} label="Élèves actifs (30 j)" value={stats.visitors} />
          <Stat icon={<Users className="h-4 w-4" />} label="Comptes" value={users.data?.length ?? 0} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
            <h2 className="mb-4 font-display font-bold">Vues par jour (14 derniers jours)</h2>
            <div className="flex h-40 items-end gap-1.5">
              {stats.days.map(([d, n]) => (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{n || ""}</span>
                  <div className="w-full rounded-t bg-primary" style={{ height: `${(n / maxDay) * 100}%`, minHeight: 2 }} />
                  <span className="text-[10px] text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 font-display font-bold">Pages les plus vues</h2>
            <ul className="space-y-2 text-sm">
              {stats.paths.map(([p, n]) => (
                <li key={p} className="flex justify-between gap-2"><span className="truncate">{p}</span><span className="font-semibold">{n}</span></li>
              ))}
              {!stats.paths.length && <li className="text-muted-foreground">Pas encore de vues.</li>}
            </ul>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-display font-bold">Demandes Pro en attente ({pending.length})</h2>
          {!pending.length && <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>}
          <ul className="space-y-2">
            {pending.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                <div>
                  <div className="font-medium">{u.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                  <div className="mt-1 text-xs font-semibold">Formule : {u.plan === "annuel" ? "Annuel (10 €/an)" : "Mensuel (1 €/mois)"}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setPro(u.id, true)}>Accepter</Button>
                  <Button size="sm" variant="outline" onClick={() => setPro(u.id, false)}>Refuser</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-bold">Crédits des utilisateurs (aujourd'hui)</h2>
            <Input placeholder="Rechercher un nom ou un email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Utilisés</TableHead>
                <TableHead>Restants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => {
                const bonus = Number(u.bonus);
                const base = u.pro === "active" ? PRO_DAILY_CREDITS : DAILY_CREDITS;
                const left = base + bonus - Number(u.used);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{u.grade || "—"}</TableCell>
                    <TableCell>
                      {u.pro === "active" ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">PRO</span>
                          <span className="text-xs text-muted-foreground">{u.plan === "annuel" ? "Annuel" : "Mensuel"}</span>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setPro(u.id, false)}>Désactiver</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setPro(u.id, true)}>Activer Pro</Button>
                      )}
                    </TableCell>
                    <TableCell>{formatCredits(Number(u.used))}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCredits(left)} / {formatCredits(base + bonus)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="text-success" aria-label="Ajouter 10 crédits" onClick={() => update(u.id, bonus + 10, false)}>+10</Button>
                        <Button size="sm" variant="outline" className="text-success" aria-label="Ajouter 5 crédits" onClick={() => update(u.id, bonus + 5, false)}>+5</Button>
                        <Button size="sm" variant="outline" className="text-success" aria-label="Ajouter 1 crédit" onClick={() => update(u.id, bonus + 1, false)}>+1</Button>
                        <Button size="sm" variant="outline" className="text-destructive" aria-label="Enlever 1 crédit" onClick={() => update(u.id, bonus - 1, false)}>−1</Button>
                        <Button size="sm" variant="outline" className="text-destructive" aria-label="Enlever 5 crédits" onClick={() => update(u.id, bonus - 5, false)}>−5</Button>
                        <Button size="sm" variant="outline" className="text-destructive" aria-label="Enlever 10 crédits" onClick={() => update(u.id, bonus - 10, false)}>−10</Button>
                        <Button size="sm" variant="ghost" onClick={() => update(u.id, 0, true)} aria-label="Réinitialiser"><RotateCcw className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">Chaque élève a 10 crédits par jour, 30 en Pro (message écrit : 1, vocal : 0,5, photo : 0,5 ou 0,75). Les boutons +10 / +5 / +1 ajoutent des crédits et −1 / −5 / −10 en enlèvent pour la journée en cours (au minimum 0 crédit) ; ↺ remet le compteur à zéro.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-extrabold">{value}</div>
    </div>
  );
}
