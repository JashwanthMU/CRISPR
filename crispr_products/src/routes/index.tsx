import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CrisprCore, Page, Panel } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { SOURCES } from "@/lib/crispr-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRISPR — Thousands of findings. One financial risk picture." },
      {
        name: "description",
        content:
          "CRISPR ingests bug bounty, scanner, EDR/XDR, SIEM, IAM, CSPM and threat intel data and outputs rupee-quantified cyber risk, recommendations and budget decisions.",
      },
      { property: "og:title", content: "CRISPR — Continuous Cyber Risk Intelligence" },
      { property: "og:description", content: "Thousands of security findings. One financial risk picture." },
    ],
  }),
  component: Landing,
});

const STORY = [
  "Security tools",
  "Thousands of findings",
  "CRISPR correlates them",
  "One business risk",
  "Financial impact",
  "₹79.8 L EAL",
  "Why?",
  "MFA / Patch / Segment",
  "What if?",
  "₹31.2 L EAL",
  "₹1 crore budget",
  "Optimal investment",
  "Indian regulatory impact",
];

function Landing() {
  return (
    <Page mode="demo" next={{ to: "/how-it-works", label: "How CRISPR works" }}>
      <section className="relative -mx-5 -mt-10 overflow-hidden px-5 pb-16 pt-20">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mono-label">
            Continuous cyber risk intelligence
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-4 font-display text-5xl leading-[1.05] sm:text-7xl"
          >
            How much cyber risk
            <br />
            do we <span className="text-money">actually</span> have?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
          >
            CRISPR reads every security signal you already own, correlates it into business risk cases, and answers in
            rupees — then tells you exactly where to spend the next crore.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Link
              to="/pipeline"
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              Explore platform
            </Link>
            <Link to="/dashboard" className="rounded-full border border-border px-6 py-3 text-sm transition-colors hover:border-primary">
              Enter CRISPR
            </Link>
          </motion.div>
        </div>

        <IngestDiagram />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Raw findings ingested", value: <AnimatedNumber value={817} />, sub: "across 8 connectors" },
          { label: "Correlated risk cases", value: <AnimatedNumber value={26} />, sub: "de-duplicated entities" },
          { label: "Portfolio exposure", value: <AnimatedNumber value={8.4} decimals={1} prefix="₹" suffix=" Cr" />, sub: "expected annual loss", tone: "money" as const },
          { label: "Top case EAL", value: <AnimatedNumber value={79.8} decimals={1} prefix="₹" suffix=" L" />, sub: "RC-001 Payment API", tone: "critical" as const },
        ].map((s) => (
          <Panel key={s.label}>
            <p className="mono-label">{s.label}</p>
            <p
              className={
                "mt-2 font-display text-3xl " +
                (s.tone === "money" ? "text-money" : s.tone === "critical" ? "text-critical" : "")
              }
            >
              {s.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
          </Panel>
        ))}
      </section>

      <section className="mt-16">
        <p className="mono-label mb-4">The one continuous story</p>
        <div className="panel flex flex-wrap items-center gap-2 p-5">
          {STORY.map((s, i) => (
            <motion.span
              key={s}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[13px]">{s}</span>
              {i < STORY.length - 1 && <span className="text-muted-foreground">→</span>}
            </motion.span>
          ))}
        </div>
      </section>
    </Page>
  );
}

function IngestDiagram() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-2">
          {SOURCES.slice(0, 7).map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative overflow-hidden rounded-lg border border-border bg-surface/70 px-3 py-2 text-[13px]"
            >
              <span className="relative z-10 flex items-center justify-between">
                <span>{s.name}</span>
                <span className="mono-label">{s.findings}</span>
              </span>
              <motion.span
                className="absolute inset-y-0 left-0 w-16 rounded-full opacity-70"
                style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--cyan) 55%, transparent), transparent)" }}
                animate={{ x: ["-20%", "560%"] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
              />
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <CrisprCore size={180} className="animate-float" />
          <span className="mono-label">Correlation core</span>
        </div>

        <div className="space-y-3">
          {[
            { k: "Risk case", v: "RC-001 Payment Authentication Compromise" },
            { k: "Risk score", v: "87 / 100 · CRITICAL" },
            { k: "Financial impact", v: "₹3.80 Cr potential · ₹79.8 L EAL" },
            { k: "Decision", v: "Enable privileged MFA · ROSI 9.8×" },
          ].map((r, i) => (
            <motion.div
              key={r.k}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.12 }}
              className="panel p-3"
            >
              <p className="mono-label">{r.k}</p>
              <p className="mt-1 text-sm">{r.v}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <p className="mt-10 text-center font-display text-xl text-muted-foreground">
        Thousands of security findings. <span className="text-foreground">One financial risk picture.</span>
      </p>
    </div>
  );
}
