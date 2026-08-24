import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { CrisprCore, Page, Panel } from "@/components/crispr/shell";
import { SOURCES } from "@/lib/crispr-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "CRISPR architecture — interactive security ecosystem" },
      { name: "description", content: "An interactive map of the CRISPR security ecosystem: connectors, correlation core, business graph and financial risk output. Click any node to inspect its telemetry." },
      { property: "og:title", content: "CRISPR architecture" },
      { property: "og:description", content: "Click any connector node to inspect live-looking telemetry." },
    ],
  }),
  component: Architecture,
});

const POS = [
  { x: 12, y: 12 },
  { x: 8, y: 32 },
  { x: 10, y: 54 },
  { x: 14, y: 76 },
  { x: 30, y: 88 },
  { x: 30, y: 8 },
  { x: 46, y: 84 },
  { x: 44, y: 10 },
];

function Architecture() {
  const [active, setActive] = useState<string | null>("bugbounty");
  const node = SOURCES.find((s) => s.id === active) ?? null;

  return (
    <Page
      eyebrow="Page 3 · Architecture"
      title="The security ecosystem, live"
      lede="A depth-shaded scene of every signal source orbiting the CRISPR correlation core. Nodes float, packets travel the connections, and any node can be opened for its current telemetry."
      next={{ to: "/pipeline", label: "Run the data pipeline" }}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel className="relative h-[560px] overflow-hidden p-0" glow>
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute inset-0 hero-glow opacity-60" />

          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {SOURCES.map((s, i) => (
              <g key={s.id}>
                <line
                  x1={POS[i]!.x + 4}
                  y1={POS[i]!.y + 3}
                  x2={68}
                  y2={48}
                  stroke="var(--grid)"
                  strokeWidth={0.25}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={POS[i]!.x + 4}
                  y1={POS[i]!.y + 3}
                  x2={68}
                  y2={48}
                  stroke="var(--cyan)"
                  strokeWidth={0.5}
                  strokeDasharray="3 22"
                  className="animate-flow-dash"
                  vectorEffect="non-scaling-stroke"
                  opacity={active === s.id ? 0.95 : 0.4}
                />
              </g>
            ))}
            <line x1={68} y1={48} x2={94} y2={48} stroke="var(--money)" strokeWidth={0.6} strokeDasharray="4 14" className="animate-flow-dash" vectorEffect="non-scaling-stroke" />
          </svg>

          {SOURCES.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => setActive(s.id)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              style={{ left: `${POS[i]!.x}%`, top: `${POS[i]!.y}%` }}
              className={cn(
                "absolute w-[136px] rounded-lg border bg-surface/85 px-3 py-2 text-left text-[12px] backdrop-blur transition-all animate-float",
                active === s.id ? "border-primary glow-ring" : "border-border hover:border-accent",
              )}
            >
              <span className="mono-label block">{s.findings} findings</span>
              <span className="mt-0.5 block text-foreground">{s.name}</span>
            </motion.button>
          ))}

          <div className="absolute left-[62%] top-[38%]">
            <CrisprCore size={160} />
          </div>

          <div className="absolute right-4 top-[44%] w-[92px] rounded-lg border border-border bg-surface/85 p-2 text-center backdrop-blur">
            <p className="mono-label">Output</p>
            <p className="font-display text-sm text-money">₹ Risk</p>
          </div>
        </Panel>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {node && (
              <motion.div key={node.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="panel p-5">
                <p className="mono-label">Connector</p>
                <h3 className="mt-1 font-display text-xl">{node.name}</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    ["Findings", node.findings],
                    ["Critical", node.critical],
                    ["Validated", node.validated],
                    ["Correlated into cases", node.correlated],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--gradient-core)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${node.volume}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Relative ingest volume</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Panel>
            <p className="mono-label">Core services</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· Connector fabric &amp; rate-limited pollers</li>
              <li>· Entity resolution &amp; confidence scoring</li>
              <li>· Business graph (asset → service → revenue)</li>
              <li>· Monte Carlo financial risk engine</li>
              <li>· Control library &amp; optimiser</li>
              <li>· India regulatory control mapping</li>
            </ul>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
