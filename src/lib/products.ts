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

export const money = (n: number) => `$${Number(n).toFixed(2)}`;

/** Bag discount rule: 10% off subtotals of $50 or more. */
export function bagTotals(subtotal: number) {
  const discount = subtotal >= 50 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  return { subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100 };
}
