import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My Account — Fabrico" },
      { name: "description", content: "Your profile, delivery address and order history." },
      { property: "og:title", content: "My Account — Fabrico" },
      { property: "og:description", content: "Your profile, delivery address and order history." },
    ],
  }),
  component: Account,
});

type OrderItem = { name: string; quantity: number; price: number };

function Account() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const nav = useNavigate();
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const orders = useQuery({
    queryKey: ["orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", city: "", country: "" });
  useEffect(() => {
    if (profile.data) setForm({
      full_name: profile.data.full_name ?? "", phone: profile.data.phone ?? "", address: profile.data.address ?? "",
      city: profile.data.city ?? "", country: profile.data.country ?? "",
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").upsert({ id: userId, ...form, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  const field = "w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none ring-primary focus:ring-2";
  const fields: [keyof typeof form, string][] = [["full_name", "Full name"], ["phone", "Phone"], ["address", "Street address"], ["city", "City"], ["country", "Country"]];

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-6 md:grid-cols-2 md:px-6">
      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Profile & address</h1>
          <button onClick={signOut} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold"><LogOut className="size-3.5" />Sign out</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="mt-4 space-y-3">
          {fields.map(([k, label]) => (
            <input key={k} className={field} placeholder={label} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          ))}
          <button disabled={save.isPending} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">Save</button>
        </form>
      </section>
      <section>
        <h2 className="text-xl font-extrabold">Order history</h2>
        <div className="mt-3 space-y-3">
          {orders.data?.length === 0 && <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">No orders yet.</p>}
          {orders.data?.map((o) => (
            <div key={o.id} className="rounded-3xl bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold"><Package className="size-4 text-primary" />{new Date(o.created_at).toLocaleDateString()}</p>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold capitalize text-accent-foreground">{o.status}</span>
              </div>
              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {(o.items as OrderItem[]).map((i, n) => <li key={n}>{i.quantity} × {i.name}</li>)}
              </ul>
              <p className="mt-2 text-right font-extrabold">{money(o.total)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
