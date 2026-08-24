import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Page, Panel, Stat } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { RISK_CASE } from "@/lib/crispr-data";

export const Route = createFileRoute("/correlation")({
  head: () => ({
    meta: [
      { title: "Unified findings — CRISPR correlation" },
      { name: "description", content: "Five separate findings from five tools merge into one risk case: RC-001 Payment Authentication Compromise, 94% confidence." },
      { property: "og:title", content: "Unified findings — CRISPR correlation" },
      { property: "og:description", content: "Five tools, five alerts, one business risk case." },
    ],
  }),
  component: Correlation,
});

function Correlation() {
  const [merged, setMerged] = useState(false);

  return (
    <Page
      eyebrow="Page 5 · Correlation"
      title="Five findings. One risk case."
      lede="Every tool sees a fragment of the same attack path on the Payment API. CRISPR resolves them to one entity, scores confidence, and stops the queue from lying to you."
      next={{ to: "/assets", label: "Business graph" }}
    >
      <div className="mb-6">
        <button
          onClick={() => setMerged((m) => !m)}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          {merged ? "Reset view" : "Correlate findings"}
        </button>
      </div>

      <Panel className="relative overflow-hidden">
        <p className="mono-label">Target · Payment API</p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {RISK_CASE.mergedFindings.map((f, i) => (
            <motion.div
              key={f.title}
              animate={
                merged
                  ? { y: 46, scale: 0.9, opacity: 0.35, filter: "blur(1px)" }
                  : { y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }
              }
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-lg border border-border bg-surface/70 p-3"
            >
              <p className="mono-label">{f.source}</p>
              <p className="mt-1 text-[13px]">{f.title}</p>
              <p className="mt-2 text-xs text-critical">{f.severity}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={merged ? { opacity: 1, y: 0, height: "auto" } : { opacity: 0, y: 20, height: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="overflow-hidden"
        >
          <div className="mt-8 rounded-xl border border-primary/50 bg-surface-2 p-6 glow-ring">
            <p className="mono-label">Risk case {RISK_CASE.id}</p>
            <h2 className="mt-1 font-display text-3xl">{RISK_CASE.title}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <Stat label="Sources" value={<AnimatedNumber value={RISK_CASE.sources} />} />
              <Stat label="Confidence" value={<AnimatedNumber value={RISK_CASE.confidence} suffix="%" />} tone="safe" />
              <Stat label="Business criticality" value={<AnimatedNumber value={RISK_CASE.criticality} suffix=" / 100" />} />
              <Stat label="Threat activity" value={RISK_CASE.threatActivity} tone="critical" />
            </div>
          </div>
        </motion.div>
      </Panel>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { t: "Before CRISPR", b: "5 tickets, 5 owners, 5 severities, no shared context, no price." },
          { t: "After CRISPR", b: "1 risk case, 94% confidence, ₹79.8 L EAL, one owner, one next action." },
          { t: "Why it matters", b: "Analyst time collapses from days of triage to a single prioritised decision." },
        ].map((c) => (
          <Panel key={c.t}>
            <p className="mono-label">{c.t}</p>
            <p className="mt-2 text-sm text-muted-foreground">{c.b}</p>
          </Panel>
        ))}
      </div>
    </Page>
  );
}
