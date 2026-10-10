// Infection, paediatrics, and ENT / dermatology presentations.
import type { TriageScaffold } from "./types";

export const TEMPLATES: Record<string, TriageScaffold> = {
  FEVER_ADULT: {
    label: "Fever (adult)",
    category: "Infection",
    aliases: ["fever", "high temperature", "pyrexia", "feeling feverish"],
    assessmentQuestions: [
      "How long have you had the high temperature, and what is the highest you have measured?",
      "Any cough, sore throat, burning when you pee, diarrhoea, or rash?",
      "Are you able to drink and pee as usual?",
      "Any recent travel, hospital stay, or known infection risk?",
      "Any long-term illnesses, or treatment that weakens your immune system?",
    ],
    redFlagQuestions: [
      "Any confusion, unusual sleepiness, or a bad headache with a stiff neck?",
      "Any trouble breathing?",
      "Any rash that does not fade when you press a clear glass on it?",
      "Keep being sick, or feeling so unwell you cannot manage at home?",
    ],
    safetyTriggers: [
      "confusion or unusual sleepiness",
      "trouble breathing",
      "a bad headache with a stiff neck",
      "a rash that does not fade under a glass",
      "feeling very unwell",
    ],
    guidanceRef: "NICE NG51 Sepsis; NICE CKS Feverish illness",
  },

  FEVER_CHILD: {
    label: "Fever (child)",
    category: "Paediatrics",
    aliases: ["child fever", "fever child", "baby fever", "toddler fever", "paediatric fever"],
    assessmentQuestions: [
      "How old is the child, and how long have they had a high temperature?",
      "Are they drinking, peeing, and playing or interacting as usual?",
      "Any cough, cold symptoms, ear pain, being sick, or diarrhoea?",
      "Have they had any recent vaccinations, or been around anyone who is unwell?",
      "What temperature have you measured, and how did you take it?",
    ],
    redFlagQuestions: [
      "Are they unusually sleepy or hard to wake?",
      "Any trouble breathing or grunting?",
      "Any rash that does not fade when you press a clear glass on it?",
      "Are they not drinking or not peeing?",
      "Has the high temperature lasted more than 5 days, or are you worried they are seriously unwell?",
    ],
    safetyTriggers: [
      "unusually sleepy or hard to wake",
      "trouble breathing",
      "a rash that does not fade under a glass",
      "not drinking or not peeing",
      "you are worried they are seriously unwell",
    ],
    guidanceRef: "NICE NG143 Fever in under 5s; NICE NG51 Sepsis",
  },

  CHILD_ILLNESS: {
    label: "Child illness",
    category: "Paediatrics",
    aliases: [
      "unwell child",
      "sick child",
      "my child",
      "my baby",
      "my toddler",
      "paediatric",
      "poor feeding",
      "not feeding",
    ],
    assessmentQuestions: [
      "How old is the child, and what is the main worry?",
      "How long have they been unwell?",
      "Are they drinking, feeding, and peeing as usual?",
      "Any high temperature, cough, rash, being sick, or diarrhoea?",
      "Are they more sleepy, more irritable, or less playful than usual?",
    ],
    redFlagQuestions: [
      "Are they unusually sleepy or hard to wake?",
      "Any trouble breathing, pauses in breathing, or looking blue?",
      "Any rash that does not fade when you press a clear glass on it?",
      "Any ongoing being sick, blood in their poo, or severe pain?",
      "Are you unable to get them to take drinks?",
    ],
    safetyTriggers: [
      "unusually sleepy or hard to wake",
      "trouble breathing or looking blue",
      "a rash that does not fade under a glass",
      "unable to take drinks",
      "you are worried they are seriously unwell",
    ],
    guidanceRef: "NICE NG143 Fever in under 5s; NHS.uk When to worry about a child's fever",
  },

  EAR_PAIN: {
    label: "Ear pain",
    category: "ENT",
    aliases: ["ear pain", "earache", "ear ache", "otalgia", "otitis", "ear infection"],
    assessmentQuestions: [
      "Which ear hurts, and how long has the pain been there?",
      "Any change in hearing, fluid from the ear, or a blocked feeling?",
      "Any recent cold, swimming, or knock to the ear?",
      "Any high temperature or feeling generally unwell?",
      "Have you had ear problems like this before?",
    ],
    redFlagQuestions: [
      "Any bad swelling behind or around the ear, or the ear sticking out?",
      "Any drooping of the face, bad headache, or stiff neck?",
      "Any dizziness with being sick, or sudden complete loss of hearing?",
      "Any blood or smelly fluid coming from the ear?",
    ],
    safetyTriggers: [
      "swelling behind the ear or the ear sticking out",
      "drooping of the face",
      "a bad headache or stiff neck",
      "sudden loss of hearing",
    ],
    guidanceRef: "NICE CKS Otitis media - acute; NICE CKS Otitis externa",
  },

  UTI_ADULT: {
    label: "UTI",
    category: "Urology",
    aliases: [
      "uti",
      "cystitis",
      "urine infection",
      "urinary infection",
      "burning urine",
      "dysuria",
      "waterworks",
    ],
    assessmentQuestions: [
      "What urine symptoms do you have (burning, needing to pee often, sudden urgency, or smell)?",
      "How long have they been there, and are they getting worse?",
      "Are you pregnant, or have you had recent urine infections or a catheter?",
      "Have you tried any treatment already?",
    ],
    redFlagQuestions: [
      "Any high temperature, shaking chills, or being sick?",
      "Any pain in your back or side (just below the ribs)?",
      "Any blood in the urine that is not settling?",
      "Are you unable to keep drinks down?",
    ],
    safetyTriggers: [
      "high temperature, shaking chills or feeling very unwell",
      "pain in your back or side",
      "keep being sick",
      "symptoms getting worse after 48 hours of treatment",
    ],
    guidanceRef: "NICE CKS Urinary tract infection (lower) - women / men; NICE NG109",
  },

  RASH: {
    label: "Rash",
    category: "Dermatology",
    aliases: ["rash", "spots", "hives", "urticaria", "skin eruption"],
    assessmentQuestions: [
      "Where is the rash, when did it start, and is it spreading?",
      "Does it itch, blister, or feel painful?",
      "Any new medicine, foods, or contact with someone who was unwell?",
      "Have you had a rash like this before?",
    ],
    redFlagQuestions: [
      "Does the rash fade when you press a clear glass on it?",
      "Any high temperature and feeling very unwell?",
      "Any swelling of the face, or trouble breathing?",
      "Is the rash spreading quickly?",
    ],
    safetyTriggers: [
      "a rash that does not fade under a glass",
      "high temperature and feeling very unwell",
      "swelling of the face or trouble breathing",
      "a rash spreading quickly",
    ],
    guidanceRef: "NICE NG51 Sepsis; NICE CKS Meningitis - bacterial meningitis and meningococcal disease",
  },

  SORE_THROAT: {
    label: "Sore throat",
    category: "ENT",
    aliases: ["sore throat", "throat pain", "tonsillitis", "pharyngitis"],
    assessmentQuestions: [
      "How long have you had the sore throat, and is it getting worse?",
      "Any high temperature, swollen glands in the neck, or white spots on the tonsils?",
      "Are you able to drink?",
      "Any recent contact with strep throat or scarlet fever?",
    ],
    redFlagQuestions: [
      "Are you unable to swallow your own spit?",
      "Any trouble breathing, drooling, or a change in your voice (for example muffled)?",
      "Any severe neck swelling or stiffness?",
      "Has a high temperature lasted more than 5 days?",
    ],
    safetyTriggers: [
      "unable to swallow your own spit",
      "trouble breathing",
      "severe neck swelling or stiffness",
      "feeling very unwell",
    ],
    guidanceRef: "NICE CKS Sore throat - acute; NICE NG84",
  },
};
