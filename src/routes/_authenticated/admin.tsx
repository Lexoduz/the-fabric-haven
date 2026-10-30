import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Product, money, withSignedProductImages } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: adminRow, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (error || !adminRow) throw redirect({ to: "/" });
    return { userId: userData.user.id };
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({});
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return withSignedProductImages((data ?? []) as Product[]);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Product>) => {
      if (editing?.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setEditing(null);
      setForm({});
      setColors([]);
      toast.success("Product saved");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const products = productsQuery.data ?? [];

  useEffect(() => {
    let revoked = false;
    const path = form.image_url;
    if (!path) {
      setPreviewUrl(null);
      return;
    }
    if (path.startsWith("http")) {
      setPreviewUrl(path);
      return;
    }
    supabase.storage
      .from("product-images")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!revoked && data && !error) setPreviewUrl(data.signedUrl);
      });
    return () => {
      revoked = true;
    };
  }, [form.image_url]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    setUploading(true);
    setUploadedFileName(file.name);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: signed, error: signError } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 3600);
      if (signError) throw signError;
      setForm((prev) => ({ ...prev, image_url: path }));
      setPreviewUrl(signed.signedUrl);
      toast.success("Image uploaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addColor = () => {
    const value = colorInput.trim();
    if (!value) return;
    if (colors.includes(value)) {
      toast.error("Colour already added");
      return;
    }
    const next = [...colors, value];
    setColors(next);
    setForm((prev) => ({ ...prev, colors: next }));
    setColorInput("");
  };

  const removeColor = (value: string) => {
    const next = colors.filter((c) => c !== value);
    setColors(next);
    setForm((prev) => ({ ...prev, colors: next }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Products</h2>
        <div className="grid gap-3 mb-4">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {p.category} · {money(Number(p.price))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Colours: {(p.colors ?? []).join(", ") || "—"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(p);
                    setForm(p);
                    setColors(p.colors ?? []);
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(p.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-muted-foreground">No products.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">{editing ? "Edit product" : "Add product"}</h2>
        <div className="grid gap-3 max-w-xl">
          <Input
            placeholder="slug"
            value={form.slug ?? ""}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Input
            placeholder="name"
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="brand"
            value={form.brand ?? ""}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.category ?? ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select a department</option>
              {[
                "Fabrics",
                "Ready to Wears",
                "Men Shoes",
                "Men Caps",
                "Perfumes",
                "Men Accessories",
              ].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {!form.category && (
              <p className="text-sm text-destructive">Please select a department.</p>
            )}
          </div>
          <Input
            placeholder="description"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            placeholder="price"
            type="number"
            value={form.price ?? ""}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
          {/* unit field removed from admin form; database column preserved */}
          <div>
            <label className="text-sm font-medium">Image</label>
            <div
              className="mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 p-6 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleImageUpload(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Choose image"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Drag & drop or click. Max 5 MB.</p>
              {uploading && <p className="mt-2 text-sm">Uploading…</p>}
            </div>
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="mt-3 h-40 w-40 rounded object-cover" />
            )}
            {uploadedFileName && (
              <p className="mt-2 text-xs text-muted-foreground">File: {uploadedFileName}</p>
            )}
            {form.image_url && !previewUrl && (
              <p className="mt-2 text-xs text-muted-foreground">Stored path: {form.image_url}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Colours</label>
            <div className="flex gap-2">
              <Input
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                placeholder="Colour name"
              />
              <Button type="button" onClick={addColor}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {colors.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 border rounded px-2 py-1 text-sm"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeColor(c)}
                    className="text-muted-foreground"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!form.category) {
                  toast.error("Please select a department.");
                  return;
                }
                saveMutation.mutate({ ...form, colors });
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setForm({});
                  setColors([]);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </section>
      <div className="mt-6">
        <Link to="/" className="text-sm text-muted-foreground">
          Back to store
        </Link>
      </div>
    </div>
  );
}
