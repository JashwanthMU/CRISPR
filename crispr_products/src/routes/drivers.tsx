import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Page, Panel } from "@/components/crispr/shell";
import { ScoreDial } from "@/components/crispr/score-dial";
import { RISK_CASE } from "@/lib/crispr-data";

export const Route = createFileRoute("/drivers")({
  head: () => ({
    meta: [
      { title: "Why is this risk high? — CRISPR explainability" },
      { name: "description", content: "Every point of the CRISPR risk score is attributable: exposure, business criticality, validation, threat intel and mitigating controls shown as signed contributions." },
      { property: "og:title", content: "Why is this risk high?" },
      { property: "og:description", content: "Signed contributions behind a score of 87." },
    ],
  }),
  component: Drivers,
});

function Drivers() {
  const max = Math.max(...RISK_CASE.contributors.map((c) => Math.abs(c.value)));

  return (
    <Page
      eyebrow="Page 8 · Explainability"
      title="Why is this risk high?"
      lede="No opaque score. Each contributor is a signed weight; mitigating controls subtract. Judges — and auditors — can trace every point."
      next={{ to: "/recommendations", label: "Recommendation engine" }}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel>
          <p className="mono-label">Risk contributors</p>
          <div className="mt-5 space-y-3">
            {RISK_CASE.contributors.map((c, i) => {
              const positive = c.value > 0;
              return (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex items-center gap-4"
                >
                  <span className="w-52 shrink-0 text-[13px]">{c.label}</span>
                  <div className="relative h-2.5 flex-1 rounded-full bg-secondary">
                    <motion.div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: positive ? "50%" : undefined,
                        right: positive ? undefined : "50%",
                        background: positive ? "var(--critical)" : "var(--safe)",
                      }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(Math.abs(c.value) / max) * 48}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.15, duration: 0.6 }}
                    />
                    <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  </div>
                  <span className={"w-12 text-right font-mono text-[13px] " + (positive ? "text-critical" : "text-safe")}>
                    {positive ? "+" : ""}
                    {c.value}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </Panel>

        <Panel className="flex flex-col items-center justify-center gap-6 py-10" glow>
          <p className="mono-label">Composite risk score</p>
          <ScoreDial score={RISK_CASE.score} />
          <p className="font-display text-lg text-critical">CRITICAL</p>
          <p className="max-w-[240px] text-center text-xs text-muted-foreground">
            Score bands: 0–39 low · 40–59 medium · 60–79 high · 80–100 critical
          </p>
        </Panel>
      </div>
    </Page>
  );
}
