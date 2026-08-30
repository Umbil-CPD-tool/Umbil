import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAskIntent, shouldAskModelForIntent, type AskIntent } from "./askIntent";
import type { ChatToolId } from "./tools/types";

/**
 * Realistic phrasings collected per tool. Includes typos, NHS shorthand, txt-speak, and the
 * common pattern where a clinician pastes a note first and puts the instruction at the end.
 */
const POSITIVES: Record<ChatToolId, string[]> = {
  referral: [
    "can u write a referal letter for this pt",
    "referral please",
    "refferal letter needed for this lady thanks",
    "write a referral to gastro",
    "2ww referral for suspected colorectal ca pls",
    "need a USC referral, ?upper GI ca",
    "pls draft ent 2ww letter - 54F hoarse 4/52, smoker, o/e neck NAD",
    "refer to cardiology, exertional chest pain, ET down to 50m",
    "can you turn this into something i can send to cardiology",
    "make this into a referral",
    "68M, 3/7 cough, CRP 45, sats 94% oa, o/e crackles L base, hx COPD ex-smoker 40pk yr, afebrile, no haemoptysis ---- make this into a referral",
    "43F 6/12 change in bowel habit, PR bleed x3, Hb 98 ferritin 6, FIT 40, wt loss 4kg, o/e abdo soft no mass, PR no mass ---- 2ww lower GI referral please",
    "write to ortho, knee OA, failed conservative mx, wants TKR opinion",
    "derm 2ww pls - changing mole on back, 8mm, irregular border, ?melanoma",
    "urology ref, 72M, PSA 12.4, DRE craggy, no LUTS",
    "rheum referral - ?inflam arthritis, EMS 2hrs, MCPs swollen, RF neg CRP 30",
    "neuro referral for ?MS - optic neuritis last yr, now paraesthesia both legs",
    "psych referral, low mood 6/12, sertraline 100mg no response, ?CMHT",
    "paeds referral - 3yo faltering growth, crossed 2 centiles",
    "gynae ref pls, PMB x2, on HRT, USS ET 6mm",
    "can you write this up as a letter to the respiratory team",
    "pt needs referring to MSK physio, can u write it",
    "draft letter to the consultant pls",
    "write this as a letter for the specialist, ill paste into emis",
    "put this into a referral letter format",
    "need to refer to endocrine, please write the letter",
    "write to gastro re ?IBD, bloody diarrhoea 6/52, faecal calprotectin 480",
    "letter to vascular pls - claudication at 100m, absent foot pulses, ABPI 0.6",
    "refer for suspected lung ca, cxr shows R hilar mass",
    "2ww breast pls, 58F new lump UOQ left, hard, tethered, no nipple change",
    "can u do the referral bit for me",
    "write a referal for this gentleman to the pain clinic",
    "referral to memory clinic - 79F MMSE 22, collateral hx from daughter",
    "write up as ref letter, urgent",
    "Refer this 72 year old with worsening dysphagia",
    "refer this 72 year old with worsening dysphagia and weight loss to gastro",
    "please refer this man with iron deficiency anaemia",
  ],

  safety_netting: [
    "saftey netting for this pt",
    "SN advice pls",
    "safety netting entry for emis",
    "write safety netting for a febrile child",
    "can u write some saftey netting i can paste into systmone",
    "add safety netting please",
    "3yo temp 38.5, drinking ok, no rash, chest clear, dx viral URTI ---- safety netting pls",
    "need a SN note for the record",
    "safety netting for chest pain sent home",
    "write the safety netting bit",
    "pls document safety netting for this consultation",
    "something to paste into EMIS re safety netting",
    "24F RIF pain, obs stable, urine NAD, no guarding, ?mittelschmerz vs early appendicitis, home w advice, review 24h ---- write the safety netting for the notes",
    "safety net advice for possible sepsis, sent home",
    "sn for headache pt, no red flags today",
    "safetynetting for this baby pls",
    "safety netting for a pt with ?TIA awaiting clinic",
    "pls give me a saftey netting entry for uncomplicated LRTI on amoxicillin",
    "78M UTI, started nitro 3/7, lives alone, DNs involved ---- safety netting for the record pls",
    "put the safety netting in for me",
    "safety netting for a child w croup discharged from OOH",
    "i need a medicolegal note re advice given",
    "write saftey netting: back pain, no cauda equina features today",
    "5/7 sore throat, feverPAIN 2, no abx given ---- can u write the safety netting",
    "can u write safety netting for a pt im not admitting w abdo pain",
    "add a SN paragraph to my notes",
    "safety netting for a pregnant lady w PV spotting, EPU tomorrow",
    "short safety netting entry, viral illness, 2yo",
    "write the come back if bit for me",
    "pls draft safety netting - suspected shingles, aciclovir started",
    "SN pls for pt w palpitations, ecg normal, awaiting holter",
    "31M ?viral labyrinthitis, no central signs, home w prochlorperazine ---- keep it short, going into systmone, safety netting",
    "safety netting for a diabetic foot ulcer pt, podiatry next week",
    "write the safety netting, and make it specific not generic",
    "Safety net this child with a fever",
    "SN this febrile child",
  ],

  digital_triage: [
    "pt sent this on e-consult, can u draft a reply",
    "accurx reply pls",
    "write a triage reply",
    "draft a response to this online consult asking the screening qs",
    "can u write back to this pt asking the right questions",
    "triage this - pt says burning when passing urine, 2 days",
    "need a digital triage response for this econsult",
    "reply to accurx msg pls",
    "write something i can send back via online consultation",
    "draft an online consult reply, ask about red flags",
    "can u write the reply i send to the patient asking for more info",
    "triage reply for a pt reporting diarrhoea 5 days",
    "write a message back asking screening questions, dont diagnose",
    "econsult reply pls - lump in my neck for a month",
    "pt: i think i have a uti again ---- draft response",
    "draft accurx text asking about her periods before i can advise",
    "reply to this online form pls, ask what i need to know",
    "triage msg pls, keep it calm, pt anxious re chest tightness",
    "pt submitted dizzy spells for a week via patchs ---- reply asking screening qs",
    "draft a reply for the online consultation inbox",
    "can u triage this and write the response",
    "write a short reply asking the questions i need before booking",
    "online consult: rash on my legs, not itchy, 4 days ---- write reply",
    "pt sent photo + is this infected - write back asking the screening questions",
    "e consult reply, ask duration and red flags, offer appt if any",
    "need a reply to send via systmone online, pt reports palpitations",
    "triage response for a pt w sore throat asking for abx",
    "pt msg re ?shingles rash - can u draft what i send back",
    "write the accurx reply - keep it short, and dont give a diagnosis",
    "this came through overnight OOH - draft the reply asking screening qs before i ring",
    "triage",
    "triage pls",
    "please triage",
    "can you triage",
    "can you triage this",
    "pt msg - headache 3 days. triage",
  ],

  discharge_summary: [
    "write a dischage summary",
    "discharge letter pls",
    "TTO letter needed",
    "can u do the TTA summary",
    "dischage summary for this pt to gp",
    "write the discharge summary for the GP",
    "74F admitted CAP, IV co-amox 3/7 then po, CRP 210 to 40, sats 96% oa, mobilising, d/c home ---- discharge summary pls",
    "need a d/c letter, pt going home today",
    "write the discharge letter, meds changed: stopped bisoprolol, started ramipril 2.5",
    "ttos done, can u write the letter",
    "discharge summary - NSTEMI, PCI to LAD, DAPT 12/12",
    "write dischage letter for gp incl follow up plan",
    "pls draft the discharge summary from these ward notes",
    "82M NOF fracture, hemiarthroplasty day 1, PT/OT input, d/c to rehab ---- letter to gp",
    "can u summarise this admission into a discharge letter",
    "discharge letter for the gp, mention we stopped her metformin",
    "write d/c summary, keep the med changes clear",
    "pt for home - discharge summary pls",
    "discharge summary, AKI 2 secondary to dehydration, creat back to baseline",
    "draft the discharge for this pt, incl outstanding results",
    "write TTO summary pls, going home this afternoon",
    "discharge letter - DKA resolved, insulin regime changed, diabetes team following up",
    "can u put these ward notes into a discharge summary",
    "discharge summary for a pt w new dx heart failure, EF 35%",
    "write the discharge letter and include that DNs need to visit",
    "summarise the admission for the gp pls",
    "discharge letter for this lady - PE, apixaban started, 3/12, no provoking factors",
    "write d/c letter - IECOPD, pred 5/7, doxy 5/7, resp clinic 6/52",
    "pls do the dischage paperwork letter for gp",
    "discharge summary, pt self-discharged against advice, document that",
    "discharge summary from ED - head injury obs o/n, CT NAD, home w advice",
    "write the gp letter for this discharge, aslo mention the new penicillin allergy",
    "d/c summary pls - delirium 2ry to UTI, back to baseline, care package increased",
    "discharge letter for a paeds pt - bronchiolitis, weaned off o2, feeding well",
    "need the discharge summary written up before i leave",
    "discharge this patient",
    "write a discharge letter for this admission",
  ],

  sbar: [
    "sbar this",
    "sbar pls",
    "write an SBAR",
    "need an sbar to call the reg",
    "can u sbar this for me before i ring the med reg",
    "78M NEWS 6, BP 82/50, sats 88% on 4L, drowsy, lactate 3.2 ---- sbar pls",
    "sbar for icu referral",
    "put this into sbar format",
    "write the handover in sbar",
    "hand-over to the reg, sbar pls",
    "sbar for the surgical reg, ?perf, rigid abdo",
    "ringing the on call consultant, need an sbar",
    "can u structure this as sbar",
    "sbar for anaesthetics re difficult airway pt",
    "write sbar for escalation - tachy 130, temp 39, ?sepsis, abx given, still hypotensive",
    "need to escalate this, write me an sbar",
    "sbar for outreach team pls",
    "post op day 2, low BP, tachy, ?bleed, hb 110 to 78 ---- sbar",
    "quick sbar so i can phone micro",
    "write this as an sbar for the on call gp",
    "sbar handover for the night team",
    "sbar for 999 call, ?stroke onset 40 mins ago, FAST +ve",
    "can u write a structured handover, sbar",
    "pt deteriorating - sbar to give the reg on the phone",
    "sbar for paeds reg, 8mo, poor feeding, cap refill 3s, temp 39",
    "structure this into situation background assessment recommendation",
    "write the sbar bit, ill add the obs myself",
    "sbar please, calling obs and gynae re PV bleed at 28/40",
    "need an sbar for the ambulance crew",
    "sbar for the cardiology reg - complete heart block, rate 32, symptomatic",
    "write a hand over for the ward transfer, sbar format",
    "sbar to hand over to SDEC",
    "sbar for psych liaison, pt expressing SI on the ward",
    "sbar for the crisis team pls",
    "65F known COPD, now retaining, ph 7.28 pco2 8.9, needs niv ---- take these notes and make an sbar",
    "sbar for the med reg, and make the recommendation bit clear i want them to come now",
    "Write an SBAR for the med reg",
    "write an SBAR for this deteriorating patient",
  ],

  patient_friendly: [
    "write a patient leaflet on insomnia",
    "PIL for back pain pls",
    "can u make this patient friendly",
    "patient handout for menopause",
    "write something i can print for the pt about anxiety",
    "pt info leaflet on statins pls",
    "make this into a handout",
    "42F new dx PCOS, metformin started, lifestyle advice given ---- can u write a leaflet for her",
    "write a lay explanation of AF and why she needs apixaban",
    "patient friendly version pls",
    "write a leaflet about croup for parents",
    "handout on how to use a blue inhaler",
    "pt info sheet re steroid injections, risks and benefits",
    "can u write this in simple language, pt has low health literacy",
    "leaflet on gout - what to avoid, when to seek help",
    "write pt friendly info about her new dx of type 2 diabetes",
    "write something i can give the parents about febrile convulsions",
    "make a printable guide for pelvic floor exercises",
    "write a handout for a pt starting sertraline, incl side effects",
    "explain the results to the pt in writing - low ferritin, needs iron",
    "pt info leaflet, plantar fasciitis, exercises included",
    "can you write a plain english version of this discharge advice",
    "write a leaflet on shingles for a 70yo",
    "write patient facing info about the colonoscopy shes having",
    "write a handout re weaning off omeprazole",
    "write a leaflet about eczema and emollients for a childs parents",
    "can u write this so a 12 year old could understand it - new asthma dx",
    "patient handout on sleep hygiene, keep it to one page",
    "write leaflet re HRT risks, shes worried about breast cancer",
    "55M new dx OA knee, wants to know what to do ---- can u do a patient version of this",
    "dumb this down for the pt pls",
    "explain this to the pt in plain english",
    "how would I word this for the patient",
    "can u make this patient friendly",
    "turn this into something the pt can understand",
    "Explain this blood result to my patient",
    "explain these bloods to the patient",
    "can you explain this to my patient",
    "explain this blood result for my patient in plain english",
  ],
};

