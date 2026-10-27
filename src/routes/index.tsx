import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, SlidersHorizontal, Scissors, Shirt, Footprints, Crown, SprayCan, Watch } from "lucide-react";
import hero from "@/assets/hero-silk.png";
import { ProductCard } from "@/components/ProductCard";
import { productsQuery, useFavorites, useSession, useStoreActions } from "@/lib/store";
import { productImage } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fabrico — Premium Fabrics by the Yard" },
      { name: "description", content: "Discover velvet, silk, linen, denim and yarn. Save favorites and ask our AI fabric assistant." },
      { property: "og:title", content: "Fabrico — Premium Fabrics by the Yard" },
      { property: "og:description", content: "Discover velvet, silk, linen, denim and yarn with an AI fabric assistant." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Index,
});
const DEPARTMENTS = ["Fabrics", "Ready to Wears", "Men Shoes", "Men Caps", "Perfumes", "Men Accessories"] as const;

function productDepartment(p: { category: string }) {
  return (DEPARTMENTS as readonly string[]).includes(p.category) ? p.category : "Fabrics";
}


const DEPT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Fabrics: Scissors,
  "Ready to Wears": Shirt,
  "Men Shoes": Footprints,
  "Men Caps": Crown,
  Perfumes: SprayCan,
  "Men Accessories": Watch,
};

function Index() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { user } = useSession();
  const { data: favs } = useFavorites(user?.id);
  const { addToBag, toggleFavorite } = useStoreActions(user?.id);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  // Scroll to product listing after department change
  // (useEffect added below)

  const categories = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    products.forEach((p) => !m.has(p.category) && m.set(p.category, p));
    return [...m.entries()];
  }, [products]);

  const list = products.filter(
    (p) => (!cat || productDepartment(p) === cat) && (!q || `${p.name} ${p.category} ${p.brand}`.toLowerCase().includes(q.toLowerCase())),
  );
  const favSet = new Set(favs?.map((f) => f.product_id));

  useEffect(() => {
    if (cat && productsRef.current) {
      productsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [cat]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
      <div className="text-center md:hidden">
        <p className="text-[11px] text-muted-foreground">Your location</p>
        <p className="flex items-center justify-center gap-1 text-sm font-bold"><MapPin className="size-3.5 text-primary" />Ilorin, Kwara State, Nigeria</p>
      </div>

      <div className="mt-4 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-full bg-card px-4 py-3 shadow-soft">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fabrics"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <button aria-label="Filters" className="grid size-12 place-items-center rounded-full bg-card shadow-soft">
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      <section className="relative mt-5 overflow-hidden rounded-3xl bg-card p-6 shadow-soft md:p-10">
        <div className="relative z-10 max-w-[55%]">
          <h1 className="text-2xl font-extrabold leading-tight md:text-5xl">
            Save <span className="text-primary">70%</span> on<br />premium fabrics.
          </h1>
          <p className="mt-2 hidden text-muted-foreground md:block">Silks, velvets and linens hand-picked from the world's best mills.</p>
          <a href="#for-you" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-105">
            Buy Now
          </a>
        </div>
        <img src={hero} alt="Flowing emerald silk" width={1024} height={1024}
          className="absolute -right-6 top-1/2 w-[55%] max-w-md -translate-y-1/2 animate-float drop-shadow-2xl" />
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-extrabold">Department</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {DEPARTMENTS.map((d) => {
            const Icon = DEPT_ICONS[d];
            const selected = cat === d;
            return (
              <button key={d} onClick={() => setCat(selected ? null : d)}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all ${selected ? "border-[#16A538] bg-[#16A538]/10 text-[#16A538]" : "border-transparent bg-white text-[#16A538] shadow-soft"}`}>
                <Icon className="size-6" />
                <span className="text-sm font-semibold leading-tight">{d}</span>
              </button>
            );
          })}
        </div>
        {cat && <button onClick={() => setCat(null)} className="mt-2 text-xs font-semibold text-muted-foreground">See All</button>}
      </section>

      <section id="for-you" ref={productsRef} className="mt-7 pb-8 scroll-mt-24">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">For You</h2>
          {!user && <Link to="/auth" className="text-xs font-semibold text-primary">Sign in to save</Link>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {list.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} fav={favSet.has(p.id)}
              onFav={() => toggleFavorite.mutate({ productId: p.id, on: !favSet.has(p.id) })}
              onAdd={() => addToBag.mutate({ productId: p.id, quantity: 1, color: p.colors[0] })} />
          ))}
          {list.length === 0 && <p className="col-span-full py-10 text-center text-muted-foreground">{cat ? `No products in ${cat} yet.` : "No fabrics match your search."}</p>}
        </div>
      </section>
    </div>
  );
}
