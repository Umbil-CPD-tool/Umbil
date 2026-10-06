import type { TriageScaffold } from "./types";
import { TEMPLATES as acute } from "./acute";
import { TEMPLATES as giMsk } from "./gi-msk";
import { TEMPLATES as infectionPaedsEnt } from "./infection-paeds-ent";
import { TEMPLATES as specialistGeneral } from "./specialist-general";

export const DIGITAL_TRIAGE_TEMPLATES: Record<string, TriageScaffold> = {
  ...acute,
  ...giMsk,
  ...infectionPaedsEnt,
  ...specialistGeneral,
};
