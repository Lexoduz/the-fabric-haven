import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bagTotals } from "./products";

// Runs as the signed-in customer (RLS applies). Prices come from the database, never the browser.
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      cartItemIds: z.array(z.string().uuid()).min(1).max(100),
      address: z.string().trim().min(1).max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("cart_items")
      .select("id, quantity, color, saved_for_later, product:products(name, slug, price)")
      .in("id", data.cartItemIds)
      .eq("saved_for_later", false);
    if (error) throw new Error(error.message);
    const items = (rows ?? []).filter((r) => r.product);
    if (items.length === 0) throw new Error("Your bag is empty");

    const sub = items.reduce((s, i) => s + Number(i.product!.price) * i.quantity, 0);
    const t = bagTotals(Math.round(sub * 100) / 100);

    const { error: insErr } = await supabase.from("orders").insert({
      user_id: userId, subtotal: t.subtotal, discount: t.discount, total: t.total,
      shipping_address: data.address,
      items: items.map((i) => ({ name: i.product!.name, slug: i.product!.slug, price: Number(i.product!.price), quantity: i.quantity, color: i.color })),
    });
    if (insErr) throw new Error(insErr.message);

    const { error: delErr } = await supabase.from("cart_items").delete().in("id", items.map((i) => i.id));
    if (delErr) throw new Error(delErr.message);
    return { total: t.total };
  });
