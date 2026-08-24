import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { NAV_APP, NAV_DEMO } from "@/lib/crispr-data";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function CrisprCore({ size = 120, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full animate-core-spin opacity-80 blur-[1px]"
        style={{ background: "var(--gradient-core)", maskImage: "radial-gradient(circle, transparent 52%, black 54%)", WebkitMaskImage: "radial-gradient(circle, transparent 52%, black 54%)" }}
      />
      <div className="absolute inset-[14%] rounded-full bg-background/80 backdrop-blur glow-ring" />
      <div className="absolute inset-[22%] rounded-full animate-core-pulse" style={{ background: "var(--gradient-core)", opacity: 0.35 }} />
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-xs tracking-[0.3em] text-foreground">CRISPR</span>
      </div>
    </div>
  );
}

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="relative grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-core)" }}>
        <span className="absolute inset-[2px] rounded-[7px] bg-background" />
        <span className="relative font-display text-sm text-accent">C</span>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm tracking-[0.22em]">CRISPR</span>
        <span className="mono-label">Cyber Risk Intelligence</span>
      </span>
    </Link>
  );
}

export function TopNav({ mode = "demo" }: { mode?: "demo" | "app" }) {
  const items = mode === "demo" ? NAV_DEMO : NAV_APP;
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-3">
        <Brand />
        <nav className="hidden flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-safe animate-core-pulse" />
            <span className="mono-label">Demo data</span>
          </span>
          <Link
            to={mode === "demo" ? "/dashboard" : "/"}
            className="rounded-md bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            {mode === "demo" ? "Enter CRISPR" : "Product tour"}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Page({
  children,
  mode = "demo",
  eyebrow,
  title,
  lede,
  next,
}: {
  children: ReactNode;
  mode?: "demo" | "app";
  eyebrow?: string;
  title?: string;
  lede?: string;
  next?: { to: string; label: string };
}) {
  return (
    <div className="min-h-screen">
      <TopNav mode={mode} />
      <main className="mx-auto max-w-[1400px] px-5 py-10">
        {(eyebrow || title) && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 max-w-3xl">
            {eyebrow && <p className="mono-label mb-3">{eyebrow}</p>}
            {title && <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>}
            {lede && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{lede}</p>}
          </motion.div>
        )}
        {children}
        {next && (
          <div className="mt-14 flex justify-end">
            <Link
              to={next.to}
              className="group inline-flex items-center gap-3 rounded-full border border-border bg-surface px-5 py-3 text-sm transition-colors hover:border-primary"
            >
              <span className="mono-label">Next</span>
              <span>{next.label}</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </main>
      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <Brand />
          <p className="mono-label">Prototype · all figures are simulated demo data</p>
        </div>
      </footer>
    </div>
  );
}

export function Panel({ children, className, glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return <section className={cn("panel p-5", glow && "glow-ring", className)}>{children}</section>;
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "default" | "money" | "critical" | "safe";
}) {
  return (
    <div className="panel p-4">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl",
          tone === "money" && "text-money",
          tone === "critical" && "text-critical",
          tone === "safe" && "text-safe",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
