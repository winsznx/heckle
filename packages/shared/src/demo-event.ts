export type TakeKind = "Reaction" | "Prediction" | "Debate";

export interface EventTrigger {
  id: string;
  /** Offset from event start, in seconds (compressed ~90s replay). */
  atSeconds: number;
  /** Display label on the timeline. */
  label: string;
  /** Narration fed to the model describing what just happened. */
  context: string;
  /** Preferred take kind to generate at this beat. */
  kind: TakeKind;
}

export interface PredictionField {
  field: string;
  label: string;
  options?: string[];
  /** Canned ground-truth outcome the resolver grades against. */
  resolvedValue: string;
}

export interface DemoEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "sports";
  homeTeam: string;
  awayTeam: string;
  durationSeconds: number;
  triggers: EventTrigger[];
  predictionFields: PredictionField[];
  finalOutcome: string;
}

/**
 * The single canned demo event for the group stage. A 90-second fictional
 * soccer replay with six timestamped beats. Used by: the event page timeline,
 * the inference agent's trigger walk, and the resolver's prediction grading.
 */
export const DEMO_EVENT: DemoEvent = {
  id: "1",
  slug: "demo",
  title: "North End FC vs Riverside United",
  description: "Group-stage friendly. A 90-second replay with six beats — chaos guaranteed.",
  category: "sports",
  homeTeam: "North End FC",
  awayTeam: "Riverside United",
  durationSeconds: 90,
  triggers: [
    { id: "kickoff", atSeconds: 0, label: "Kickoff", context: "The match is underway. North End kick off and press high early.", kind: "Reaction" },
    { id: "goal-12", atSeconds: 15, label: "Goal — North End 12'", context: "North End score! A scrappy goal bundled in from a corner. 1-0 North End.", kind: "Reaction" },
    { id: "var-34", atSeconds: 35, label: "Controversial call 34'", context: "Riverside have a goal chalked off after a long VAR check for a marginal offside. The crowd is furious. Still 1-0.", kind: "Debate" },
    { id: "goal-67", atSeconds: 60, label: "Goal — Riverside 67'", context: "Riverside equalise with a thunderous strike from outside the box. 1-1. Who wins it from here?", kind: "Prediction" },
    { id: "goal-88", atSeconds: 78, label: "Goal — North End 88'", context: "North End snatch a late winner on the counter. 2-1.", kind: "Reaction" },
    { id: "fulltime", atSeconds: 90, label: "Full time", context: "Full time. North End win 2-1 in a chaotic finish.", kind: "Reaction" },
  ],
  predictionFields: [
    { field: "winner", label: "Match winner", options: ["North End FC", "Riverside United", "Draw"], resolvedValue: "North End FC" },
    { field: "total_goals", label: "Total goals", resolvedValue: "3" },
  ],
  finalOutcome: "North End FC won 2-1.",
};
