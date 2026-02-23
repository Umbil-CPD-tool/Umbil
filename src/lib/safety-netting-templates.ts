// src/lib/safety-netting-templates.ts

export const SAFETY_NETTING_TEMPLATES: Record<string, string> = {
  HEADACHE: `
Safety Netting:

Seek urgent medical review if:
• Sudden severe headache or worst ever onset
• Headache waking from sleep or worse on waking
• Headache worse on coughing, bending or straining
• Persistent vomiting
• New weakness, visual disturbance, confusion or collapse
• Fever with neck stiffness
• Progressive worsening pattern

Guidance referenced: NICE CKS Headache
`,

  CHEST_PAIN: `
Safety Netting:

Seek urgent medical review if:
• Persistent or worsening chest pain
• Pain spreading to arm, jaw, neck or back
• Associated breathlessness, sweating or collapse
• Coughing up blood
• Increasing severity or frequency

Guidance referenced: NICE CKS Chest Pain
`,

  ABDOMINAL_PAIN: `
Safety Netting:

Seek urgent medical review if:
• Severe worsening pain
• Persistent vomiting
• Fever or rigors
• Black stools or rectal bleeding
• Pain waking from sleep
• Unintentional weight loss

Guidance referenced: NICE CKS Abdominal Pain
`,

  SHORTNESS_OF_BREATH: `
Safety Netting:

Seek urgent medical review if:
• Breathlessness at rest
• Rapidly worsening breathlessness
• Chest pain
• Haemoptysis
• Collapse or confusion

Guidance referenced: NICE CKS Breathlessness
`,

  COUGH: `
Safety Netting:

Seek urgent medical review if:
• Persisting beyond 3 weeks
• Coughing up blood
• Increasing breathlessness
• Chest pain
• Unintentional weight loss
• Night sweats

Guidance referenced: NICE NG12
`,

  BACK_PAIN: `
Safety Netting:

Seek urgent medical review if:
• Difficulty passing urine or incontinence
• Saddle numbness
• Progressive leg weakness
• Unexplained weight loss
• Fever
• Pain persisting beyond 6 weeks

Guidance referenced: NICE CKS Low Back Pain
`,

  FEVER_ADULT: `
Safety Netting:

Seek urgent medical review if:
• Fever persisting beyond 5 days
• Confusion or drowsiness
• Breathing difficulty
• Severe headache with neck stiffness
• Persistent vomiting

Guidance referenced: NICE Sepsis
`,

  FEVER_CHILD: `
Safety Netting:

Seek urgent medical review if:
• Drowsy or difficult to wake
• Breathing difficulty
• Non blanching rash
• Not drinking or passing urine
• Persistent high fever beyond 5 days

Guidance referenced: NICE Sepsis
`,

  LYMPHADENOPATHY: `
Safety Netting:

Seek urgent medical review if:
• Persisting beyond 3 weeks
• Increasing in size
• Becoming hard, fixed or supraclavicular
• Unexplained weight loss
• Night sweats
• Persistent unexplained fever

Guidance referenced: NICE NG12
`,

  RECTAL_BLEEDING: `
Safety Netting:

Seek urgent medical review if:
• Persistent bleeding
• Black stools
• Change in bowel habit persisting beyond 3 weeks
• Unintentional weight loss
• Persistent abdominal pain

Guidance referenced: NICE NG12
`,

  CHANGE_IN_BOWEL_HABIT: `
Safety Netting:

Seek urgent medical review if:
• Change persisting beyond 3 weeks
• Blood in stool
• Unintentional weight loss
• Persistent abdominal pain
• New unexplained anaemia

Guidance referenced: NICE NG12
`,

  DYSPHAGIA: `
Safety Netting:

Seek urgent medical review if:
• Progressive difficulty swallowing
• Food sticking
• Unintentional weight loss
• Vomiting blood
• Persistent vomiting

Guidance referenced: NICE NG12
`,

  UNINTENTIONAL_WEIGHT_LOSS: `
Safety Netting:

Seek urgent medical review if:
• Ongoing unexplained weight loss
• Persistent fatigue
• Persistent cough beyond 3 weeks
• Persistent abdominal pain
• Persistent lymph node enlargement

Guidance referenced: NICE NG12
`,

  HAEMATURIA: `
Safety Netting:

Seek urgent medical review if:
• Visible blood in urine persisting
• Associated weight loss
• Persistent abdominal or flank pain
• Recurrent unexplained infections

Guidance referenced: NICE NG12
`,

  BREAST_LUMP: `
Safety Netting:

Seek urgent medical review if:
• Increasing size
• Skin dimpling or distortion
• Nipple inversion or discharge
• Persistent lump beyond 2 weeks

Guidance referenced: NICE NG12
`,

  POSTMENOPAUSAL_BLEEDING: `
Safety Netting:

Seek urgent medical review if:
• Persistent or recurrent bleeding
• Associated pelvic pain
• Unintentional weight loss
• New abdominal swelling

Guidance referenced: NICE NG12
`,

  TESTICULAR_LUMP: `
Safety Netting:

Seek urgent medical review if:
• Increasing size
• Persistent swelling
• New heaviness or pain
• Unintentional weight loss

Guidance referenced: NICE NG12
`,

  HEAD_INJURY: `
Safety Netting:

Seek urgent medical review if:
• Persistent vomiting
• Increasing drowsiness
• Severe worsening headache
• Confusion or seizure
• Weakness or visual disturbance

Guidance referenced: NICE Head Injury
`,

  FATIGUE: `
Safety Netting:

Seek urgent medical review if:
• Persistent unexplained fatigue
• Unintentional weight loss
• Persistent fever
• Persistent lymph node enlargement
• Breathlessness

Guidance referenced: NICE NG12
`,

  PERSISTENT_PAIN: `
Safety Netting:

Seek urgent medical review if:
• Pain persisting beyond expected recovery period
• Unintentional weight loss
• Persistent night pain
• Neurological symptoms
• Persistent swelling or mass

Guidance referenced: NICE NG12
`,

  UTI_ADULT: `
Safety Netting:

Seek urgent medical review if:
• Fever, rigors or feeling significantly unwell
• New flank or back pain
• Persistent vomiting or unable to keep fluids down
• Blood in urine persisting or worsening
• Symptoms not improving or worsening after 48 hours

Guidance referenced: NICE CKS UTI
`,

  DVT_LEG_SWELLING: `
Safety Netting:

Seek urgent medical review if:
• New or worsening breathlessness
• Chest pain
• Coughing up blood
• Rapidly increasing leg swelling
• Severe calf pain with redness or warmth

Guidance referenced: NICE CKS DVT
`,

  PALPITATIONS: `
Safety Netting:

Seek urgent medical review if:
• Collapse or fainting
• Chest pain
• Breathlessness
• Persistent rapid or irregular heartbeat
• New dizziness or confusion

Guidance referenced: NICE CKS Palpitations
`,

  DIZZINESS_VERTIGO: `
Safety Netting:

Seek urgent medical review if:
• New weakness, numbness or difficulty speaking
• Severe worsening headache
• Collapse or fainting
• Persistent vomiting
• New visual disturbance

Guidance referenced: NICE CKS Vertigo
`,

  RASH: `
Safety Netting:

Seek urgent medical review if:
• Rash that does not fade when pressed
• Associated fever and feeling very unwell
• Rapidly spreading rash
• New facial swelling or breathing difficulty
• Persistent fever

Guidance referenced: NICE Sepsis
`,

  SORE_THROAT: `
Safety Netting:

Seek urgent medical review if:
• Difficulty swallowing saliva
• Breathing difficulty
• Severe worsening pain
• Persistent fever beyond 5 days
• Neck swelling or stiffness

Guidance referenced: NICE CKS Sore Throat
`,

  DEPRESSION_CRISIS: `
Safety Netting:

Seek urgent medical review if:
• Thoughts of self harm or suicide
• Feeling unable to keep yourself safe
• Rapid worsening mood or distress
• New confusion or withdrawal
• Loss of ability to function normally

Guidance referenced: NICE Depression
`,

  GASTROENTERITIS_VOMITING: `
Safety Netting:

Seek urgent medical review if:
• Unable to keep fluids down
• Passing little or no urine
• Blood in vomit or stool
• Severe abdominal pain
• Persistent vomiting beyond 48 hours

Guidance referenced: NICE CKS Gastroenteritis
`,

  DIARRHOEA_ADULT: `
Safety Netting:

Seek urgent medical review if:
• Blood in stool
• Persistent diarrhoea beyond 7 days
• Severe abdominal pain
• Signs of dehydration
• Unintentional weight loss

Guidance referenced: NICE CKS Diarrhoea
`,

  NEW_NEUROLOGICAL: `
Safety Netting:

Seek urgent medical review if:
• New weakness in face, arm or leg
• Difficulty speaking or understanding speech
• New confusion
• Loss of vision
• Collapse or seizure

Guidance referenced: NICE Stroke
`
};