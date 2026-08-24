import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Page, Panel } from "@/components/crispr/shell";
import { ASSET_CONTEXT, ASSET_GRAPH } from "@/lib/crispr-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Business graph — technical severity is not business risk" },
      { name: "description", content: "Explore the CRISPR asset and business graph: internet exposure, service criticality, revenue dependency, data sensitivity and regulatory scope." },
      { property: "og:title", content: "CRISPR business graph" },
      { property: "og:description", content: "Technical severity is not business risk. Click any node." },
    ],
  }),
  component: Assets,
});

function Assets() {
  const [selected, setSelected] = useState("payment");
  const ctx = ASSET_CONTEXT[selected]!;
  const node = ASSET_GRAPH.nodes.find((n) => n.id === selected)!;

  return (
    <Page
      eyebrow="Page 6 · Business graph"
      title="Technical severity ≠ business risk"
      lede="The same CVE on a test box and on the payment path are not the same problem. CRISPR keeps the dependency chain, revenue exposure and regulatory scope attached to every asset."
      next={{ to: "/financial", label: "Financial risk engine" }}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel className="relative h-[560px] overflow-hidden p-0">
          <div className="absolute inset-0 grid-bg opacity-25" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {ASSET_GRAPH.edges.map(([a, b]) => {
              const na = ASSET_GRAPH.nodes.find((n) => n.id === a)!;
              const nb = ASSET_GRAPH.nodes.find((n) => n.id === b)!;
              const hot = selected === a || selected === b;
              return (
                <g key={`${a}-${b}`}>
                  <line x1={na.x} y1={na.y + 3} x2={nb.x} y2={nb.y} stroke="var(--grid)" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
                  <line
                    x1={na.x}
                    y1={na.y + 3}
                    x2={nb.x}
                    y2={nb.y}
                    stroke={hot ? "var(--critical)" : "var(--cyan)"}
                    strokeWidth={0.6}
                    strokeDasharray="3 16"
                    className="animate-flow-dash"
                    opacity={hot ? 1 : 0.45}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>

          {ASSET_GRAPH.nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelected(n.id)}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              className={cn(
                "absolute -translate-x-1/2 rounded-lg border bg-surface/90 px-4 py-2 text-[13px] backdrop-blur transition-all",
                selected === n.id ? "border-primary glow-ring scale-105" : "border-border hover:border-accent",
              )}
            >
              <span className="mono-label block">{n.kind}</span>
              {n.label}
            </button>
          ))}
        </Panel>

        <AnimatePresence mode="wait">
          <motion.div key={selected} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Panel glow>
              <p className="mono-label">Business context</p>
              <h3 className="mt-1 font-display text-2xl">{node.label}</h3>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Service", ctx.service],
                  ["Criticality", `${ctx.criticality} / 100`],
                  ["Revenue dependency", ctx.revenue],
                  ["Data sensitivity", ctx.sensitivity],
                  ["Internet facing", ctx.internet],
                  ["Regulated", ctx.regulated],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-mono">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-money)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${ctx.criticality}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Business criticality weighting applied to every finding on this asset.</p>
            </Panel>
          </motion.div>
        </AnimatePresence>
      </div>
    </Page>
  );
}
