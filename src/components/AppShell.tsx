import { Link, useLocation } from "@tanstack/react-router";
import { Home, Heart, ShoppingBag, User, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useCart, useSession } from "@/lib/store";
import spool from "@/assets/spool-agent.png";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/favorites", label: "Saved", icon: Heart },
  { to: "/chat", label: "Ask", icon: MessageCircle },
  { to: "/bag", label: "Bag", icon: ShoppingBag },
  { to: "/account", label: "Account", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useSession();
  const { data: cart } = useCart(user?.id);
  const count = cart?.filter((c) => !c.saved_for_later).reduce((s, c) => s + c.quantity, 0) ?? 0;
  const inChat = pathname.startsWith("/chat");

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 hidden border-b bg-background/80 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">F</span>
            Fabrico
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <n.icon className="size-4" />{n.label}
                  {n.to === "/bag" && count > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      {!inChat && (
        <Link to="/chat" aria-label="Ask the fabric assistant"
          className="fixed bottom-24 right-4 z-40 grid size-14 place-items-center rounded-full bg-card shadow-lift ring-2 ring-primary transition-transform hover:scale-110 md:bottom-8 md:right-8">
          <img src={spool} alt="" width={40} height={40} className="size-10" />
        </Link>
      )}

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-3xl bg-card px-2 py-2 shadow-soft md:hidden">
        {nav.map((n) => {
          const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} aria-label={n.label}
              className={`relative flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-bold transition-all ${active ? "bg-ink text-ink-foreground" : "text-muted-foreground"}`}>
              <n.icon className="size-5" />
              {active && <span>{n.label}</span>}
              {n.to === "/bag" && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
