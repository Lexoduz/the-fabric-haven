import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import spool from "@/assets/spool-agent.png";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["thread-messages", threadId],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("message_id, role, parts").eq("thread_id", threadId).order("created_at");
      if (error) throw error;
      return data.map((m) => ({ id: m.message_id, role: m.role, parts: m.parts })) as unknown as UIMessage[];
    },
  });
  if (isLoading || !data) return <div className="grid flex-1 place-items-center"><Shimmer>Loading conversation…</Shimmer></div>;
  return <ChatWindow key={threadId} threadId={threadId} initial={data} />;
}

const suggestions = ["Which fabric is best for a summer dress?", "How many yards for curtains 2m wide?", "Velvet vs. silk for an evening gown?"];

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    body: { threadId },
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
  }), [threadId]);

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => {
      const m = e.message;
      toast.error(m.includes("402") ? "AI credits are used up for this workspace." : m.includes("429") ? "Too many requests — please wait a moment." : m || "Something went wrong.");
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.setQueryData(["thread-messages", threadId], undefined);
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { if (!busy) inputRef.current?.focus(); }, [busy]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-card shadow-soft">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <img src={spool} alt="Spool" width={96} height={96} className="size-24 animate-float" />
              <h2 className="mt-2 text-xl font-extrabold">Hi, I'm Spool!</h2>
              <p className="text-sm text-muted-foreground">Ask me anything about fabrics, yardage or our catalog.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:scale-105">{s}</button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className="group-[.is-user]:bg-ink group-[.is-user]:text-ink-foreground">
                  {m.parts.map((p, i) =>
                    p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse>
                    : p.type === "reasoning" && p.text ? <p key={i} className="border-l-2 border-primary pl-3 text-xs italic text-muted-foreground">{p.text}</p>
                    : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant"><MessageContent><Shimmer>Spool is thinking…</Shimmer></MessageContent></Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-3">
        <PromptInput onSubmit={(msg) => send(msg.text)}>
          <PromptInputTextarea ref={inputRef} autoFocus placeholder="Ask Spool about fabrics…" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
