import {
  ZERO_CUP_STAGES,
  ZERO_CUP_PRIZES,
  ZERO_CUP_PRIZE_POOL,
  ZERO_CUP_CHAMPION_TOTAL,
  ZERO_CUP_CURRENT_STAGE,
  type StageKind,
} from "@heckle/shared";
import { Divider } from "@/components/ui/Divider";

const KIND_LABEL: Record<StageKind, string> = {
  open: "Open",
  judged: "Judged",
  vote: "Community vote",
};

export function RoadToTheCup() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 max-w-prose">
        <h2 className="font-display font-black text-3xl md:text-4xl">
          Road to the Cup
        </h2>
        <p className="font-body opacity-80">
          Six stages, Jun 15 → Jul 19. Every project starts in the open; each round
          the field is cut. The Group Stage through the Round of 16 is judged; the
          knockouts are decided by community vote.
        </p>
      </div>
      <Divider />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule">
        {ZERO_CUP_STAGES.map((s, i) => {
          const current = s.key === ZERO_CUP_CURRENT_STAGE;
          return (
            <div
              key={s.key}
              className={`p-5 flex flex-col gap-2 ${current ? "bg-ink text-paper" : "bg-paper"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-sm ${current ? "opacity-70" : "opacity-40"}`}
                >
                  {String(i).padStart(2, "0")}
                </span>
                <span
                  className={`font-mono text-[0.6rem] uppercase tracking-wide border px-1.5 py-0.5 ${
                    current ? "border-paper opacity-80" : "border-rule opacity-60"
                  }`}
                >
                  {KIND_LABEL[s.kind]}
                </span>
              </div>
              <h3 className="font-display text-lg font-black leading-tight">{s.name}</h3>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className={current ? "opacity-80" : "opacity-60"}>{s.window}</span>
                <span className={current ? "opacity-80" : "opacity-60"}>{s.field}</span>
              </div>
              <p className={`font-body text-sm leading-snug ${current ? "opacity-80" : "opacity-70"}`}>
                {s.detail}
              </p>
              {current ? (
                <span className="mt-auto font-mono text-[0.6rem] uppercase tracking-wide opacity-70">
                  Heckle is here
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <h3 className="font-display font-black text-2xl">Prize pool</h3>
          <span className="font-mono text-xs uppercase tracking-wide opacity-60">
            {ZERO_CUP_PRIZE_POOL} total · a champion stacks to {ZERO_CUP_CHAMPION_TOTAL}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-px bg-rule border border-rule">
          {ZERO_CUP_PRIZES.map((p) => (
            <div key={p.tier} className="bg-paper p-5 flex flex-col gap-1">
              <span className="font-display text-2xl font-black leading-none">
                {p.amount}
              </span>
              <span className="font-mono text-xs uppercase tracking-wide">{p.tier}</span>
              <span className="font-mono text-[0.65rem] uppercase tracking-wide opacity-50">
                {p.note}
              </span>
            </div>
          ))}
        </div>
        <p className="font-mono text-xs uppercase tracking-wide opacity-50">
          Prizes stack as a project advances — Top 8 → Top 4 → Top 2 → Champion.
        </p>
      </div>
    </section>
  );
}
