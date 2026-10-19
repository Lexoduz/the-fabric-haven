import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import hero from "@/assets/hero-silk.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Fabrico" },
      { name: "description", content: "Sign in or create your Fabrico account to save your bag, favorites and chats." },
      { property: "og:title", content: "Sign in — Fabrico" },
      { property: "og:description", content: "Sign in or create your Fabrico account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
        else nav({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) return toast.error(r.error.message);
    if (r.redirected) return;
    nav({ to: "/" });
  }

  const field = "w-full rounded-2xl bg-card px-4 py-3.5 text-sm shadow-soft outline-none ring-primary focus:ring-2";

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-8 px-5 py-8 md:grid-cols-2">
      <div className="relative hidden h-full min-h-96 overflow-hidden rounded-3xl bg-card shadow-soft md:block">
        <img src={hero} alt="" width={1024} height={1024} className="absolute inset-0 m-auto w-4/5 animate-float" />
        <p className="absolute bottom-8 left-8 text-3xl font-extrabold leading-tight">Every thread,<br /><span className="text-primary">saved for you.</span></p>
      </div>
      <div className="animate-rise">
        <h1 className="text-3xl font-extrabold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your bag, favorites, orders and chats — synced to your account.</p>

        {sent ? (
          <div className="mt-6 rounded-3xl bg-accent p-6 text-accent-foreground">
            <p className="font-bold">Check your email</p>
            <p className="mt-1 text-sm">We sent a confirmation link to {email}. Click it to finish signing up.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex rounded-full bg-muted p-1">
              {(["in", "up"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${mode === m ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
                  {m === "in" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="mt-5 space-y-3">
              {mode === "up" && <input className={field} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />}
              <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className={field} type="password" placeholder="Password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button disabled={busy} className="w-full rounded-full bg-primary py-3.5 font-bold text-primary-foreground shadow-lift transition-transform active:scale-95 disabled:opacity-60">
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <button onClick={google} className="w-full rounded-full bg-card py-3.5 text-sm font-bold shadow-soft transition-transform active:scale-95">
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}
