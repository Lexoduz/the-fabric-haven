import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, Bookmark, ShoppingBag } from "lucide-react";
import { useCart, useStoreActions } from "@/lib/store";
import { bagTotals, money, productImage } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/bag")({
  head: () => ({
    meta: [
      { title: "Shopping Bag — Fabrico" },
      { name: "description", content: "Review your bag and items saved for later." },
      { property: "og:title", content: "Shopping Bag — Fabrico" },
      { property: "og:description", content: "Review your bag and items saved for later." },
    ],
  }),
  component: Bag,
});

function Bag() {
  const { userId } = Route.useRouteContext();
  const { data: cart = [], isLoading } = useCart(userId);
  const { updateItem, removeItem, checkout } = useStoreActions(userId);
  const [tab, setTab] = useState<"bag" | "later">("bag");
  const [address, setAddress] = useState("");
  const items = cart.filter((c) => (tab === "bag" ? !c.saved_for_later : c.saved_for_later));
  const bag = cart.filter((c) => !c.saved_for_later);
  const t = bagTotals(Math.round(bag.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0) * 100) / 100);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6">
      <h1 className="text-center text-lg font-extrabold">Shopping Bag</h1>
      <div className="mt-4 flex rounded-full bg-card p-1 shadow-soft">
        {(["bag", "later"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all ${tab === k ? "bg-muted" : "text-muted-foreground"}`}>
            {k === "bag" ? "My Bag" : "Save For Later"}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="py-10 text-center text-muted-foreground">Loading…</p>}
        {!isLoading && items.length === 0 && (
          <div className="py-14 text-center">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 font-bold">{tab === "bag" ? "Your bag is empty" : "Nothing saved for later"}</p>
            <Link to="/" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Browse fabrics</Link>
          </div>
        )}
        {items.map((i, idx) => (
          <div key={i.id} className="flex animate-rise items-center gap-3 rounded-3xl bg-card p-3 shadow-soft" style={{ animationDelay: `${idx * 50}ms` }}>
            <img src={productImage(i.product)} alt={i.product.name} width={80} height={80} loading="lazy" className="size-20 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link to="/product/$slug" params={{ slug: i.product.slug }} className="line-clamp-1 font-bold">{i.product.name}</Link>
              <p className="text-xs text-muted-foreground">Price per {i.product.unit} <span className="font-bold text-foreground">{money(i.product.price)}</span></p>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => updateItem.mutate({ id: i.id, quantity: i.quantity - 1 })} aria-label="Decrease" className="grid size-7 place-items-center rounded-full bg-muted"><Minus className="size-3" /></button>
                <span className="w-5 text-center text-sm font-bold">{i.quantity}</span>
                <button onClick={() => updateItem.mutate({ id: i.id, quantity: i.quantity + 1 })} aria-label="Increase" className="grid size-7 place-items-center rounded-full bg-ink text-ink-foreground"><Plus className="size-3" /></button>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="font-extrabold">{money(Number(i.product.price) * i.quantity)}</p>
              <div className="flex gap-1">
                <button onClick={() => updateItem.mutate({ id: i.id, saved_for_later: !i.saved_for_later })} aria-label={i.saved_for_later ? "Move to bag" : "Save for later"}
                  className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground"><Bookmark className="size-3.5" /></button>
                <button onClick={() => removeItem.mutate(i.id)} aria-label="Remove" className="grid size-8 place-items-center rounded-full bg-muted text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tab === "bag" && bag.length > 0 && (
        <div className="mt-6 space-y-3 rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-bold">{money(t.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount {t.discount === 0 && "(10% off $50+)"}</span><span className="font-bold text-sale">-{money(t.discount)}</span></div>
          <div className="flex justify-between border-t pt-3"><span className="font-bold">Total</span><span className="text-xl font-extrabold">{money(t.total)}</span></div>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address"
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none ring-primary focus:ring-2" />
          <button disabled={!address || checkout.isPending} onClick={() => checkout.mutate({ items: bag, address })}
            className="w-full rounded-full bg-primary py-3.5 font-bold text-primary-foreground shadow-lift transition-transform active:scale-95 disabled:opacity-50">
            {checkout.isPending ? "Placing order…" : "Place Order"}
          </button>
          <p className="text-center text-xs text-muted-foreground">No payment is taken — your order is saved to your account.</p>
        </div>
      )}
    </div>
  );
}
