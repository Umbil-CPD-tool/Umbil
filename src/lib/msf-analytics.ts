import { MSF_QUESTIONS, MsfDomain } from './msf-questions';

export interface MsfAnalyticsResult {
  stats: {
    totalResponses: number;
    averageScore: number;
    topArea: string;
    lowestArea: string;
    thresholdMet: boolean;
    responsesNeeded: number;
    targetThreshold: number;
  };
  breakdown: Array<{
    id: string;
    name: string;
    score: number | string;
    count: number;
  }>;
  roleTypes: Array<{
    name: string;
    value: number;
  }>;
  customFeedback: Array<{
    question: string;
    answers: string[];
  }>;
  textFeedback: Array<{
    strengths: string;
    example: string;
    improve: string;
    additional: string;
  }>;
}

const DOMAIN_MIN_THRESHOLD = 5; 

export function calculateMsfAnalytics(cycle: any, responses: any[]): MsfAnalyticsResult {
  const totalResponseCount = responses.length;
  const responseThreshold = cycle.required_responses || 15;
  const thresholdMet = totalResponseCount >= responseThreshold;
  const responsesNeeded = Math.max(0, responseThreshold - totalResponseCount);

  let totalScoreSum = 0;
  let totalScoreCount = 0;

  const rawTextFeedback: any[] = [];
  const domainScores: Record<string, { sum: number; count: number }> = {};
  const roleCounts: Record<string, number> = {};
  const customFeedbackMap: Record<string, string[]> = {};

  const uniqueDomains = Array.from(new Set(MSF_QUESTIONS.map(q => q.domain)));
  uniqueDomains.forEach(d => {
    domainScores[d] = { sum: 0, count: 0 };
  });

  if (cycle.custom_questions) {
    cycle.custom_questions.forEach((q: string) => {
      if (!customFeedbackMap[q]) customFeedbackMap[q] = [];
    });
  }

  responses.forEach(r => {
    const scores = r.scores || {};
    
    const strengths = r.strengths_text;
    const example = r.example_text;
    const improve = r.improvements_text;
    const additional = r.additional_comments;

    if (strengths || example || improve || additional) {
      rawTextFeedback.push({
        strengths: typeof strengths === 'string' && strengths.trim().length > 0 ? strengths : '',
        example: typeof example === 'string' && example.trim().length > 0 ? example : '',
        improve: typeof improve === 'string' && improve.trim().length > 0 ? improve : '',
        additional: typeof additional === 'string' && additional.trim().length > 0 ? additional : ''
      });
    }

    if (r.role_type) {
      roleCounts[r.role_type] = (roleCounts[r.role_type] || 0) + 1;
    }

    if (cycle.custom_questions) {
      cycle.custom_questions.forEach((q: string, idx: number) => {
        const ans = scores[`custom_${idx}`];
        if (ans && typeof ans === 'string' && ans.trim().length > 0) {
          customFeedbackMap[q].push(ans);
        }
      });
    }

    MSF_QUESTIONS.forEach(q => {
      const val = Number(scores[q.id]);
      if (val && val > 0) {
        domainScores[q.domain].sum += val;
        domainScores[q.domain].count += 1;
        totalScoreSum += val;
        totalScoreCount += 1;
      }
    });
  });

  const breakdown = Object.entries(domainScores)
    .map(([name, data]) => ({
      id: name,
      name: name,
      score: data.count > 0 
        ? parseFloat((data.sum / data.count).toFixed(2)) 
        : 'Insufficient Data',
      count: data.count
    }))
    .sort((a, b) => {
      if (typeof a.score === 'string') return 1;
      if (typeof b.score === 'string') return -1;
      return b.score - a.score;
    });

  const averageScore = totalScoreCount > 0 
    ? parseFloat((totalScoreSum / totalScoreCount).toFixed(2)) 
    : 0;

  const roleTypes = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));
  
  const customFeedback = Object.entries(customFeedbackMap)
    .map(([question, answers]) => ({ question, answers }))
    .filter(cf => cf.answers.length > 0);

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
    breakdown,
    roleTypes,
    customFeedback,
    textFeedback: safeTextFeedback
  };
}