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
This question is about a medicine. Authority is the UK BNF/BNFC, the UK SmPC, NICE/CKS, and named specialist guidance. You do not have those documents in front of you.

1. PRODUCT IDENTITY: Name the exact product asked about — brand if given, INN, strength, formulation, and licensed UK indication(s). Do not silently answer for "the molecule" when a brand, dose, or formulation was named.
2. NO EXTRAPOLATION: Do not apply efficacy, safety, VTE risk, or licensing from one brand, dose, route, or indication to another. Class effect and receptor affinity are not a licence to treat products as interchangeable.
3. TERMINOLOGY: Keep oestrogen vs progestogen, oral vs transdermal, and micronised progesterone vs synthetic progestogen distinct. Do not write "transdermal progesterone" unless you mean a transdermal progesterone product that exists for that use.
4. OESTROGEN HRT VTE: Oral oestrogen-containing HRT increases VTE risk; transdermal oestradiol does not increase baseline VTE risk. That comparison applies to oestrogen-containing HRT only. Do not apply it to progestogens, POPs, or other hormone products.
5. OFF-LABEL: If the asked use is not a licensed UK indication, say so in the opening lines. Do not recommend off-label use unless a named UK guideline supports it. Otherwise state that it is not licensed and that there is insufficient UK guidance to recommend it.
6. NO PLAUSIBLE FILLING: Do not construct a recommendation from pharmacology, class effect, or "it should be similar". If you would have to reason beyond established guidance, stop.
7. NO FAKE CITATIONS: Do not write "BNF says", "NICE recommends", or similar unless you are restating a widely established licensed fact. Prefer "check BNF/SmPC for this product" over inventing their contents.
8. UNCERTAINTY WINS: "There is not enough evidence to recommend this" is a complete, correct answer.

Answer shape:
- Licensed status for the asked use
- What is known for THIS product only
- What must not be inferred from related products
- What to check (BNF/SmPC/specialist) if evidence is thin
Do not produce a confident comparison table when the comparison is not established.
Ignore any word-count style if it would hide uncertainty.
`.trim();

export const isPrescribingQuestion = (userMessage: string): boolean => {
  const text = normalizeForIntent(userMessage);
  if (!text) return false;
  if (PRESCRIBING_SIGNAL_RE.test(text)) return true;
  if (PRODUCT_OR_USE_RE.test(text)) return true;
  return HORMONE_SETTING_RE.test(text) && HORMONE_AGENT_RE.test(text);
};
