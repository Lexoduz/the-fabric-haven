import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useFavorites, useStoreActions } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Saved Fabrics — Fabrico" },
      { name: "description", content: "Fabrics you've hearted to revisit later." },
      { property: "og:title", content: "Saved Fabrics — Fabrico" },
      { property: "og:description", content: "Fabrics you've hearted to revisit later." },
    ],
  }),
  component: Favorites,
});

function Favorites() {
  const { userId } = Route.useRouteContext();
  const { data: favs = [], isLoading } = useFavorites(userId);
  const { addToBag, toggleFavorite } = useStoreActions(userId);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
      <h1 className="text-2xl font-extrabold">Saved fabrics</h1>
      {!isLoading && favs.length === 0 && (
        <div className="py-16 text-center">
          <Heart className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-bold">No favorites yet</p>
          <Link to="/" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Explore fabrics</Link>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {favs.map((f, i) => (
          <ProductCard key={f.product_id} p={f.product} index={i} fav
            onFav={() => toggleFavorite.mutate({ productId: f.product_id, on: false })}
            onAdd={() => addToBag.mutate({ productId: f.product_id, quantity: 1, color: f.product.colors[0] })} />
        ))}
      </div>
    </div>
  );
}
