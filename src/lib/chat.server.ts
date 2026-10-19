import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./ai/run-id.server";

function userClient(token: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function handleChat(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });
  const sb = userClient(token);
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return new Response("Unauthorized", { status: 401 });

  const { messages, threadId } = (await request.json()) as { messages: UIMessage[]; threadId: string };
  const { data: thread } = await sb.from("chat_threads").select("id, title").eq("id", threadId).maybeSingle();
  if (!thread) return new Response("Thread not found", { status: 404 });

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return new Response("AI is not configured", { status: 500 });

  // Save the latest user message
  const last = messages[messages.length - 1];
  if (last?.role === "user") {
    const { error } = await sb.from("chat_messages").upsert(
      { thread_id: threadId, user_id: u.user.id, message_id: last.id, role: "user", parts: last.parts as unknown as Json },
      { onConflict: "thread_id,message_id" },
    );
    if (error) console.error("save user msg", error);
    if (thread.title === "New chat") {
      const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
      await sb.from("chat_threads").update({ title: text.slice(0, 60) || "New chat", updated_at: new Date().toISOString() }).eq("id", threadId);
    } else {
      await sb.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }
  }

  const { data: products } = await sb.from("products").select("name, slug, category, brand, price, unit, description");
  const catalog = (products ?? [])
    .map((p) => `- ${p.name} (${p.category}, by ${p.brand}) $${p.price}/${p.unit} — link: /product/${p.slug} — ${p.description}`)
    .join("\n");

  const instructions = `You are Spool, the friendly fabric expert for the Fabrico online fabric store.
Help customers choose fabrics, calculate yardage, explain fibers, care and sewing tips, and recommend products from the catalog.
When recommending a product, include a markdown link to it using its link path. Keep answers concise and warm.
Shipping/policy: orders are placed from the bag; 10% off bags of $50 or more.
Catalog:
${catalog}`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onFinish: async ({ responseMessage }) => {
        const { error } = await sb.from("chat_messages").upsert(
          { thread_id: threadId, user_id: u.user!.id, message_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as unknown as Json },
          { onConflict: "thread_id,message_id" },
        );
        if (error) console.error("save assistant msg", error);
      },
    }),
    runIdFetch,
  );
}
