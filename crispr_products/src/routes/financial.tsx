import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Page, Panel, Stat } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { IMPACT_BREAKDOWN, LOSS_PERCENTILES, RISK_CASE, TOTAL_IMPACT_CRORE } from "@/lib/crispr-data";

export const Route = createFileRoute("/financial")({
  head: () => ({
    meta: [
      { title: "Financial risk engine — ₹3.8 crore exposure" },
      { name: "description", content: "CRISPR converts technical findings into rupee exposure: ₹3.8 Cr potential impact, 21% incident likelihood, ₹79.8 L expected annual loss with P50/P90/P95 loss percentiles." },
      { property: "og:title", content: "CRISPR financial risk engine" },
      { property: "og:description", content: "₹3.8 Cr potential impact · ₹79.8 L expected annual loss." },
    ],
  }),
  component: Financial,
});

function Financial() {
  return (
    <Page
      eyebrow="Page 7 · Quantification"
      title="From findings to rupees"
      lede="The risk engine prices the incident, then annualises it. Every number below is decomposable — no black box scores."
      next={{ to: "/drivers", label: "Why is this risk high?" }}
    >
      <Panel className="relative overflow-hidden py-12 text-center" glow>
        <div className="absolute inset-0 hero-glow opacity-70" />
        <p className="mono-label relative">Potential financial impact · RC-001</p>
        <p className="relative mt-3 font-display text-6xl text-money sm:text-8xl">
          ₹<AnimatedNumber value={TOTAL_IMPACT_CRORE} decimals={2} duration={1.8} /> Cr
        </p>
        <p className="relative mt-3 text-sm text-muted-foreground">Single-incident modelled loss, Payment Authentication Compromise</p>
      </Panel>

      <div className="mt-6 grid gap-4 md:grid-cols-7">
        {IMPACT_BREAKDOWN.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="panel p-4"
          >
            <p className="mono-label">{b.label}</p>
            <p className="mt-2 font-display text-lg">
              ₹<AnimatedNumber value={b.crore} decimals={2} /> Cr
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Incident likelihood (12 mo)" value={<AnimatedNumber value={RISK_CASE.likelihood} suffix="%" />} sub="threat activity + exposure + control state" tone="critical" />
          <Stat label="Expected annual loss" value={<><span>₹</span><AnimatedNumber value={RISK_CASE.ealLakh} decimals={1} /><span> L</span></>} sub="likelihood × modelled impact" tone="money" />
          <Stat label="Risk score" value={<AnimatedNumber value={RISK_CASE.score} suffix=" / 100" />} sub="CRITICAL band" tone="critical" />
          <Stat label="Confidence" value={<AnimatedNumber value={RISK_CASE.confidence} suffix="%" />} sub="5 correlated sources" tone="safe" />
        </div>

        <Panel>
          <p className="mono-label">Monte Carlo loss distribution</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LOSS_PERCENTILES.map((p) => ({ name: `${p.label} · ${p.value}`, pct: p.pct }))}>
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--foreground)" }}
                  formatter={(v: number) => [`${v}% of modelled tail`, "Severity"]}
                />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                  {LOSS_PERCENTILES.map((_, i) => (
                    <Cell key={i} fill={["var(--chart-2)", "var(--chart-4)", "var(--critical)"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            10,000-iteration simulation over impact and likelihood ranges (demo parameters).
          </p>
        </Panel>
      </div>
    </Page>
  );
}
