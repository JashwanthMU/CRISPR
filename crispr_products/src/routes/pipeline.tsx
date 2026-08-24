import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Page, Panel } from "@/components/crispr/shell";
import { AnimatedNumber } from "@/components/crispr/animated-number";
import { PIPELINE_STAGES, SOURCES } from "@/lib/crispr-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "CRISPR data pipeline simulation" },
      { name: "description", content: "Press start and watch simulated findings flow through ingestion, normalization, correlation, the business graph and the risk engine." },
      { property: "og:title", content: "CRISPR data pipeline simulation" },
      { property: "og:description", content: "Watch raw security findings become one priced risk case." },
    ],
  }),
  component: Pipeline,
});

function Pipeline() {
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(-1);
  const [ingested, setIngested] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(true);
    setStage(-1);
    setIngested(0);
    PIPELINE_STAGES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStage(i), 700 + i * 1100));
    });
    timers.current.push(setTimeout(() => setIngested(817), 500));
    timers.current.push(setTimeout(() => setRunning(false), 700 + PIPELINE_STAGES.length * 1100));
  };

  return (
    <Page
      eyebrow="Page 4 · Live simulation"
      title="The data pipeline"
      lede="817 simulated findings per minute enter the platform. Watch them collapse from raw telemetry into 26 correlated, priced risk cases."
      next={{ to: "/correlation", label: "Unified findings" }}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          onClick={start}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-60"
          disabled={running}
        >
          {running ? "Simulating…" : "Start simulation"}
        </button>
        <span className="mono-label">
          Ingested <AnimatedNumber value={ingested} /> events
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <p className="mono-label">Raw security data</p>
          <div className="mt-4 space-y-3">
            {SOURCES.map((s, i) => (
              <div key={s.id} className="text-[13px]">
                <div className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="mono-label">{s.findings}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--gradient-core)" }}
                    animate={{ width: running || stage >= 0 ? `${s.volume}%` : "0%" }}
                    transition={{ duration: 0.9, delay: i * 0.06 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="relative overflow-hidden">
          <p className="mono-label">Processing stages</p>
          <div className="mt-4 space-y-3">
            {PIPELINE_STAGES.map((s, i) => {
              const done = stage > i;
              const activeNow = stage === i;
              return (
                <div key={s.id} className="relative">
                  <div
                    className={cn(
                      "rounded-lg border px-4 py-3 transition-colors",
                      activeNow ? "border-primary bg-surface-2 glow-ring" : done ? "border-safe/50 bg-surface/70" : "border-border bg-surface/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="mono-label">{done ? "done" : activeNow ? "running" : "idle"}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
                    <AnimatePresence>
                      {activeNow && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1 }}
                          className="mt-2 h-1 rounded-full"
                          style={{ background: "var(--gradient-money)" }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && <div className="mx-auto h-3 w-px bg-border" />}
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {stage >= PIPELINE_STAGES.length - 1 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-lg border border-money/40 bg-surface-2 p-4"
              >
                <p className="mono-label">Engine output</p>
                <p className="mt-1 font-display text-2xl text-money">
                  ₹<AnimatedNumber value={79.8} decimals={1} /> L expected annual loss
                </p>
                <p className="mt-1 text-xs text-muted-foreground">RC-001 · Payment Authentication Compromise · score 87</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>
    </Page>
  );
}
