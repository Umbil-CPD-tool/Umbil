/**
 * Few-shot examples for clinical writing tools.
 * Kept separate from system prompts so each file stays readable for AI review.
 */

export const REFERRAL_FEW_SHOT_EXAMPLES = [
  {
    input:
      "31 year old with recurrent RUQ pain radiating to back worse after meals ultrasound normal previous abnormal LFTs symptoms ongoing",
    quick: `Re: Routine Referral - Persistent RUQ Pain
Patient: 31M/F

Dear General Surgery Team,

I would appreciate your assessment of this patient with persistent right upper quadrant pain suggestive of biliary pathology, despite normal ultrasound imaging.

Symptoms are typically postprandial, with radiation to the back, and have persisted for several months. 

Liver function tests were previously abnormal, although imaging has not identified a clear cause.

No significant past medical history provided.

Given the ongoing symptoms without explanation, I would value your opinion regarding further investigation, including whether MRCP would be appropriate.`,
    detailed: `Re: Routine Referral - Persistent RUQ Pain
Patient: 31M/F

Dear General Surgery Team,

I would appreciate your assessment of this patient with persistent right upper quadrant pain suggestive of biliary pathology, despite normal ultrasound imaging.

Symptoms are typically postprandial, with radiation to the back, and have persisted for several months. 

Liver function tests were previously abnormal, although imaging has not identified a clear cause.

No significant past medical history provided.

Given the ongoing symptoms without explanation, I would value your opinion regarding further investigation, including whether MRCP would be appropriate.`,
  },
  {
    input:
      "Progressive breathlessness over 6 months now affecting flat walking initial investigations normal",
    quick: `Re: Routine Referral - Progressive Exertional Breathlessness
Patient: Adult

Dear Respiratory Team,

I would appreciate your assessment of this patient with progressive exertional breathlessness over the past six months, now affecting normal walking.

Initial investigations including blood tests and chest X-ray have been normal, and there is no clear explanation for the progression of symptoms.

No significant past medical history provided.

I would value your opinion regarding further investigation.`,
    detailed: `Re: Routine Referral - Progressive Exertional Breathlessness
Patient: Adult

Dear Respiratory Team,

I would appreciate your assessment of this patient with progressive exertional breathlessness over the past six months, now affecting normal walking.

Initial investigations including blood tests and chest X-ray have been normal, and there is no clear explanation for the progression of symptoms.

No significant past medical history provided.

I would value your opinion regarding further investigation.`,
  },
];

export const DISCHARGE_FEW_SHOT_EXAMPLES = [
  {
    input:
      "78F admitted 12/04 with CAP. Treated with IV amox then switched to oral doxy. BP was low initially but responded to fluids. Discharged today. Stop amlodipine as BP on lower side. GP to recheck U&Es in 2 weeks.",
    output: `Dear Colleague,

Please find the discharge summary for your patient below.

## **Diagnoses**
- Primary: Community Acquired Pneumonia (CAP)

## **Clinical Narrative**
The patient was admitted on 12/04 with Community Acquired Pneumonia. She initially presented with hypotension which responded well to intravenous fluids. She was treated initially with IV Amoxicillin and subsequently stepped down to oral Doxycycline. She has made a good clinical recovery and is medically fit for discharge today.

## **Medications on Discharge**
- **STOPPED:** Amlodipine (Stopped due to low blood pressure during admission).
- **STARTED:** Doxycycline (Oral, complete course as per discharge prescription).

## **Actions for GP / Follow-up**
- Please recheck U&Es in 2 weeks.
- Routine review of blood pressure following the cessation of Amlodipine.

Kind regards,
[Name]
[Role]`,
  },
  {
    input:
      "82M. Urosepsis. E coli in bloods. IV Ceftriaxone 5 days. Catheter removed, passing urine ok. Discharge. Needs repeat U&Es next week.",
    output: `Dear Colleague,

Please find the discharge summary for your patient below.

## **Diagnoses**
- Primary: Urosepsis (E. coli bacteremia)

## **Clinical Narrative**
The patient was admitted with urosepsis, with blood cultures positive for E. coli. He was treated with a 5-day course of IV Ceftriaxone with good clinical response. His urinary catheter was successfully removed prior to discharge, and he is currently passing urine without difficulty. 

## **Medications on Discharge**
- No specific medication changes during this admission. (Please refer to the electronic discharge prescription for the full list of current medications).

## **Actions for GP / Follow-up**
- Please arrange for repeat U&Es next week.

Kind regards,
[Name]
[Role]`,
  },
];

export const PATIENT_HANDOUT_FEW_SHOT = [
  {
    input: "Insomnia management",
    output: `## **Understanding your condition**
Insomnia means difficulty falling asleep, staying asleep, or waking too early. This is common and often improves with simple routine changes.

## **Things that can help**
- **Go to bed and wake up at the same time** each day to train your body clock.
- **Avoid caffeine, alcohol, and screens** late in the evening.
- **Keep the bedroom dark, quiet, and cool**.
- **Use the bed only for sleep** (and sex), not for working or watching TV.

## **Extra support**
You can self-refer to the NHS digital sleep programme **Sleepio**, which provides structured online cognitive behavioural therapy for insomnia.

## **When to get help**
Call 111 or your GP if:
- Your sleep problems are affecting your daily life significantly.
- You have had trouble sleeping for months despite trying these changes.`,
  },
];

export const DIGITAL_TRIAGE_FEW_SHOT = [
  {
    input: "I've had a headache for a few days and it's not going away",
    output: `Thanks for your message.

To help us assess this, could you let us know:

* Where is the pain, and what does it feel like?
* Did it come on very suddenly and become as bad as it gets within a few minutes?
* Any high temperature, stiff neck, or recent bang to the head?
* Any new weakness, numbness, trouble speaking, or changes in your vision?
* Have you had headaches like this before?

If you develop a sudden severe headache, high temperature with a stiff neck, confusion, weakness, problems with speech or vision, or your symptoms become significantly worse, please seek urgent medical attention or contact NHS 111/999 while awaiting our reply.

Once you reply, we can advise on next steps.`,
  },
  {
    input: "I've had chest pain and dizziness since yesterday",
    output: `Thanks for your message.

To help us assess this, could you let us know:

* Where exactly is the pain, and what does it feel like?
* Does the pain spread to your arm, jaw, neck, or back?
* Any shortness of breath, sweating, feeling sick, or feeling faint?
* Does the room spin, or do you feel lightheaded / about to faint?
* Any new weakness, numbness, or trouble speaking?

If you develop severe or worsening chest pain, pain spreading to your arm or jaw, shortness of breath, sweating, collapse, or your symptoms become significantly worse, please seek urgent medical attention or contact NHS 111/999 while awaiting our reply.

Once you reply, we can advise on next steps.`,
  },
];
