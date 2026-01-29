import { PSQ_QUESTIONS } from './psq-questions';

export interface SurveyData {
  id: string;
  title: string;
  created_at: string;
  psq_responses: Array<{
    answers: Record<string, any>;
    created_at: string;
  }>;
}

export interface AnalyticsResult {
  stats: {
    totalResponses: number;
    averageScore: number;
    topArea: string;
    lowestArea: string;
    thresholdMet: boolean;
    responsesNeeded: number;
  };
  trendData: Array<{
    name: string;
    date: string;
    score: number;
  }>;
  breakdown: Array<{
    id: string;
    name: string;
    score: number | string; // number or 'Insufficient Data'
    count: number;
  }>;
  textFeedback: Array<{
    date: string;
    good: string;
    improve: string;
  }>;
}

const RESPONSE_THRESHOLD = 34;
const DOMAIN_MIN_THRESHOLD = 10; // Safety for specific domain scores

export function calculateAnalytics(surveys: SurveyData[]): AnalyticsResult {
  let totalScoreSum = 0;
  let totalResponseCount = 0;
  
  const rawTextFeedback: any[] = [];
  const domainScores: Record<string, { sum: number; count: number }> = {};
  
  // Initialize Domains from Questions
  const uniqueDomains = Array.from(new Set(
    PSQ_QUESTIONS
      .filter(q => q.type === 'likert')
      .map(q => q.domain)
  ));
  uniqueDomains.forEach(d => {
    domainScores[d] = { sum: 0, count: 0 };
  });

  // Process Each Survey
  const trendData = surveys.map(survey => {
    const responses = survey.psq_responses || [];
    if (responses.length === 0) return null;

    let surveySum = 0;
    let surveyCount = 0;

    responses.forEach(r => {
      const answers = r.answers || {};
      
      // Collect Free Text (only if available)
      const good = answers['11'];
      const improve = answers['12'];
      if (good || improve) {
         rawTextFeedback.push({
            date: new Date(r.created_at).toLocaleDateString(),
            good: typeof good === 'string' ? good : '',
            improve: typeof improve === 'string' ? improve : ''
         });
      }

      // Calculate Scores (Only Likert)
      let responseTotal = 0;
      let responseQCount = 0;

      PSQ_QUESTIONS.filter(q => q.type === 'likert').forEach(q => {
        const val = answers[q.id];
        // Scale: 5 (Strongly Agree) -> 1 (Strongly Disagree). 0 = N/A.
        if (typeof val === 'number' && val > 0) {
            responseTotal += val;
            responseQCount++;
            if (domainScores[q.domain]) {
                domainScores[q.domain].sum += val;
                domainScores[q.domain].count += 1;
            }
        }
      });

      if (responseQCount > 0) {
        const avg = responseTotal / responseQCount;
        surveySum += avg;
        surveyCount++;
      }
    });

    if (surveyCount === 0) return null;

    const surveyAvg = parseFloat((surveySum / surveyCount).toFixed(2));
    totalScoreSum += surveySum;
    totalResponseCount += surveyCount;

    return {
      name: survey.title.replace('PSQ Cycle ', '') || 'Untitled',
      date: new Date(survey.created_at).toLocaleDateString(),
      score: surveyAvg
    };
  }).filter(Boolean) as any[];

  // Breakdown Calculation with Safety Checks
  const breakdown = Object.entries(domainScores)
    .map(([name, data]) => ({
      id: name,
      name: name,
      score: data.count >= DOMAIN_MIN_THRESHOLD 
        ? parseFloat((data.sum / data.count).toFixed(2)) 
        : 'Insufficient Data',
      count: data.count
    }))
    .sort((a, b) => {
        // Sort by score descending (handling string 'Insufficient Data')
        if (typeof a.score === 'string') return 1;
        if (typeof b.score === 'string') return -1;
        return b.score - a.score;
    });

  const averageScore = totalResponseCount > 0 
    ? parseFloat((totalScoreSum / totalResponseCount).toFixed(2)) 
    : 0;

  // Threshold Logic
  const thresholdMet = totalResponseCount >= RESPONSE_THRESHOLD;
  const responsesNeeded = Math.max(0, RESPONSE_THRESHOLD - totalResponseCount);

  // Filter Text Feedback based on threshold
  // Guardrail: No free text until threshold met
  const safeTextFeedback = thresholdMet 
    ? rawTextFeedback.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return {
    stats: {
      totalResponses: totalResponseCount,
      averageScore,
      topArea: breakdown.length > 0 && typeof breakdown[0].score === 'number' ? breakdown[0].name : 'Pending Data',
      lowestArea: breakdown.length > 0 && typeof breakdown[breakdown.length - 1].score === 'number' ? breakdown[breakdown.length - 1].name : 'Pending Data',
      thresholdMet,
      responsesNeeded
    },
    trendData: trendData,
    breakdown: breakdown,
    textFeedback: safeTextFeedback
  };
}