/**
 * Realistic clinical questions that must stay as ordinary Q&A. Many are deliberate
 * near-misses that contain the tool's own keywords.
 */
const NEGATIVES: string[] = [
  // Referral criteria / pathway questions
  "when should I refer suspected bowel cancer?",
  "what are the 2WW criteria for dysphagia?",
  "does a FIT of 8 need a 2ww referral?",
  "what's the referral threshold for microscopic haematuria?",
  "how long is the 2ww pathway meant to take from receipt?",
  "can nurses make a 2ww referral or does it need a gp?",
  "what happens after a 2ww referral is made?",
  "does ENT accept direct referrals for globus?",
  "what are the NICE criteria for referring to memory clinic?",
  "do i need to do bloods before referring to rheumatology?",
  "my gastro referral was rejected, what now?",
  "how do i chase a referral on ers?",
  "ers is down, whats the workaround for urgent referrals?",
  "is a suspected sarcoma referral 2ww or routine?",

  // Safety netting as a concept
  "what should safety netting advice cover for a febrile child?",
  "what are the red flags i should safety net for in headache?",
  "why is safety netting important medicolegally?",
  "is verbal safety netting enough or does it have to be documented?",
  "what red flags should i tell a pt with back pain about?",
  "whats the evidence base for written vs verbal safety netting?",
  "how specific does safety netting need to be to stand up in court?",

  // SBAR / handover as a concept
  "what goes in an SBAR?",
  "what does the A stand for in sbar?",
  "whats an sbar again",
  "is SBAR better than RSVP for handover?",
  "who should i escalate to overnight for a NEWS of 7?",
  "do i need to do an sbar for every referral to outreach?",

  // Discharge summary as a concept
  "who writes the discharge summary?",
  "how long does the trust have to send the discharge summary to the gp?",
  "what should be in a discharge summary per PRSB?",
  "whats the difference between a TTO and a TTA?",
  "do i legally have to list allergies on the discharge summary?",
  "can a pharmacist sign off the TTOs?",
  "pt hasnt had their discharge summary 3 weeks on, what do i do?",

  // Digital triage as a concept
  "what are the clinical risks of online consultations?",
  "how do i turn off e-consult on systmone?",
  "can i prescribe abx off an accurx message alone without seeing the pt?",
  "whats the evidence for digital triage in primary care?",
  "is it safe to triage chest pain by econsult?",

  // Patient information as a concept
  "is there a NICE leaflet on statins?",
  "where can i find a PIL for methotrexate?",
  "what reading age should patient info be written at?",
  "do patient leaflets need to be approved by the trust?",
  "whats the best source of pt info for parents, nhs or patient.info?",

  // Drug, dose, diagnostic and guideline questions
  "amoxicillin dose for a 3 year old with otitis media",
  "max dose of amitriptyline for neuropathic pain",
  "can you take sertraline and tramadol together",
  "ckd 3b and metformin, do i reduce the dose",
  "how long do you treat a male uti for",
  "doac choice in ckd 4",
  "when do i check lithium levels after a dose change",
  "target inr for a mechanical mitral valve",
  "gout flare while on allopurinol, continue or stop",
  "first line abx for cellulitis if pen allergic",
  "interpret this abg for me - ph 7.31 pco2 6.9 hco3 28",
  "diagnostic criteria for T2DM using hba1c",
  "nice guidance on hypertension in under 40s",
  "how often should we do cvd risk in a diabetic",
  "raised ALP with normal ALT, what does that suggest",
  "differentials for isolated raised bilirubin",
  "incidental 6mm pulmonary nodule on ct, what now",
  "when do you start a statin in T1DM",
  "is trimethoprim safe in the first trimester",

  // Pasted note + trailing clinical question (must not fire on note shape alone)
  "68M cough 3/7 CRP 45 sats 94% o/e crackles L base ---- what abx should i give",
  "34F headache, papilloedema on fundoscopy, bp 148/92 ---- do i admit",
  "55M chest pain, trop 14 then 16, ecg NAD ---- is this an nstemi",
  "3yo temp 39, non-blanching rash, cap refill 2s ---- next steps",

  // "letter" / "note" / "summary" / "handout" in a non-drafting sense
  "pt brought a letter from the hospital saying she needs repeat u&e - how often?",
  "the clinic letter says ?vasculitis, what bloods do i need to do",
  "ive had a letter from the coroner about a pt, what do i do",
  "can you summarise the latest nice asthma guideline for me",
  "give me a summary of the evidence for sglt2i in heart failure",
  "summarise the differences between the new and old resus guidance",
  "what does PR NAD in this note mean",
  "whats the fit note rule for over 7 days",
  "can i backdate a fit note",
  "do i need a med3 for 5 days off sick",
  "theres a note in the record saying she declined the flu jab, do i need to re-offer",
  "pt wants a private letter for their insurance, can i charge for it",

  // Other near-misses
  "what does SBAR stand for",
  "how do i safety net a pt i genuinely cant contact",
  "should i tell the patient about the incidental finding before the clinic letter arrives",
  "whats the trust policy on discharging pts before ttos are ready",
  "is it ok to send a 2ww referral without telling the pt its cancer pathway",
  "do i need consent to send a pt's details to the specialist",
  "how many 2ww referrals convert to a cancer dx",
];

