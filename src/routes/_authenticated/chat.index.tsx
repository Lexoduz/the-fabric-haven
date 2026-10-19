import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/chat/")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("chat_threads").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    let id = data?.id;
    if (!id) {
      const { data: created, error } = await supabase.from("chat_threads").insert({ user_id: context.userId }).select("id").single();
      if (error) throw error;
      id = created.id;
    }
    throw redirect({ to: "/chat/$threadId", params: { threadId: id }, replace: true });
  },
});
