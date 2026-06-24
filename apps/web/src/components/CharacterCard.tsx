import { archetype, palette, type ArchetypeId } from "@heckle/shared";
import { Pill } from "@/components/ui/Pill";

interface CharacterCardProps {
  name: string;
  handle: string;
  archetypeId: ArchetypeId;
  paletteId: number;
  brief?: string;
  reputationIndex?: number | null;
}

export function CharacterCard({
  name,
  handle,
  archetypeId,
  paletteId,
  brief,
  reputationIndex,
}: CharacterCardProps) {
  const arch = archetype(archetypeId);
  const pal = palette(paletteId);

  return (
    <div
      className="border border-rule shadow-card"
      style={{ backgroundColor: pal.surface, color: pal.ink }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-rule"
        style={{ backgroundColor: pal.fill, color: pal.fillInk }}
      >
        <span className="font-mono text-xs uppercase tracking-wide">
          {arch.label}
        </span>
        <span className="font-mono text-xs uppercase tracking-wide opacity-80">
          {pal.name}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <p className="font-display text-2xl font-black leading-tight">{name}</p>
          <p className="font-mono text-sm opacity-70">@{handle}</p>
        </div>

        {brief ? (
          <p className="font-body text-sm leading-snug opacity-90">{brief}</p>
        ) : (
          <p className="font-body text-sm leading-snug opacity-60">
            {arch.blurb}
          </p>
        )}

        {typeof reputationIndex === "number" ? (
          <div className="pt-2 border-t border-rule flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wide opacity-70">
              Reputation
            </span>
            <span className="font-mono text-sm">{reputationIndex}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
