import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Page, Panel } from "@/components/crispr/shell";
import { ADVISOR_QA } from "@/lib/crispr-data";

export const Route = createFileRoute("/advisor")({
  head: () => ({
    meta: [
      { title: "AI risk advisor — ask CRISPR" },
      { name: "description", content: "Ask CRISPR about your biggest financial cyber risk, the effect of enabling MFA or where to spend a ₹1 crore budget. Answers are retrieved from the risk engine, not invented." },
      { property: "og:title", content: "Ask CRISPR — AI risk advisor" },
      { property: "og:description", content: "Engine-grounded answers about risk, controls and budget." },
    ],
  }),
  component: Advisor,
});

type Turn = { role: "user" | "crispr"; text: string; cites?: readonly string[] };

function Advisor() {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "crispr", text: "I read your correlated risk cases, business graph and financial model. Ask me anything — every number I return is retrieved from the engine.", cites: ["26 risk cases", "Engine v1.4"] },
  ]);
  const [thinking, setThinking] = useState(false);

  const ask = (i: number) => {
    const qa = ADVISOR_QA[i]!;
    setTurns((t) => [...t, { role: "user", text: qa.q }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setTurns((t) => [...t, { role: "crispr", text: qa.a, cites: qa.cites }]);
    }, 900);
  };

  return (
    <Page
      eyebrow="Page 13 · AI advisor"
      title="Ask CRISPR"
      lede="A retrieval-grounded assistant sitting on top of the risk engine. It cites the case, the model and the control library instead of generating plausible numbers."
      next={{ to: "/dashboard", label: "Enter the CRISPR console" }}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel className="flex min-h-[520px] flex-col">
          <div className="flex-1 space-y-4">
            <AnimatePresence initial={false}>
              {turns.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={t.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      "max-w-[80%] rounded-xl border px-4 py-3 text-sm leading-relaxed " +
                      (t.role === "user" ? "border-primary/50 bg-surface-2" : "border-border bg-surface/70")
                    }
                  >
                    <p className="mono-label mb-1">{t.role === "user" ? "You" : "CRISPR"}</p>
                    <p>{t.text}</p>
                    {t.cites && (
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {t.cites.map((c) => (
                          <span key={c} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {c}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {thinking && (
              <div className="flex gap-1.5 pl-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-2 w-2 rounded-full bg-accent"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="mt-6 rounded-lg border border-border bg-surface/50 px-4 py-3 text-xs text-muted-foreground">
            Prototype: responses are retrieved from the demo engine dataset. Pick a question on the right to run it.
          </p>
        </Panel>

        <Panel>
          <p className="mono-label">Suggested questions</p>
          <div className="mt-4 space-y-2">
            {ADVISOR_QA.map((qa, i) => (
              <button
                key={qa.q}
                onClick={() => ask(i)}
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-left text-[13px] transition-colors hover:border-primary"
              >
                {qa.q}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </Page>
  );
}
