import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import spool from "@/assets/spool-agent.png";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Ask Spool — Fabrico AI Assistant" },
      { name: "description", content: "Chat with Spool, your AI fabric expert. Conversations are saved to your account." },
      { property: "og:title", content: "Ask Spool — Fabrico AI Assistant" },
      { property: "og:description", content: "Chat with Spool, your AI fabric expert." },
    ],
  }),
  component: ChatLayout,
});

export function useThreads(userId: string) {
  return useQuery({
    queryKey: ["threads", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_threads").select("id, title, updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export async function createThread(userId: string) {
  const { data, error } = await supabase.from("chat_threads").insert({ user_id: userId }).select("id").single();
  if (error) throw error;
  return data.id;
}

function ChatLayout() {
  const { userId } = Route.useRouteContext();
  const { data: threads = [] } = useThreads(userId);
  const params = useParams({ strict: false }) as { threadId?: string };
  const nav = useNavigate();
  const qc = useQueryClient();

  async function newThread() {
    const id = await createThread(userId);
    await qc.invalidateQueries({ queryKey: ["threads"] });
    nav({ to: "/chat/$threadId", params: { threadId: id } });
  }
  async function del(id: string) {
    await supabase.from("chat_threads").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["threads"] });
    if (params.threadId === id) nav({ to: "/chat" });
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-6rem)] max-w-6xl gap-4 px-3 pt-3 md:h-[calc(100dvh-4rem)] md:px-6 md:py-4">
      <aside className="hidden w-64 shrink-0 flex-col rounded-3xl bg-card p-3 shadow-soft md:flex">
        <div className="flex items-center gap-2 px-2 py-1">
          <img src={spool} alt="Spool" width={36} height={36} className="size-9" />
          <div><p className="font-extrabold leading-none">Spool</p><p className="text-xs text-muted-foreground">Fabric expert</p></div>
        </div>
        <button onClick={newThread} className="mt-3 flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground"><Plus className="size-4" />New chat</button>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
          {threads.map((t) => (
            <div key={t.id} className={`group flex items-center rounded-2xl ${params.threadId === t.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
              <Link to="/chat/$threadId" params={{ threadId: t.id }} className="min-w-0 flex-1 truncate px-3 py-2 text-sm font-medium">{t.title}</Link>
              <button onClick={() => del(t.id)} aria-label="Delete chat" className="mr-1 hidden size-7 place-items-center rounded-full text-muted-foreground hover:text-destructive group-hover:grid"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2 md:hidden">
          <button onClick={newThread} className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Plus className="size-3.5" />New</button>
          {threads.map((t) => (
            <Link key={t.id} to="/chat/$threadId" params={{ threadId: t.id }}
              className={`max-w-40 shrink-0 truncate rounded-full px-3 py-1.5 text-xs font-semibold ${params.threadId === t.id ? "bg-ink text-ink-foreground" : "bg-card shadow-soft"}`}>{t.title}</Link>
          ))}
        </div>
        <Outlet />
      </section>
    </div>
  );
}
