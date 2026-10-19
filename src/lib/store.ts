import { useEffect, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bagTotals, type Product } from "./products";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, ready };
}

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at");
    if (error) throw error;
    return data as Product[];
  },
});

export type CartRow = { id: string; quantity: number; color: string | null; saved_for_later: boolean; product: Product };

export function useCart(userId?: string) {
  return useQuery({
    queryKey: ["cart", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, color, saved_for_later, product:products(*)")
        .order("created_at");
      if (error) throw error;
      return data as unknown as CartRow[];
    },
  });
}

export function useFavorites(userId?: string) {
  return useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("product_id, product:products(*)");
      if (error) throw error;
      return data as unknown as { product_id: string; product: Product }[];
    },
  });
}

export function useStoreActions(userId?: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["cart"] });
    qc.invalidateQueries({ queryKey: ["favorites"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  const need = () => {
    if (!userId) {
      toast("Please sign in first", { description: "Your bag and favorites are saved to your account." });
      throw new Error("not signed in");
    }
    return userId;
  };

  const addToBag = useMutation({
    mutationFn: async (v: { productId: string; quantity: number; color?: string | null | undefined }) => {
      const uid = need();
      const { data: existing } = await supabase
        .from("cart_items").select("id, quantity").eq("product_id", v.productId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("cart_items")
          .update({ quantity: existing.quantity + v.quantity, color: v.color ?? null, saved_for_later: false })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items")
          .insert({ user_id: uid, product_id: v.productId, quantity: v.quantity, color: v.color ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Added to your bag"); refresh(); },
  });

  const updateItem = useMutation({
    mutationFn: async (v: { id: string; quantity?: number; saved_for_later?: boolean }) => {
      if (v.quantity !== undefined && v.quantity < 1) {
        const { error } = await supabase.from("cart_items").delete().eq("id", v.id);
        if (error) throw error;
        return;
      }
      const { id, ...patch } = v;
      const { error } = await supabase.from("cart_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (v: { productId: string; on: boolean }) => {
      const uid = need();
      const { error } = v.on
        ? await supabase.from("favorites").insert({ user_id: uid, product_id: v.productId })
        : await supabase.from("favorites").delete().eq("product_id", v.productId);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const checkout = useMutation({
    mutationFn: async (v: { items: CartRow[]; address: string }) => {
      const uid = need();
      const sub = v.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
      const t = bagTotals(Math.round(sub * 100) / 100);
      const { error } = await supabase.from("orders").insert({
        user_id: uid, subtotal: t.subtotal, discount: t.discount, total: t.total,
        shipping_address: v.address,
        items: v.items.map((i) => ({ name: i.product.name, slug: i.product.slug, price: Number(i.product.price), quantity: i.quantity, color: i.color })),
      });
      if (error) throw error;
      const { error: delErr } = await supabase.from("cart_items").delete().in("id", v.items.map((i) => i.id));
      if (delErr) throw delErr;
    },
    onSuccess: () => { toast.success("Order placed!"); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  return { addToBag, updateItem, removeItem, toggleFavorite, checkout };
}
