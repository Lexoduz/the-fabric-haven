import { Link, useLocation } from "@tanstack/react-router";
import { Home, Heart, ShoppingBag, User, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { useCart, useSession } from "@/lib/store";
import spool from "@/assets/spool-agent.png";
import { GeneraSherifLogo } from "@/components/GeneraSherifLogo";

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
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0B1210] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {/* Green top accent - matches storefront sign */}
        <div className="h-[5px] w-full bg-[#16A538]" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
          <Link to="/" className="flex items-center gap-3 md:gap-4">
            <GeneraSherifLogo size={52} />
            <div className="flex flex-col">
              <span className="text-[18px] font-black leading-none tracking-tight text-white md:text-[22px] lg:text-[26px]">
                GENERA SHERIF
              </span>
              <span className="text-[11px] font-extrabold tracking-[0.28em] text-[#2ECC5A] md:text-[13px] md:tracking-[0.32em]">
                FABRICS STORE
              </span>
              {/* Tagline - desktop only to keep mobile clean */}
              <span className="mt-1 hidden items-center gap-2 text-[11px] font-medium tracking-wide text-white/75 md:flex">
                <span className="h-0.5 w-7 bg-[#16A538]" aria-hidden="true" />
                Quality Fabrics
                <span className="size-1.5 rounded-full bg-[#16A538]" aria-hidden="true" />
                Stylish Choices
                <span className="size-1.5 rounded-full bg-[#16A538]" aria-hidden="true" />
                Great Value
                <span className="h-0.5 w-7 bg-[#16A538]" aria-hidden="true" />
              </span>
            </div>
          </Link>
          {/* Desktop nav - light on dark */}
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-white text-[#0B1210]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                  <n.icon className="size-4" />{n.label}
                  {n.to === "/bag" && count > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-[#16A538] text-[10px] text-white">{count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          {/* Mobile bag shortcut in header - visible only on mobile since bottom nav exists */}
          <Link to="/bag" aria-label="Shopping bag" className="relative grid size-10 place-items-center rounded-full bg-white/10 text-white md:hidden">
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#16A538] text-[10px] font-bold text-white">{count}</span>
            )}
          </Link>
        </div>
        {/* Mobile tagline bar */}
        <div className="flex items-center justify-center gap-1.5 border-t border-white/5 bg-white/[0.02] px-4 py-1.5 text-[10px] font-medium tracking-wide text-white/60 md:hidden">
          <span className="h-px w-6 bg-[#16A538]/60" aria-hidden="true" />
          Quality Fabrics <span className="size-1 rounded-full bg-[#16A538]" /> Stylish Choices <span className="size-1 rounded-full bg-[#16A538]" /> Great Value
          <span className="h-px w-6 bg-[#16A538]/60" aria-hidden="true" />
        </div>
      </header>

      <main>{children}</main>

      {!inChat && (
    <div className="fixed bottom-40 right-3 z-40 flex flex-col items-end gap-2 md:bottom-8 md:right-8 md:gap-3">
      {/* WhatsApp chat button -- opens WhatsApp in a new tab with a pre-filled message */}
      <a
        href="https://wa.me/2348035161972?text=Hello%20Genera%20Sherif%20Fabrics%20Store!%20I%E2%80%99m%20interested%20in%20your%20fabrics.%20Please%20share%20your%20available%20designs%20and%20prices."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="grid size-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform hover:scale-110 md:size-14"
      >
        <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.768.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>
      {/* Call store button -- uses tel: link so mobile devices can place a call */}
      <a
        href="tel:+2348035161972"
        aria-label="Call the store"
        className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-110 md:size-14"
      >
        <Phone className="size-6" />
      </a>
      <Link to="/chat" aria-label="Ask the fabric assistant"
        className="grid size-12 place-items-center rounded-full bg-card shadow-lift ring-2 ring-primary transition-transform hover:scale-110 md:size-14">
        <img src={spool} alt="" width={40} height={40} className="size-10" />
      </Link>
    </div>
  )}

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-3xl bg-card px-2 py-2 shadow-soft md:hidden">
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
