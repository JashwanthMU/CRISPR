import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Page, Panel, Stat } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { RECOMMENDATIONS, RISK_CASE } from "@/lib/crispr-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendation engine — risk reduction per rupee" },
      { name: "description", content: "CRISPR ranks controls by return on security investment: privileged MFA cuts EAL from ₹79.8 L to ₹31.2 L for ₹4.5 L, a 9.8× ROSI." },
      { property: "og:title", content: "CRISPR recommendation engine" },
      { property: "og:description", content: "Ranked controls with cost, projected EAL and ROSI." },
    ],
  }),
  component: Recommendations,
});

function Recommendations() {
  const [id, setId] = useState<string>(RECOMMENDATIONS[0]!.id);
  const rec = RECOMMENDATIONS.find((r) => r.id === id)!;
  const reduction = +(RISK_CASE.ealLakh - rec.projectedEalLakh).toFixed(1);

  return (
    <Page
      eyebrow="Page 9 · Decisions"
      title="CRISPR recommends"
      lede="Each control is priced against the risk it removes. Selecting one shows the projected annual loss, the money saved and the return on security investment."
      next={{ to: "/scenarios", label: "What-if simulator" }}
    >
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Panel>
          <p className="mono-label">Ranked actions</p>
          <div className="mt-4 space-y-2">
            {RECOMMENDATIONS.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setId(r.id)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                  id === r.id ? "border-primary bg-surface-2 glow-ring" : "border-border bg-surface/60 hover:border-accent",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    <span className="mono-label mr-2">{i + 1}</span>
                    {r.name}
                  </span>
                  <span className="font-mono text-xs text-money">{r.rosi}×</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Cost ₹{r.costLakh} L · projected EAL ₹{r.projectedEalLakh} L</p>
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Implementation cost" value={<><span>₹</span><AnimatedNumber value={rec.costLakh} decimals={1} /><span> L</span></>} />
            <Stat label="Current EAL" value={<><span>₹</span><AnimatedNumber value={RISK_CASE.ealLakh} decimals={1} /><span> L</span></>} tone="critical" />
            <Stat label="Projected EAL" value={<><span>₹</span><AnimatedNumber value={rec.projectedEalLakh} decimals={1} /><span> L</span></>} tone="money" />
            <Stat label="ROSI" value={<AnimatedNumber value={rec.rosi} decimals={1} suffix="×" />} tone="safe" />
          </div>

          <Panel glow>
            <p className="mono-label">Annualised loss, before and after</p>
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Current</span>
                  <span className="font-mono text-critical">₹{RISK_CASE.ealLakh} L</span>
                </div>
                <div className="mt-2 h-4 rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: "100%", background: "var(--critical)" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>With {rec.name.toLowerCase()}</span>
                  <span className="font-mono text-money">₹{rec.projectedEalLakh} L</span>
                </div>
                <div className="mt-2 h-4 rounded-full bg-secondary">
                  <motion.div
                    key={rec.id}
                    className="h-full rounded-full"
                    style={{ background: "var(--gradient-money)" }}
                    initial={{ width: "100%" }}
                    animate={{ width: `${(rec.projectedEalLakh / RISK_CASE.ealLakh) * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-6 font-display text-2xl">
              Risk reduction <span className="text-money">₹<AnimatedNumber value={reduction} decimals={1} /> L</span> per year
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Risk score moves {RISK_CASE.score} → {rec.scoreAfter} after implementation.</p>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
