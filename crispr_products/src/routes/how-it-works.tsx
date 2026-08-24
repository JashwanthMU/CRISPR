import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CrisprCore, Page, Panel } from "@/components/crispr/shell";
import { PIPELINE_STAGES, SOURCES } from "@/lib/crispr-data";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How CRISPR works — signals to rupee-quantified risk" },
      { name: "description", content: "The CRISPR loop: ingest security telemetry, correlate into risk cases, map to business context, quantify in rupees, recommend investment." },
      { property: "og:title", content: "How CRISPR works" },
      { property: "og:description", content: "Ingest, correlate, contextualise, quantify, decide." },
    ],
  }),
  component: HowItWorks,
});

const LAYERS = [
  { name: "Signal layer", body: "8 connectors stream findings, alerts, identities, cloud posture and threat intel into one schema.", tone: "cyan" },
  { name: "Correlation layer", body: "Entity resolution merges duplicate findings across tools into a single risk case with a confidence score.", tone: "primary" },
  { name: "Business layer", body: "Every asset is joined to its service, revenue dependency, data sensitivity and regulatory scope.", tone: "violet" },
  { name: "Quantification layer", body: "Likelihood × impact with Monte Carlo loss distribution produces ₹ exposure and expected annual loss.", tone: "money" },
  { name: "Decision layer", body: "Recommendations, what-if scenarios and budget optimisation rank controls by risk reduction per rupee.", tone: "safe" },
];

function HowItWorks() {
  return (
    <Page
      eyebrow="Page 2 · Product mechanics"
      title="How CRISPR works"
      lede="Five layers, one loop. Security tools describe symptoms; CRISPR resolves them into a business risk with a price tag and a next action."
      next={{ to: "/architecture", label: "Security ecosystem architecture" }}
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel className="flex flex-col items-center justify-center gap-6 py-10" glow>
          <div className="space-y-2 text-center">
            {SOURCES.slice(0, 4).map((s) => (
              <p key={s.id} className="text-[13px] text-muted-foreground">
                {s.name}
              </p>
            ))}
          </div>
          <span className="text-muted-foreground">↓</span>
          <CrisprCore size={150} />
          <span className="text-muted-foreground">↓</span>
          <p className="font-display text-lg text-money">₹ Financial risk</p>
        </Panel>

        <div className="space-y-3">
          {LAYERS.map((l, i) => (
            <motion.div
              key={l.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="panel flex gap-4 p-5"
            >
              <span className="mono-label pt-1">0{i + 1}</span>
              <div>
                <h3 className="text-base font-semibold">{l.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-5">
        {PIPELINE_STAGES.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="panel p-4"
          >
            <p className="mono-label">Stage {i + 1}</p>
            <p className="mt-2 text-sm font-medium">{s.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
          </motion.div>
        ))}
      </div>
    </Page>
  );
}
