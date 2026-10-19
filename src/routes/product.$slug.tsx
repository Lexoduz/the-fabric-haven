import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { productsQuery, useFavorites, useSession, useStoreActions } from "@/lib/store";
import { money, productImage } from "@/lib/products";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const all = await context.queryClient.ensureQueryData(productsQuery);
    const p = all.find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { name: p.name, description: p.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Fabrico` : "Fabric — Fabrico" },
      { name: "description", content: loaderData?.description ?? "Premium fabric by the yard." },
      { property: "og:title", content: loaderData ? `${loaderData.name} — Fabrico` : "Fabric — Fabrico" },
      { property: "og:description", content: loaderData?.description ?? "Premium fabric by the yard." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const { data: products } = useSuspenseQuery(productsQuery);
  const p = products.find((x) => x.slug === slug)!;
  const { user } = useSession();
  const { data: favs } = useFavorites(user?.id);
  const { addToBag, toggleFavorite } = useStoreActions(user?.id);
  const [color, setColor] = useState(p.colors[0] ?? null);
  const [qty, setQty] = useState(1);
  const fav = !!favs?.some((f) => f.product_id === p.id);
  const swatches = products.filter((x) => x.id !== p.id).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl md:grid md:grid-cols-2 md:gap-10 md:px-6 md:pt-8">
      <div className="relative bg-card md:rounded-3xl md:shadow-soft">
        <div className="absolute inset-x-4 top-4 z-10 flex justify-between">
          <button onClick={() => router.history.back()} aria-label="Back" className="grid size-10 place-items-center rounded-full bg-card shadow-soft"><ChevronLeft className="size-5" /></button>
          <Link to="/bag" aria-label="Bag" className="grid size-10 place-items-center rounded-full bg-card shadow-soft"><ShoppingBag className="size-4" /></Link>
        </div>
        <img key={p.id} src={productImage(p)} alt={p.name} width={816} height={816} className="aspect-square w-full animate-rise object-cover md:rounded-3xl" />
        <div className="no-scrollbar flex gap-2 overflow-x-auto p-4">
          {swatches.map((s) => (
            <Link key={s.id} to="/product/$slug" params={{ slug: s.slug }} className="shrink-0 overflow-hidden rounded-xl ring-primary transition hover:ring-2">
              <img src={productImage(s)} alt={s.name} width={56} height={56} loading="lazy" className="size-14 object-cover" />
            </Link>
          ))}
        </div>
      </div>

      <div className="-mt-4 rounded-t-3xl bg-background px-5 pb-28 pt-6 md:mt-0 md:pb-10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-extrabold leading-tight md:text-4xl">{p.name} {p.brand && <span className="text-muted-foreground">by {p.brand}</span>}</h1>
          <button onClick={() => toggleFavorite.mutate({ productId: p.id, on: !fav })} aria-label="Save for later"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-card shadow-soft transition active:scale-90">
            <Heart className={`size-5 ${fav ? "fill-sale text-sale" : ""}`} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-2xl font-extrabold">{money(p.price)}<span className="text-sm font-medium text-muted-foreground">/{p.unit}</span></p>
          <p className="flex items-center gap-1 text-sm font-semibold"><Star className="size-4 fill-star text-star" />{p.rating} <span className="text-muted-foreground">({p.reviews} reviews)</span></p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Color</span>
            <div className="flex gap-2">
              {p.colors.map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`}
                  className={`size-7 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-primary" : "border-card"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{p.unit === "yd" ? "Yards" : "Qty"}</span>
            <span className="rounded-full bg-card px-3 py-1 text-sm font-bold shadow-soft">{qty}</span>
          </div>
        </div>

        <h2 className="mt-6 font-extrabold">Description</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.description}</p>

        <div className="fixed inset-x-0 bottom-20 z-30 flex items-center gap-3 bg-background/90 px-5 py-3 backdrop-blur md:static md:mt-8 md:bg-transparent md:p-0">
          <div className="flex items-center gap-3 rounded-full bg-card p-1 shadow-soft">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease" className="grid size-10 place-items-center rounded-full bg-muted"><Minus className="size-4" /></button>
            <span className="w-6 text-center font-bold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} aria-label="Increase" className="grid size-10 place-items-center rounded-full bg-ink text-ink-foreground"><Plus className="size-4" /></button>
          </div>
          <button onClick={() => addToBag.mutate({ productId: p.id, quantity: qty, color })} disabled={addToBag.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-bold text-primary-foreground shadow-lift transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60">
            <ShoppingBag className="size-4" /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
