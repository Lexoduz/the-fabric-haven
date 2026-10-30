import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function bagTotals(subtotal: number) {
  const discount = subtotal >= 50 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  return { subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100 };
}

function userClient(token: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
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

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function handleCheckout(request: Request): Promise<Response> {
  const rawAuth = request.headers.get("authorization") ?? "";
  const token = rawAuth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonError("Unauthorized", 401);

  if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_PUBLISHABLE_KEY"]) {
    console.error("[checkout] missing Supabase env");
    return jsonError("Server not configured", 500);
  }

  const sbUser = userClient(token);
  let userId: string;
  try {
    const { data, error } = await sbUser.auth.getUser(token);
    if (error || !data.user) return jsonError("Unauthorized", 401);
    userId = data.user.id;
  } catch {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonError("Invalid request body", 400);
  }

  const obj = body as Record<string, unknown>;
  const allowedTopKeys = new Set(["items", "shipping_address"]);
  for (const k of Object.keys(obj)) {
    if (!allowedTopKeys.has(k)) return jsonError(`Unexpected field: ${k}`, 400);
  }

  if (!("items" in obj) || !("shipping_address" in obj)) {
    return jsonError("Missing required fields", 400);
  }

  const itemsRaw = obj.items;
  const addressRaw = obj.shipping_address;

  if (!Array.isArray(itemsRaw)) return jsonError("items must be an array", 400);
  if (itemsRaw.length === 0) return jsonError("items must not be empty", 400);
  if (itemsRaw.length > 50) return jsonError("Too many items (max 50)", 400);

  if (typeof addressRaw !== "string") return jsonError("shipping_address must be a string", 400);
  const shipping_address = addressRaw.trim();
  if (shipping_address.length < 10) return jsonError("shipping_address must be at least 10 characters", 400);
  if (shipping_address.length > 500) return jsonError("shipping_address must be at most 500 characters", 400);

  const seen = new Set<string>();
  const validatedItems: Array<{ product_id: string; quantity: number; color: string | null }> = [];

  for (let idx = 0; idx < itemsRaw.length; idx++) {
    const entry = itemsRaw[idx];
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return jsonError(`items[${idx}] must be an object`, 400);
    }
    const rec = entry as Record<string, unknown>;
    const allowedItemKeys = new Set(["product_id", "quantity", "color"]);
    for (const k of Object.keys(rec)) {
      if (!allowedItemKeys.has(k)) return jsonError(`Unexpected field in items[${idx}]: ${k}`, 400);
    }
    if (!("product_id" in rec) || !("quantity" in rec)) {
      return jsonError(`items[${idx}] missing product_id or quantity`, 400);
    }
    const pid = rec.product_id;
    const qty = rec.quantity;
    const colorRaw = rec.color;
    if (typeof pid !== "string" || !isUuid(pid)) {
      return jsonError(`items[${idx}].product_id is invalid`, 400);
    }
    if (seen.has(pid)) return jsonError("Duplicate product_id", 400);
    seen.add(pid);
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return jsonError(`items[${idx}].quantity must be an integer 1..99`, 400);
    }
    let color: string | null = null;
    if (colorRaw !== undefined) {
      if (colorRaw !== null && typeof colorRaw !== "string") {
        return jsonError(`items[${idx}].color must be a string or null`, 400);
      }
      if (typeof colorRaw === "string") {
        if (colorRaw.length > 50) return jsonError(`items[${idx}].color too long`, 400);
        color = colorRaw;
      }
    }
    validatedItems.push({ product_id: pid, quantity: qty, color });
  }

  const productIds = validatedItems.map((i) => i.product_id);

  const { data: products, error: prodErr } = await sbUser
    .from("products")
    .select("id, price, name, slug")
    .in("id", productIds);

  if (prodErr) {
    console.error("[checkout] product fetch failed", prodErr.message);
    return jsonError("Failed to verify products", 500);
  }

  const productMap = new Map<string, { id: string; price: number; name: string; slug: string }>();
  for (const p of (products ?? []) as Array<{ id: string; price: unknown; name: string; slug: string }>) {
    productMap.set(p.id, { id: p.id, price: Number(p.price), name: p.name, slug: p.slug });
  }

  for (const pid of productIds) {
    const found = productMap.get(pid);
    if (!found) return jsonError("Some products not found", 400);
    if (!Number.isFinite(found.price) || found.price <= 0) {
      return jsonError("Invalid product price", 500);
    }
  }

  let rawSubtotal = 0;
  for (const it of validatedItems) {
    const prod = productMap.get(it.product_id)!;
    rawSubtotal += prod.price * it.quantity;
  }
  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const t = bagTotals(subtotal);

  const serverItems = validatedItems.map((it) => {
    const prod = productMap.get(it.product_id)!;
    return { name: prod.name, slug: prod.slug, price: prod.price, quantity: it.quantity, color: it.color };
  });

  const { data: order, error: orderErr } = await sbUser
    .from("orders")
    .insert({
      user_id: userId,
      subtotal: t.subtotal,
      discount: t.discount,
      total: t.total,
      shipping_address,
      items: serverItems as unknown as Database["public"]["Tables"]["orders"]["Insert"]["items"],
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    console.error("[checkout] order insert failed", orderErr?.message ?? "no data");
    return jsonError("Failed to save order", 500);
  }

  const orderId = order.id as string | undefined;

  // The order is confirmed saved. Cart clearing and response construction must never
  // turn a successful order into a 500. Any failure here is a partial success.
  let cartCleared = false;
  try {
    // Count the cart rows actually owned by this user for the purchased products
    // before deleting, so a zero-row (silent) delete cannot be reported as cleared.
    const { count: matchedCount, error: matchErr } = await sbUser
      .from("cart_items")
      .select("product_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("saved_for_later", false)
      .in("product_id", productIds);

    if (matchErr) {
      console.error(
        "[checkout] cart match count failed after order saved",
        JSON.stringify({ orderId, productCount: productIds.length, code: matchErr.code }),
      );
    } else {
      const { error: delErr, count: deletedCount } = await sbUser
        .from("cart_items")
        .delete({ count: "exact" })
        .eq("user_id", userId)
        .eq("saved_for_later", false)
        .in("product_id", productIds);

      if (delErr) {
        console.error(
          "[checkout] cart clear failed after order saved",
          JSON.stringify({ orderId, productCount: productIds.length, code: delErr.code }),
        );
      } else if ((matchedCount ?? 0) > 0 && (matchedCount ?? 0) === (deletedCount ?? 0)) {
        cartCleared = true;
      } else if ((matchedCount ?? 0) === 0) {
        console.error(
          "[checkout] no matching cart rows found for user after order saved",
          JSON.stringify({ orderId, productCount: productIds.length }),
        );
      } else {
        console.error(
          "[checkout] cart clear row count mismatch after order saved",
          JSON.stringify({ orderId, matchedCount, deletedCount, productCount: productIds.length }),
        );
      }
    }
  } catch (err) {
    console.error(
      "[checkout] exception while clearing cart after order saved",
      JSON.stringify({ orderId, productCount: productIds.length, message: err instanceof Error ? err.message : "unknown" }),
    );
  }

  try {
    return new Response(
      JSON.stringify({
        ...(orderId ? { orderId } : {}),
        subtotal: t.subtotal,
        discount: t.discount,
        total: t.total,
        cartCleared,
        ...(cartCleared
          ? {}
          : { warning: "Order saved but the cart may still contain items. Please refresh." }),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    console.error(
      "[checkout] response construction failed after order saved",
      JSON.stringify({ orderId, message: err instanceof Error ? err.message : "unknown" }),
    );
    return new Response(
      JSON.stringify({
        ...(orderId ? { orderId } : {}),
        subtotal: t.subtotal,
        discount: t.discount,
        total: t.total,
        cartCleared: false,
        warning: "Order saved but the cart may still contain items. Please refresh.",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
}

export const Route = createFileRoute("/api/checkout")({
  server: { handlers: { POST: ({ request }) => handleCheckout(request) } },
});
