// UK clinical triage scaffolds (NICE CKS / NICE guidance / NHS.uk themes).
// Patient-facing questions use plain English — no clinical jargon in replies.
// Screening questions only — never diagnose or assign urgency/disposition.
//
// Template bodies live in ./digital-triage-templates/ (split by clinical group).

export type { TriageScaffold } from "./digital-triage-templates/types";
export { STANDARD_SAFETY_CLOSER } from "./digital-triage-templates/types";

import type { TriageScaffold } from "./digital-triage-templates/types";
import { TEMPLATES as acute } from "./digital-triage-templates/acute";
import { TEMPLATES as giMsk } from "./digital-triage-templates/gi-msk";
import { TEMPLATES as infectionPaedsEnt } from "./digital-triage-templates/infection-paeds-ent";
import { TEMPLATES as specialistGeneral } from "./digital-triage-templates/specialist-general";

export const DIGITAL_TRIAGE_TEMPLATES: Record<string, TriageScaffold> = {
  ...acute,
  ...giMsk,
  ...infectionPaedsEnt,
  ...specialistGeneral,
};
