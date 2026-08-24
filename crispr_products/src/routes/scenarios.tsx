import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Page, Panel } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { ScoreDial } from "@/components/crispr/score-dial";
import { RISK_CASE } from "@/lib/crispr-data";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "What-if simulator — model controls before you buy them" },
      { name: "description", content: "Toggle MFA, patching and segmentation, move EDR coverage and patch delay, then simulate the effect on risk score, likelihood and expected annual loss." },
      { property: "og:title", content: "CRISPR what-if simulator" },
      { property: "og:description", content: "Model controls before you buy them." },
    ],
  }),
  component: Scenarios,
});

type Inputs = { mfa: boolean; patch: boolean; segment: boolean; edr: number; delay: number };

function compute({ mfa, patch, segment, edr, delay }: Inputs) {
  let score: number = RISK_CASE.score;
  if (mfa) score -= 21;
  if (patch) score -= 12;
  if (segment) score -= 6;
  score -= Math.round(((edr - 60) / 40) * 6);
  score += Math.round((delay / 30) * 8);
  score = Math.max(8, Math.min(100, score));

  const likelihood = Math.max(1.5, +(RISK_CASE.likelihood * (score / RISK_CASE.score) ** 1.7).toFixed(1));
  const eal = Math.max(4, +((likelihood / RISK_CASE.likelihood) * RISK_CASE.ealLakh).toFixed(1));
  return { score, likelihood, eal };
}

function Scenarios() {
  const [inputs, setInputs] = useState<Inputs>({ mfa: false, patch: false, segment: false, edr: 60, delay: 14 });
  const [applied, setApplied] = useState<Inputs | null>(null);
  const scenario = compute(applied ?? { mfa: false, patch: false, segment: false, edr: 60, delay: 14 });

  return (
    <Page
      eyebrow="Page 10 · Simulation"
      title="What-if simulator"
      lede="Change the control state on the left and simulate. The right side recomputes risk score, incident likelihood and expected annual loss from the same engine used on the risk page."
      next={{ to: "/budget", label: "₹1 crore budget optimiser" }}
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Panel>
          <p className="mono-label">What-if controls</p>
          <div className="mt-5 space-y-5">
            {([
              ["mfa", "Privileged MFA"],
              ["patch", "Patch authentication vulnerability"],
              ["segment", "Network segmentation"],
            ] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <Switch checked={inputs[k]} onCheckedChange={(v) => setInputs((s) => ({ ...s, [k]: v }))} />
              </div>
            ))}

            <div>
              <div className="flex justify-between text-sm">
                <span>EDR coverage</span>
                <span className="font-mono">{inputs.edr}%</span>
              </div>
              <Slider className="mt-3" min={60} max={100} step={5} value={[inputs.edr]} onValueChange={([v]) => setInputs((s) => ({ ...s, edr: v ?? s.edr }))} />
            </div>

            <div>
              <div className="flex justify-between text-sm">
                <span>Patch delay</span>
                <span className="font-mono">{inputs.delay} days</span>
              </div>
              <Slider className="mt-3" min={0} max={30} step={1} value={[inputs.delay]} onValueChange={([v]) => setInputs((s) => ({ ...s, delay: v ?? s.delay }))} />
            </div>

            <button
              onClick={() => setApplied({ ...inputs })}
              className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Simulate
            </button>
          </div>
        </Panel>

        <div className="grid gap-6 sm:grid-cols-2">
          <Panel>
            <p className="mono-label">Current state</p>
            <div className="mt-4 flex flex-col items-center gap-3">
              <ScoreDial score={RISK_CASE.score} />
              <p className="text-xs text-critical">CRITICAL</p>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row k="Incident likelihood" v={`${RISK_CASE.likelihood}%`} />
              <Row k="Expected annual loss" v={`₹${RISK_CASE.ealLakh} L`} />
              <Row k="Open control gaps" v="3" />
            </dl>
          </Panel>

          <Panel glow>
            <p className="mono-label">Scenario</p>
            <div className="mt-4 flex flex-col items-center gap-3">
              <motion.div key={scenario.score} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
                <ScoreDial score={scenario.score} tone={scenario.score < 60 ? "safe" : "critical"} />
              </motion.div>
              <p className="text-xs text-muted-foreground">{scenario.score < 40 ? "MEDIUM" : scenario.score < 60 ? "MEDIUM-HIGH" : scenario.score < 80 ? "HIGH" : "CRITICAL"}</p>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row k="Incident likelihood" v={<><AnimatedNumber value={scenario.likelihood} decimals={1} duration={0.7} />%</>} />
              <Row k="Expected annual loss" v={<>₹<AnimatedNumber value={scenario.eal} decimals={1} duration={0.7} /> L</>} />
              <Row
                k="Annual risk reduction"
                v={<span className="text-money">₹<AnimatedNumber value={+(RISK_CASE.ealLakh - scenario.eal).toFixed(1)} decimals={1} duration={0.7} /> L</span>}
              />
            </dl>
            {!applied && <p className="mt-4 text-xs text-muted-foreground">Press Simulate to apply the control changes.</p>}
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}
