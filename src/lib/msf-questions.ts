export type MsfDomain = 'Clinical Assessment' | 'Communication' | 'Teamwork' | 'Professionalism';

export interface MsfQuestion {
  id: string;
  domain: MsfDomain;
  text: string;
}

export const MSF_QUESTIONS: MsfQuestion[] = [
  // Clinical Assessment
  { id: 'clin_1', domain: 'Clinical Assessment', text: 'How would you rate this doctor\'s clinical knowledge and skills?' },
  { id: 'clin_2', domain: 'Clinical Assessment', text: 'How effectively does this doctor apply their clinical knowledge to patient care?' },
  
  // Communication
  { id: 'comm_1', domain: 'Communication', text: 'How effectively does this doctor communicate with colleagues?' },
  { id: 'comm_2', domain: 'Communication', text: 'How well does this doctor listen to and respect the views of others?' },
  
  // Teamwork
  { id: 'team_1', domain: 'Teamwork', text: 'How well does this doctor work collaboratively in a team?' },
  { id: 'team_2', domain: 'Teamwork', text: 'How supportive is this doctor of junior colleagues and staff?' },
  
  // Professionalism
  { id: 'prof_1', domain: 'Professionalism', text: 'How would you rate this doctor\'s reliability and punctuality?' },
  { id: 'prof_2', domain: 'Professionalism', text: 'How would you describe this doctor\'s overall professional behavior?' },
];

export const MSF_ROLES = [
  'Senior Doctor / Consultant',
  'Junior Doctor / Peer',
  'Nurse / Midwife',
  'Allied Health Professional (Physio, Pharmacist, etc.)',
  'Management / Administrative Staff',
  'Other'
];