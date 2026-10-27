import velvet from "@/assets/p-crushed-panne-velvet.jpg";
import silk from "@/assets/p-silk-charmeuse.jpg";
import linen from "@/assets/p-washed-linen.jpg";
import cotton from "@/assets/p-organic-cotton-poplin.jpg";
import boucle from "@/assets/p-merino-wool-boucle.jpg";
import denim from "@/assets/p-indigo-denim.jpg";
import chiffon from "@/assets/p-chiffon-georgette.jpg";
import yarn from "@/assets/p-worsted-yarn-380.jpg";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;

const images: Record<string, string> = {
  "crushed-panne-velvet": velvet,
  "silk-charmeuse": silk,
  "washed-linen": linen,
  "organic-cotton-poplin": cotton,
  "merino-wool-boucle": boucle,
  "indigo-denim": denim,
  "chiffon-georgette": chiffon,
  "worsted-yarn-380": yarn,
};

export const productImage = (p: Pick<Product, "slug" | "image_url">) =>
  images[p.slug] ?? p.image_url ?? velvet;

export const money = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(n);

export const DEMO_PRODUCTS: Product[] = [
  { id: "demo-rw-kaftan", slug: "demo-rw-kaftan", name: "Men Kaftan (Sample)", brand: "Genera Sherif", category: "Ready to Wears", description: "Sample demo product for testing. Traditional men kaftan.", price: 15000, unit: "piece", colors: ["#ffffff","#0f766e","#111827"], rating: 4.5, reviews: 10, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-rw-shirt", slug: "demo-rw-shirt", name: "Casual Shirt (Sample)", brand: "Genera Sherif", category: "Ready to Wears", description: "Sample demo product for testing. Lightweight ready-to-wear shirt.", price: 8500, unit: "piece", colors: ["#ffffff","#3b82f6","#ef4444"], rating: 4.4, reviews: 8, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-rw-trouser", slug: "demo-rw-trouser", name: "Men Trousers (Sample)", brand: "Genera Sherif", category: "Ready to Wears", description: "Sample demo product for testing. Tailored men trousers.", price: 12000, unit: "piece", colors: ["#111827","#6b7280"], rating: 4.3, reviews: 6, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-shoe-loafer", slug: "demo-shoe-loafer", name: "Leather Loafer (Sample)", brand: "Genera Sherif", category: "Men Shoes", description: "Sample demo product for testing. Classic men loafer.", price: 22000, unit: "pair", colors: ["#111827","#78350f"], rating: 4.6, reviews: 12, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-shoe-sandal", slug: "demo-shoe-sandal", name: "Men Sandal (Sample)", brand: "Genera Sherif", category: "Men Shoes", description: "Sample demo product for testing. Comfortable men sandal.", price: 9000, unit: "pair", colors: ["#78350f","#0f766e"], rating: 4.2, reviews: 5, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-shoe-formal", slug: "demo-shoe-formal", name: "Formal Shoe (Sample)", brand: "Genera Sherif", category: "Men Shoes", description: "Sample demo product for testing. Formal men shoe.", price: 28000, unit: "pair", colors: ["#111827"], rating: 4.7, reviews: 9, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-cap-fila", slug: "demo-cap-fila", name: "Fila Cap (Sample)", brand: "Genera Sherif", category: "Men Caps", description: "Sample demo product for testing. Traditional embroidered fila cap.", price: 6000, unit: "piece", colors: ["#ffffff","#16A538"], rating: 4.5, reviews: 7, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-cap-embroidered", slug: "demo-cap-embroidered", name: "Embroidered Cap (Sample)", brand: "Genera Sherif", category: "Men Caps", description: "Sample demo product for testing. Embroidered men cap.", price: 7500, unit: "piece", colors: ["#111827","#f59e0b"], rating: 4.4, reviews: 4, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-cap-plain", slug: "demo-cap-plain", name: "Plain Cap (Sample)", brand: "Genera Sherif", category: "Men Caps", description: "Sample demo product for testing. Plain men cap.", price: 4000, unit: "piece", colors: ["#ffffff","#6b7280"], rating: 4.1, reviews: 3, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-perf-oud", slug: "demo-perf-oud", name: "Oud Perfume (Sample)", brand: "Genera Sherif", category: "Perfumes", description: "Sample demo product for testing. Long-lasting oud fragrance.", price: 18000, unit: "bottle", colors: ["#78350f"], rating: 4.8, reviews: 15, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-perf-fresh", slug: "demo-perf-fresh", name: "Fresh Cologne (Sample)", brand: "Genera Sherif", category: "Perfumes", description: "Sample demo product for testing. Fresh everyday cologne.", price: 12000, unit: "bottle", colors: ["#3b82f6"], rating: 4.5, reviews: 11, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-perf-woody", slug: "demo-perf-woody", name: "Woody Scent (Sample)", brand: "Genera Sherif", category: "Perfumes", description: "Sample demo product for testing. Warm woody scent.", price: 16000, unit: "bottle", colors: ["#111827"], rating: 4.6, reviews: 8, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-acc-watch", slug: "demo-acc-watch", name: "Wristwatch (Sample)", brand: "Genera Sherif", category: "Men Accessories", description: "Sample demo product for testing. Men wristwatch.", price: 25000, unit: "piece", colors: ["#111827"], rating: 4.7, reviews: 13, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-acc-belt", slug: "demo-acc-belt", name: "Leather Belt (Sample)", brand: "Genera Sherif", category: "Men Accessories", description: "Sample demo product for testing. Men leather belt.", price: 7000, unit: "piece", colors: ["#78350f","#111827"], rating: 4.4, reviews: 6, image_url: null, created_at: new Date().toISOString() } as any,
  { id: "demo-acc-wallet", slug: "demo-acc-wallet", name: "Wallet (Sample)", brand: "Genera Sherif", category: "Men Accessories", description: "Sample demo product for testing. Men wallet.", price: 5000, unit: "piece", colors: ["#78350f"], rating: 4.3, reviews: 5, image_url: null, created_at: new Date().toISOString() } as any,
];

/** Bag discount rule: 10% off subtotals of $50 or more. */
export function bagTotals(subtotal: number) {
  const discount = subtotal >= 50 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  return { subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100 };
}
