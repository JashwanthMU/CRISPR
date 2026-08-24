import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Page, Panel, Stat } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { BUDGET_CONTROLS, PORTFOLIO_EAL_CRORE } from "@/lib/crispr-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "₹1 crore budget optimiser — where to spend security money" },
      { name: "description", content: "Give CRISPR a security budget and it selects the control portfolio with maximum risk reduction: ₹95 L spend cuts portfolio EAL from ₹8.4 Cr to ₹4.1 Cr." },
      { property: "og:title", content: "CRISPR budget optimiser" },
      { property: "og:description", content: "₹1 crore in. Optimal security investment out." },
    ],
  }),
  component: Budget,
});

const BUDGET_LAKH = 100;

function optimise(budget: number) {
  const ranked = [...BUDGET_CONTROLS].sort((a, b) => b.reductionCrore / b.costLakh - a.reductionCrore / a.costLakh);
  const picked: (typeof BUDGET_CONTROLS)[number][] = [];
  let spend = 0;
  for (const c of ranked) {
    if (spend + c.costLakh <= budget) {
      picked.push(c);
      spend += c.costLakh;
    }
  }
  const reduction = +picked.reduce((s, c) => s + c.reductionCrore, 0).toFixed(2);
  return { picked, spend, reduction, residual: +(PORTFOLIO_EAL_CRORE - reduction).toFixed(2) };
}

function Budget() {
  const [budget, setBudget] = useState(BUDGET_LAKH);
  const [result, setResult] = useState<ReturnType<typeof optimise> | null>(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(optimise(budget));
      setRunning(false);
    }, 1100);
  };

  const chosen = new Set(result?.picked.map((p) => p.id) ?? []);

  return (
    <Page
      eyebrow="Page 11 · Investment"
      title="₹1 crore budget optimiser"
      lede="CRISPR doesn't just identify risk. It tells you where to spend money — ranking candidate controls by risk reduction per rupee and fitting them into your budget."
      next={{ to: "/compliance", label: "India-first compliance" }}
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel>
          <p className="mono-label">Security budget</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl">₹</span>
            <input
              type="number"
              value={budget}
              min={10}
              max={200}
              onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
              className="w-32 border-b border-input bg-transparent pb-1 font-display text-2xl outline-none focus:border-primary"
            />
            <span className="mono-label">lakh</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">₹{(budget / 100).toFixed(2)} crore available for FY allocation.</p>
          <button
            onClick={run}
            disabled={running}
            className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {running ? "Optimising…" : "Optimise"}
          </button>

          <div className="mt-6 space-y-2">
            <p className="mono-label">Candidate controls</p>
            {BUDGET_CONTROLS.map((c, i) => (
              <motion.div
                key={c.id}
                animate={
                  running
                    ? { opacity: [0.4, 1, 0.4] }
                    : { opacity: 1, borderColor: chosen.has(c.id) ? "var(--safe)" : "var(--border)" }
                }
                transition={running ? { duration: 0.7, repeat: Infinity, delay: i * 0.08 } : { duration: 0.4 }}
                className={cn("flex items-center justify-between rounded-lg border bg-surface/60 px-3 py-2 text-[13px]")}
              >
                <span className="flex items-center gap-2">
                  <span className={chosen.has(c.id) ? "text-safe" : "text-muted-foreground"}>{chosen.has(c.id) ? "✓" : "○"}</span>
                  {c.name}
                </span>
                <span className="font-mono text-xs">₹{c.costLakh} L</span>
              </motion.div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Budget" value={<>₹<AnimatedNumber value={budget} /> L</>} />
            <Stat label="Optimised spend" value={<>₹<AnimatedNumber value={result?.spend ?? 0} /> L</>} tone="safe" />
            <Stat label="Current portfolio EAL" value={<>₹<AnimatedNumber value={PORTFOLIO_EAL_CRORE} decimals={1} /> Cr</>} tone="critical" />
            <Stat label="Residual EAL" value={<>₹<AnimatedNumber value={result?.residual ?? PORTFOLIO_EAL_CRORE} decimals={2} /> Cr</>} tone="money" />
          </div>

          <Panel glow className="relative overflow-hidden">
            <div className="absolute inset-0 hero-glow opacity-50" />
            <p className="mono-label relative">Risk reduction achieved</p>
            <p className="relative mt-2 font-display text-5xl text-money">
              ₹<AnimatedNumber value={result?.reduction ?? 0} decimals={2} duration={1.4} /> Cr
            </p>
            <div className="relative mt-8 space-y-5">
              <BudgetBar label="Current portfolio EAL" value={PORTFOLIO_EAL_CRORE} max={PORTFOLIO_EAL_CRORE} tone="critical" />
              <BudgetBar label="Residual after investment" value={result?.residual ?? PORTFOLIO_EAL_CRORE} max={PORTFOLIO_EAL_CRORE} tone="money" />
            </div>
            <AnimatePresence>
              {result && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mt-6 text-sm text-muted-foreground">
                  Selected {result.picked.length} of {BUDGET_CONTROLS.length} candidate controls · ₹{budget - result.spend} L unallocated ·
                  efficiency ₹{((result.reduction * 100) / Math.max(result.spend, 1)).toFixed(2)} L risk removed per ₹1 L spent.
                </motion.p>
              )}
            </AnimatePresence>
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function BudgetBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "critical" | "money" }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono">₹{value.toFixed(2)} Cr</span>
      </div>
      <div className="mt-2 h-4 rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full"
          style={{ background: tone === "money" ? "var(--gradient-money)" : "var(--critical)" }}
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
