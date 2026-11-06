import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Sparkles, Menu, MessageSquare, Moon, PenSquare, Settings, ShieldCheck, Sun, Trash2, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createThread, threadsQuery } from "@/lib/threads";
import { CreditsGauge } from "@/components/credits-gauge";
import { applyTheme, currentTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { proQuery } from "@/lib/pro";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Discussions — Hibou" },
      { name: "description", content: "Discute avec Hibou pour avancer sur tes devoirs." },
      { property: "og:title", content: "Discussions — Hibou" },
      { property: "og:description", content: "Ton espace devoirs avec Hibou." },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const { data: threads = [] } = useQuery(threadsQuery);
  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return false;
      const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      return !!ok;
    },
  });
  const { data: pro } = useQuery(proQuery);
  const params = useParams({ strict: false }) as { threadId?: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => setTheme(currentTheme()), []);

  async function newThread() {
    const id = await createThread();
    await qc.invalidateQueries({ queryKey: ["threads"] });
    setOpen(false);
    navigate({ to: "/chat/$threadId", params: { threadId: id } });
  }

  async function remove(id: string) {
    await supabase.from("threads").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["threads"] });
    if (params.threadId === id) navigate({ to: "/chat" });
  }

  function toggleTheme() {
    const t: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(t);
    setTheme(t);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("profiles").update({ theme: t }).eq("id", data.user.id).then(() => {});
    });
  }

  return (
    <div className="flex h-dvh bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between p-4">
          <Link to="/chat" className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-xl font-extrabold">Hibou</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="px-3">
          <Button onClick={newThread} className="w-full justify-start gap-2 rounded-xl font-semibold">
            <PenSquare className="h-4 w-4" /> Nouvelle discussion
          </Button>
        </div>
        <div className="px-3 pt-4">
          <CreditsGauge />
        </div>
        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          {threads.map((t) => (
            <div
              key={t.id}
              className={cn(
                "group flex items-center rounded-lg pr-1 text-sm hover:bg-sidebar-accent",
                params.threadId === t.id && "bg-sidebar-accent",
              )}
            >
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                onClick={() => setOpen(false)}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.title}</span>
              </Link>
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => remove(t.id)}
                className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t p-3">
          {pro !== "active" && (
            <Button asChild className="mb-1 w-full justify-start gap-2 rounded-xl font-semibold">
              <Link to="/offres"><Sparkles className="h-4 w-4" /> Améliorer</Link>
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start gap-2">
            <Link to="/settings"><Settings className="h-4 w-4" /> Paramètres</Link>
          </Button>
          {isAdmin.data && (
            <Button asChild variant="ghost" className="w-full justify-start gap-2">
              <Link to="/admin"><ShieldCheck className="h-4 w-4" /> Administration</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-background/60 md:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b p-2 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-display font-bold">Hibou</span>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
