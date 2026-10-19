import { Link } from "@tanstack/react-router";
import { Heart, Plus, Star } from "lucide-react";
import { money, productImage, type Product } from "@/lib/products";

export function ProductCard({ p, fav, onFav, onAdd, index = 0 }: {
  p: Product; fav: boolean; onFav: () => void; onAdd: () => void; index?: number;
}) {
  return (
    <div className="group animate-rise overflow-hidden rounded-3xl bg-card shadow-soft transition-shadow hover:shadow-lift"
      style={{ animationDelay: `${index * 60}ms` }}>
      <Link to="/product/$slug" params={{ slug: p.slug }} className="relative block aspect-square overflow-hidden bg-muted">
        <img src={productImage(p)} alt={p.name} loading="lazy" width={816} height={816}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[11px] font-bold">
          <Star className="size-3 fill-star text-star" />{p.rating}
        </span>
      </Link>
      <button onClick={onFav} aria-label={fav ? "Remove from saved" : "Save for later"}
        className="relative -mt-12 ml-auto mr-3 grid size-9 place-items-center rounded-full bg-card shadow-soft transition-transform active:scale-90">
        <Heart className={`size-4 ${fav ? "fill-sale text-sale" : "text-muted-foreground"}`} />
      </button>
      <div className="p-4 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.category}</p>
        <Link to="/product/$slug" params={{ slug: p.slug }} className="mt-0.5 line-clamp-1 font-bold">{p.name}</Link>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-extrabold">{money(p.price)}<span className="text-xs font-medium text-muted-foreground">/{p.unit}</span></p>
          <button onClick={onAdd} aria-label={`Add ${p.name} to bag`}
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110 active:scale-90">
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
