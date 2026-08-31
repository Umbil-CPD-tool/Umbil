import { normalizeForIntent } from "@/lib/askIntent";

/**
 * Detects questions where formulation, dose, licence or indication can change
 * the answer. Used to inject stricter prescribing discipline — not a drug list.
 */
const PRESCRIBING_SIGNAL_RE =
  /\b(dose|dosing|dosage|prescribe|prescribing|prescribed|prescription|bnf|bnfc|smpc|spc|licensed|licence|licenced|off[-\s]?label|unlicensed|indication|contraindicat(?:ion|ed|e)?|interact(?:ion|s|ing)?|formulation|modified[-\s]?release|slow[-\s]?release|brand name|generic name|tablet|capsules?|pessaries|pessary|patch(?:es)?|gel|cream|inhaler|nebulis(?:e|er)|injection|infusion|intravaginal|transdermal|subcut(?:aneous)?|intramuscular|mcg|micrograms?|milligrams?|\bmg\b|\bml\b|units?|puffs?)\b/;

const HORMONE_SETTING_RE =
  /\b(hrt|menopause|perimenopause|contracept(?:ive|ion)|endometrial protection)\b/;

const HORMONE_AGENT_RE =
  /\b(progestogens?|progestins?|progesterone|oestrogens?|estrogens?|\bpop\b|cocp|slynd|utrogestan|evorel|estradot|sandrena|oestrogel|angeliq|kliovance|femoston|tibolone|mirena|ius)\b/;

const PRODUCT_OR_USE_RE =
  /\b(slynd|utrogestan|evorel|estradot|sandrena|oestrogel|angeliq|kliovance|femoston|tibolone|ozempic|wegovy|mounjaro|saxenda|semaglutide|tirzepatide|liraglutide|can i (?:use|give|start|switch)|use (?:it |this )?(?:for|as|in)|for (?:hrt|menopause|contraception))\b/;

export const PRESCRIBING_GUARDRAILS = `
PRESCRIBING DISCIPLINE
Name the exact product (brand if given, INN, strength, formulation, licensed UK indication). Do not answer for "the molecule" when a brand or dose was named.
Do not transfer efficacy, VTE risk, or licensing across brands, doses, routes, or indications. Keep oestrogen / progestogen and oral / transdermal distinct.
Off-label: say so first. Only recommend it if a named UK guideline supports it; otherwise "not licensed; insufficient UK guidance".
If the product licence and usual UK practice differ, state both. Label which is licensed. Do not call specialist-society or common-practice use "licensed".
If the details meet a listed contraindication, say contraindicated. Do not soften it to a preference.
Two GI-bleed risks together (NSAID, SSRI, anticoagulant, antiplatelet, oral steroid) → flag bleed risk and gastroprotection.
Do not write "BNF says" or "NICE recommends" unless restating a standard licensed fact. Prefer "check BNF/SmPC".
"There is not enough evidence to recommend this" is a complete answer. No confident comparison tables for unestablished comparisons.
`.trim();

const SIMPLE_LOOKUP_RE =
  /\b(dose|dosing|how many days|duration of|threshold|cutoff|first line (?:for|is)|what is the (?:dose|normal|range))\b/;

const NOT_SIMPLE_RE =
  /\b(off[-\s]?label|unlicensed|licensed for|can i use|versus|compared|endometrial|for hrt|for menopause)\b/;

/** Short licensed-fact questions can skip reasoning tokens for faster TTFT. */
export const isSimpleClinicalLookup = (userMessage: string): boolean => {
  const text = normalizeForIntent(userMessage);
  if (!text || text.length > 160) return false;
  if (NOT_SIMPLE_RE.test(text)) return false;
  if (HORMONE_SETTING_RE.test(text) && HORMONE_AGENT_RE.test(text)) return false;
  return SIMPLE_LOOKUP_RE.test(text);
};

export const isPrescribingQuestion = (userMessage: string): boolean => {
  const text = normalizeForIntent(userMessage);
  if (!text) return false;
  if (PRESCRIBING_SIGNAL_RE.test(text)) return true;
  if (PRODUCT_OR_USE_RE.test(text)) return true;
  return HORMONE_SETTING_RE.test(text) && HORMONE_AGENT_RE.test(text);
};

const HARD_SIGNAL_RE =
  /\b(off[-\s]?label|unlicensed|differential|2\s?ww|two week wait|versus|compared|endometrial protection|can i use)\b/;

/** Licence-ambiguous, comparison, or long-case questions that benefit from medium reasoning. */
export const isHardClinicalQuestion = (userMessage: string): boolean => {
  if (isSimpleClinicalLookup(userMessage)) return false;
  const text = normalizeForIntent(userMessage);
  if (!text) return false;
  if (text.length > 400) return true;
  if (HARD_SIGNAL_RE.test(text)) return true;
  if (HORMONE_SETTING_RE.test(text) && HORMONE_AGENT_RE.test(text)) return true;
  return isPrescribingQuestion(userMessage) && !SIMPLE_LOOKUP_RE.test(text);
};
