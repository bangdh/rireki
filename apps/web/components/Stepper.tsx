"use client";

import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

const Ctx = createContext<{ step: number; go: (to: number | "next" | "prev") => void }>({ step: 1, go: () => {} });

/**
 * Horizontal stepper (port of initSteppers in assets/app.js): the header with clickable steps, then children where
 * <StepPanel step={n}> shows only the active panel and <StepGo to="next|prev|n"> moves.
 */
export function Stepper({ steps, children, initial = 1, className = "stepper mb-24", ariaLabel }: { steps: ReactNode[]; children: ReactNode; initial?: number; className?: string; ariaLabel?: string }) {
  const [step, setStep] = useState(initial);
  const go = useCallback(
    (to: number | "next" | "prev") => setStep((s) => Math.max(1, Math.min(steps.length, to === "next" ? s + 1 : to === "prev" ? s - 1 : to))),
    [steps.length],
  );
  return (
    <Ctx.Provider value={{ step, go }}>
      <div className={className} aria-label={ariaLabel}>
        {steps.map((label, i) => (
          <button key={i} type="button" className={`step${i + 1 < step ? " done" : i + 1 === step ? " active" : ""}`} onClick={() => go(i + 1)}>
            <span className="n">{i + 1}</span>
            <span className="t">{label}</span>
          </button>
        ))}
      </div>
      {children}
    </Ctx.Provider>
  );
}

/** Current step and `go()` for children that jump programmatically (e.g. to the first step with validation errors). */
export const useStepper = () => useContext(Ctx);

export function StepPanel({ step, children }: { step: number; children: ReactNode }) {
  return useContext(Ctx).step === step ? children : null;
}

export function StepGo({ to, ...rest }: { to: number | "next" | "prev" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { go } = useContext(Ctx);
  return <button type="button" onClick={() => go(to)} {...rest} />;
}
