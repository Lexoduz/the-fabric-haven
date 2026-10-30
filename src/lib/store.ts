import { useEffect, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type Product, DEMO_PRODUCTS, withSignedProductImages } from "./products";

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
  staleTime: 45 * 60 * 1000,
  refetchInterval: 50 * 60 * 1000,
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at");
    if (error) throw error;
    const base = (data as Product[]) ?? [];
    const existingSlugs = new Set(base.map((p) => p.slug));
    const extras = DEMO_PRODUCTS.filter((p) => !existingSlugs.has(p.slug));
    const signedBase = await withSignedProductImages(base);
    const signedExtras = await withSignedProductImages(extras);
    return [...signedBase, ...signedExtras];
  },
});

export type CartRow = {
  id: string;
  quantity: number;
  color: string | null;
  saved_for_later: boolean;
  product: Product;
};

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
      const rows = data as unknown as CartRow[];
      return Promise.all(
        rows.map(async (r) => ({ ...r, product: (await withSignedProductImages([r.product]))[0] })),
      );
    },
  });
}

export function useFavorites(userId?: string) {
  return useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id, product:products(*)");
      if (error) throw error;
      const rows = data as unknown as { product_id: string; product: Product }[];
      return Promise.all(
        rows.map(async (r) => ({ ...r, product: (await withSignedProductImages([r.product]))[0] })),
      );
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
      toast("Please sign in first", {
        description: "Your bag and favorites are saved to your account.",
      });
      throw new Error("not signed in");
    }
    return userId;
  };

  const addToBag = useMutation({
    mutationFn: async (v: {
      productId: string;
      quantity: number;
      color?: string | null | undefined;
    }) => {
      const uid = need();
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("product_id", v.productId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({
            quantity: existing.quantity + v.quantity,
            color: v.color ?? null,
            saved_for_later: false,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: uid,
            product_id: v.productId,
            quantity: v.quantity,
            color: v.color ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Added to your bag");
      refresh();
    },
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
      need();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated — please sign in again.");
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: v.items.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            color: i.color ?? null,
          })),
          shipping_address: v.address,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string;
        cartCleared?: boolean;
        orderId?: string;
      };
      if (!res.ok) throw new Error(data.error || `Checkout failed (${res.status})`);
      return data;
    },
    onSuccess: (data) => {
      if ((data as { cartCleared?: boolean; warning?: string })?.cartCleared === false) {
        toast.success("Order placed!", {
          description:
            (data as { warning?: string }).warning ??
            "Order saved but cart could not be cleared. Please refresh.",
        });
      } else {
        toast.success("Order placed!");
      }
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { addToBag, updateItem, removeItem, toggleFavorite, checkout };
}