const describeFailures = (failures: string[]): string =>
  `\n${failures.length} failing:\n` + failures.map((f) => `  - ${f}`).join("\n");

describe("resolveAskIntent — tool requests", () => {
  for (const tool of Object.keys(POSITIVES) as ChatToolId[]) {
    it(`routes ${tool} phrasings`, () => {
      const failures = POSITIVES[tool]
        .map((message) => ({ message, got: resolveAskIntent(message) }))
        .filter(({ got }) => got !== tool)
        .map(({ message, got }) => `got "${got}" for: ${message}`);

      assert.equal(failures.length, 0, describeFailures(failures));
    });
  }
});

describe("resolveAskIntent — ordinary clinical questions", () => {
  it("never opens a document card for a question about a document", () => {
    const failures = NEGATIVES.map((message) => ({ message, got: resolveAskIntent(message) }))
      .filter(({ got }) => got !== "standard")
      .map(({ message, got }) => `got "${got}" for: ${message}`);

    assert.equal(failures.length, 0, describeFailures(failures));
  });
});

describe("resolveAskIntent — edge cases", () => {
  it("handles empty and whitespace input", () => {
    const empties: AskIntent[] = [resolveAskIntent(""), resolveAskIntent("   ")];
    assert.deepEqual(empties, ["standard", "standard"]);
  });

  it("finds the instruction after a long pasted note", () => {
    const note =
      "72F admitted 04/03 with SOB and productive cough. PMH COPD, HTN, T2DM. " +
      "O/E RR 26, sats 88% on air, widespread wheeze, temp 37.9. " +
      "CXR right basal consolidation. Bloods WCC 18.2, CRP 240, creat 118. " +
      "Treated with IV co-amoxiclav and clarithromycin, nebs, pred 30mg. " +
      "Day 3 improving, sats 94% on air, CRP down to 60, switched to oral. " +
      "Day 5 mobilising with frame, OT assessed, package of care restarted. ";

    assert.equal(resolveAskIntent(`${note} ---- discharge summary for the gp pls`), "discharge_summary");
    assert.equal(resolveAskIntent(`${note} ---- can u sbar this`), "sbar");
    assert.equal(resolveAskIntent(`${note} ---- what abx would you use`), "standard");
  });

  it("does not fire on a document mentioned in passing", () => {
    assert.equal(
      resolveAskIntent("the discharge summary says she was started on apixaban, do i continue it"),
      "standard"
    );
  });

  it("does not treat a clinical opinion as a referral request", () => {
    assert.equal(
      resolveAskIntent("I wouldn't refer this until the FIT is back"),
      "standard"
    );
  });

  it("opens Capture learning when the user asks to save the case", () => {
    for (const message of [
      "Save the learning from this case",
      "capture learning",
      "capture this",
      "capture",
      "save this learning",
      "add this to my cpd",
      "log this as cpd",
    ]) {
      assert.equal(resolveAskIntent(message), "capture_learning", message);
    }
  });

  it("does not treat a question about capture as a save request", () => {
    assert.equal(resolveAskIntent("how do I capture learning on Umbil?"), "standard");
  });

  it("asks the model only for leftover command-like wording", () => {
    assert.equal(shouldAskModelForIntent("amoxicillin dose for a 3 year old"), false);
    assert.equal(shouldAskModelForIntent("can you write something I can send to the chest clinic"), true);
  });
});
