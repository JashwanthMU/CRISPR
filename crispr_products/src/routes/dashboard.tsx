import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page, Panel, Stat } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { ScoreDial } from "@/components/crispr/score-dial";
import { PORTFOLIO_EAL_CRORE, RECOMMENDATIONS, RISK_CASE, SOURCES } from "@/lib/crispr-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "CRISPR console — portfolio cyber risk dashboard" },
      { name: "description", content: "The CRISPR operating console: portfolio expected annual loss, top risk cases, connector health, exposure trend and prioritised recommendations." },
      { property: "og:title", content: "CRISPR console" },
      { property: "og:description", content: "Portfolio risk, priced and prioritised." },
    ],
  }),
  component: Dashboard,
});

const TREND = [
  { m: "Mar", eal: 9.6 },
  { m: "Apr", eal: 9.1 },
  { m: "May", eal: 9.4 },
  { m: "Jun", eal: 8.9 },
  { m: "Jul", eal: 8.6 },
  { m: "Aug", eal: 8.4 },
];

const CASES = [
  { id: "RC-001", title: "Payment Authentication Compromise", score: 87, eal: "₹79.8 L", band: "critical" },
  { id: "RC-004", title: "Exposed Kubernetes admin API", score: 78, eal: "₹52.1 L", band: "high" },
  { id: "RC-007", title: "Customer data export via reporting service", score: 71, eal: "₹41.7 L", band: "high" },
  { id: "RC-011", title: "Stale privileged service accounts", score: 63, eal: "₹28.4 L", band: "medium" },
  { id: "RC-016", title: "Unencrypted backup replication", score: 54, eal: "₹19.2 L", band: "medium" },
];

function Dashboard() {
  return (
    <Page mode="app" eyebrow="CRISPR console" title="Portfolio risk overview" lede="Simulated production view across 1,412 assets, 8 connectors and 26 correlated risk cases.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Portfolio EAL" value={<>₹<AnimatedNumber value={PORTFOLIO_EAL_CRORE} decimals={1} /> Cr</>} sub="expected annual loss" tone="money" />
        <Stat label="Open risk cases" value={<AnimatedNumber value={26} />} sub="6 critical · 9 high" tone="critical" />
        <Stat label="Findings correlated" value={<AnimatedNumber value={817} />} sub="last 24 hours" />
        <Stat label="Mean time to price" value="4.2 min" sub="finding → ₹ risk" tone="safe" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel>
          <div className="flex items-center justify-between">
            <p className="mono-label">Portfolio exposure trend (₹ Cr)</p>
            <span className="mono-label text-safe">▼ 12.5% QoQ</span>
          </div>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND}>
                <defs>
                  <linearGradient id="ealFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[7, 10]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Area type="monotone" dataKey="eal" stroke="var(--chart-2)" strokeWidth={2} fill="url(#ealFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="flex flex-col items-center justify-center gap-4" glow>
          <p className="mono-label">Top case risk score</p>
          <ScoreDial score={RISK_CASE.score} />
          <p className="text-center text-sm">{RISK_CASE.title}</p>
          <Link to="/drivers" className="mono-label underline decoration-dotted">
            Why is it 87?
          </Link>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <p className="mono-label">Top risk cases</p>
          <div className="mt-4 space-y-2">
            {CASES.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface/60 px-4 py-3"
              >
                <span className="mono-label w-16">{c.id}</span>
                <span className="flex-1 text-[13px]">{c.title}</span>
                <span className={"font-mono text-xs " + (c.band === "critical" ? "text-critical" : c.band === "high" ? "text-high" : "text-medium")}>
                  {c.score}
                </span>
                <span className="w-20 text-right font-mono text-xs text-money">{c.eal}</span>
              </motion.div>
            ))}
          </div>
          <Link to="/correlation" className="mono-label mt-4 inline-block underline decoration-dotted">
            Open RC-001 correlation view
          </Link>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <p className="mono-label">Connector health</p>
            <div className="mt-4 space-y-2 text-[13px]">
              {SOURCES.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-safe" />
                    {s.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{s.findings} findings</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className="mono-label">Prioritised recommendations</p>
            <div className="mt-4 space-y-2 text-[13px]">
              {RECOMMENDATIONS.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-surface/60 px-3 py-2">
                  <span>{r.name}</span>
                  <span className="font-mono text-xs text-money">{r.rosi}×</span>
                </div>
              ))}
            </div>
            <Link to="/budget" className="mono-label mt-4 inline-block underline decoration-dotted">
              Optimise a budget
            </Link>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
