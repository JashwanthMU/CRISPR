import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Page, Panel } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { CONTROL_GAPS, FRAMEWORKS, RISK_CASE } from "@/lib/crispr-data";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "India-first compliance mapping — RBI, SEBI CSCRF, CERT-In" },
      { name: "description", content: "CRISPR maps every risk case to Indian regulatory controls — RBI, SEBI CSCRF, CERT-In — plus ISO 27001, NIST CSF and CIS. Simulated demo coverage data." },
      { property: "og:title", content: "CRISPR India-first compliance" },
      { property: "og:description", content: "Risk cases mapped to RBI, SEBI CSCRF and CERT-In controls." },
    ],
  }),
  component: Compliance,
});

function Compliance() {
  return (
    <Page
      eyebrow="Page 12 · Regulation"
      title="India-first compliance mapping"
      lede="Global tools stop at ISO and NIST. CRISPR maps the same risk case to RBI, SEBI CSCRF and CERT-In obligations so the security and the audit answer come from one place."
      next={{ to: "/advisor", label: "AI risk advisor" }}
    >
      <Panel className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <p className="mono-label relative">India regulatory layer</p>
        <div className="relative mt-6 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            {["RBI", "SEBI", "CERT-In"].map((r, i) => (
              <motion.span
                key={r}
                initial={{ opacity: 0, y: -12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-lg border border-primary/50 bg-surface-2 px-5 py-2 font-display text-sm"
              >
                {r}
              </motion.span>
            ))}
          </div>
          <span className="text-muted-foreground">↓</span>
          <span className="rounded-lg border border-border bg-surface px-5 py-2 text-sm">Control mapping</span>
          <span className="text-muted-foreground">↓</span>
          <span className="rounded-lg border border-critical/50 bg-surface-2 px-5 py-2 text-sm">
            Risk case {RISK_CASE.id} · {RISK_CASE.title}
          </span>
          <span className="text-muted-foreground">↓</span>
          <div className="grid w-full max-w-md gap-2">
            <p className="mono-label text-center">Control gaps</p>
            {CONTROL_GAPS.map((g, i) => (
              <motion.div
                key={g}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="rounded-lg border border-border bg-surface/70 px-4 py-2 text-[13px]"
              >
                {g}
              </motion.div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FRAMEWORKS.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="panel p-5"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-sm">{f.name}</p>
              <p className="font-display text-xl">
                <AnimatedNumber value={f.coverage} suffix="%" />
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full"
                style={{ background: f.coverage >= 85 ? "var(--gradient-money)" : "var(--gradient-core)" }}
                initial={{ width: 0 }}
                whileInView={{ width: `${f.coverage}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.07 }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Coverage of mapped controls (simulated)</p>
          </motion.div>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Note: compliance coverage shown here is simulated demo data for prototype demonstration, not an assessed audit result.
      </p>
    </Page>
  );
}
