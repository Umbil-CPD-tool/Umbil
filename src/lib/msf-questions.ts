export type MsfDomain = 
  | 'Domain 1: Knowledge, Skills and Performance' 
  | 'Domain 2: Safety and Quality' 
  | 'Domain 3: Communication, Partnership and Teamwork' 
  | 'Domain 4: Maintaining Trust';

export interface MsfQuestion {
  id: string;
  domain: MsfDomain;
  text: string;
}

export const MSF_QUESTIONS: MsfQuestion[] = [
  { id: 'q1', domain: 'Domain 3: Communication, Partnership and Teamwork', text: 'Communicates effectively and respectfully with colleagues' },
  { id: 'q2', domain: 'Domain 3: Communication, Partnership and Teamwork', text: 'Works well as part of a multidisciplinary team' },
  { id: 'q3', domain: 'Domain 4: Maintaining Trust', text: 'Treats colleagues with dignity, fairness and respect' },
  { id: 'q4', domain: 'Domain 4: Maintaining Trust', text: 'Demonstrates professionalism and integrity' },
  { id: 'q5', domain: 'Domain 1: Knowledge, Skills and Performance', text: 'Is reliable and dependable' },
  { id: 'q6', domain: 'Domain 2: Safety and Quality', text: 'Contributes positively to patient safety and quality of care' },
  { id: 'q7', domain: 'Domain 1: Knowledge, Skills and Performance', text: 'Recognises limitations and seeks advice when appropriate' },
  { id: 'q8', domain: 'Domain 3: Communication, Partnership and Teamwork', text: 'Supports and develops colleagues and learners' },
  { id: 'q9', domain: 'Domain 3: Communication, Partnership and Teamwork', text: 'Demonstrates leadership when required' },
  { id: 'q10', domain: 'Domain 2: Safety and Quality', text: 'Overall, I would be happy for a friend or family member to be cared for by this doctor' }
];

export const MSF_ROLES = [
  'Senior Doctor / Consultant',
  'Junior Doctor / Peer',
  'Nurse / Midwife',
  'Allied Health Professional (Physio, Pharmacist, etc.)',
  'Management / Administrative Staff',
  'Other'
];