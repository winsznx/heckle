import type { TakeKind } from "@heckle/shared";

export interface TakePromptInput {
  /** Base archetype voice instruction (e.g. `archetype(id).systemSeed`). */
  archetypeSeed: string;
  /** Owner-authored personality detail layered on top of the archetype. */
  personalityBrief: string;
  /** What the event is (teams, framing) — sets the scene for the model. */
  eventContext: string;
  /** Timeline label for the beat being reacted to. */
  triggerLabel: string;
  /** Narration of what just happened at this beat. */
  triggerContext: string;
  /** Preferred take flavour for this beat. */
  kind: TakeKind;
}

/**
 * Build the single instruction string sent to the TEE chat model for one beat.
 * Produces ONE short, in-character take (<=240 chars). On a `Prediction` beat it
 * additionally requires a final one-line call on the match winner.
 */
export function buildTakePrompt(input: TakePromptInput): string {
  const {
    archetypeSeed,
    personalityBrief,
    eventContext,
    triggerLabel,
    triggerContext,
    kind,
  } = input;

  const lines = [
    archetypeSeed.trim(),
    personalityBrief.trim()
      ? `Personality detail: ${personalityBrief.trim()}`
      : "",
    `Event: ${eventContext.trim()}`,
    `What just happened (${triggerLabel.trim()}): ${triggerContext.trim()}`,
    "",
    "Write ONE short, punchy take in character about this moment. " +
      "Stay fully in voice. Hard limit 240 characters. No hashtags, no quotes, no emoji, no preamble — just the take.",
  ];

  if (kind === "Prediction") {
    lines.push(
      "Then, on a new final line, give a one-line prediction of who wins the match. " +
        "Start that line with 'Prediction:' and name exactly one of the two teams.",
    );
  }

  return lines.filter((line) => line.length > 0 || line === "").join("\n").trim();
}
