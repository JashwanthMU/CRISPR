import { motion } from "framer-motion";
import { AnimatedNumber } from "./animated-number";

export function ScoreDial({ score, tone = "critical" }: { score: number; tone?: "critical" | "safe" | "primary" }) {
  const r = 78;
  const circ = Math.PI * r;
  const stroke = tone === "safe" ? "var(--safe)" : tone === "primary" ? "var(--primary)" : "var(--critical)";
  return (
    <div className="relative h-[130px] w-[200px]">
      <svg viewBox="0 0 200 110" className="h-full w-full">
        <path d={`M 20 100 A ${r} ${r} 0 0 1 180 100`} fill="none" stroke="var(--secondary)" strokeWidth={14} strokeLinecap="round" />
        <motion.path
          d={`M 20 100 A ${r} ${r} 0 0 1 180 100`}
          fill="none"
          stroke={stroke}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <span className="font-display text-4xl">
          <AnimatedNumber value={score} duration={1.2} />
        </span>
      </div>
    </div>
  );
}
