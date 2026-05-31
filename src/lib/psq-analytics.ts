import { PSQ_QUESTIONS } from './psq-questions';

export interface SurveyData {
  id: string;
  title: string;
  created_at: string;
  required_responses?: number;
  custom_questions?: string[];
  executive_summary?: string;
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
    targetThreshold: number;
  };
  trendData: Array<{
    name: string;
    date: string;
    score: number;
  }>;
  breakdown: Array<{
    id: string;
    name: string;
    score: number | string;
    count: number;
  }>;
  appointmentTypes: Array<{
    name: string;
    value: number;
  }>;
  customFeedback: Array<{
    question: string;
    answers: string[];
  }>;
  textFeedback: Array<{
    good: string;
    improve: string;
  }>;
}

const DOMAIN_MIN_THRESHOLD = 10;

export function calculateAnalytics(surveys: SurveyData[]): AnalyticsResult {
  let totalScoreSum = 0;
  let totalResponseCount = 0;
  
  const rawTextFeedback: any[] = [];
  const domainScores: Record<string, { sum: number; count: number }> = {};
  const appointmentCounts: Record<string, number> = {};
  const customFeedbackMap: Record<string, string[]> = {};
  
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

    // Initialize custom question arrays for this survey
    if (survey.custom_questions) {
      survey.custom_questions.forEach(q => {
        if (!customFeedbackMap[q]) customFeedbackMap[q] = [];
      });
    }

    responses.forEach(r => {
      const answers = r.answers || {};
      
      // 1. Collect Free Text (No dates to preserve anonymity)
      const good = answers['11'];
      const improve = answers['12'];
      if (good || improve) {
         rawTextFeedback.push({
            good: typeof good === 'string' && good.trim().length > 0 ? good : '',
            improve: typeof improve === 'string' && improve.trim().length > 0 ? improve : ''
         });
      }

      // 2. Collect Appointment Types (Fixed: Now correctly looks for ID "13")
      if (answers['13']) {
          const type = answers['13'];
          appointmentCounts[type] = (appointmentCounts[type] || 0) + 1;
      }

      // 3. Collect Custom Question Answers (Mapped as custom_0, custom_1)
      if (survey.custom_questions) {
          survey.custom_questions.forEach((q, idx) => {
              const ans = answers[`custom_${idx}`];
              if (ans && typeof ans === 'string' && ans.trim().length > 0) {
                  customFeedbackMap[q].push(ans);
              }
          });
      }

      // 4. Calculate GMC Likert Scores
      let responseTotal = 0;
      let responseQCount = 0;

      PSQ_QUESTIONS.filter(q => q.type === 'likert').forEach(q => {
        const val = answers[q.id];
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
        if (typeof a.score === 'string') return 1;
        if (typeof b.score === 'string') return -1;
        return b.score - a.score;
    });

  const averageScore = totalResponseCount > 0 
    ? parseFloat((totalScoreSum / totalResponseCount).toFixed(2)) 
    : 0;

  // DYNAMIC THRESHOLD LOGIC
  const responseThreshold = surveys.length > 0 && surveys[0].required_responses ? surveys[0].required_responses : 34;

  const thresholdMet = totalResponseCount >= responseThreshold;
  const responsesNeeded = Math.max(0, responseThreshold - totalResponseCount);

  // Format Appointment & Custom Data
  const appointmentTypes = Object.entries(appointmentCounts).map(([name, value]) => ({ name, value }));
  const customFeedback = Object.entries(customFeedbackMap)
    .map(([question, answers]) => ({ question, answers }))
    .filter(cf => cf.answers.length > 0);

  // Filter Text Feedback based on threshold (Randomize order slightly to obscure identity)
  const safeTextFeedback = thresholdMet 
    ? rawTextFeedback.sort(() => Math.random() - 0.5)
    : [];

  return {
    stats: {
      totalResponses: totalResponseCount,
      averageScore,
      topArea: breakdown.length > 0 && typeof breakdown[0].score === 'number' ? breakdown[0].name : 'Pending Data',
      lowestArea: breakdown.length > 0 && typeof breakdown[breakdown.length - 1].score === 'number' ? breakdown[breakdown.length - 1].name : 'Pending Data',
      thresholdMet,
      responsesNeeded,
      targetThreshold: responseThreshold
    },
    trendData: trendData,
    breakdown: breakdown,
    appointmentTypes,
    customFeedback,
    textFeedback: safeTextFeedback
  };
}