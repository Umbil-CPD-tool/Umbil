// Client-portable PSQ analytics — mirrors web `src/lib/psq-analytics.ts` exactly so the mobile
// results screen produces identical GMC domain averages/stats from the same raw `psq_responses` rows.
import { PSQ_QUESTIONS } from "./psqQuestions";

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

  const uniqueDomains = Array.from(
    new Set(PSQ_QUESTIONS.filter((q) => q.type === "likert").map((q) => q.domain))
  );
  uniqueDomains.forEach((d) => {
    domainScores[d] = { sum: 0, count: 0 };
  });

  const trendData = surveys
    .map((survey) => {
      const responses = survey.psq_responses || [];
      if (responses.length === 0) return null;

      let surveySum = 0;
      let surveyCount = 0;

      if (survey.custom_questions) {
        survey.custom_questions.forEach((q) => {
          if (!customFeedbackMap[q]) customFeedbackMap[q] = [];
        });
      }

      responses.forEach((r) => {
        const answers = r.answers || {};

        const good = answers["12"];
        const improve = answers["13"];
        if (good || improve) {
          rawTextFeedback.push({
            good: typeof good === "string" && good.trim().length > 0 ? good : "",
            improve: typeof improve === "string" && improve.trim().length > 0 ? improve : "",
          });
        }

        if (answers["14"]) {
          const type = answers["14"];
          appointmentCounts[type] = (appointmentCounts[type] || 0) + 1;
        }

        if (survey.custom_questions) {
          survey.custom_questions.forEach((q, idx) => {
            const ans = answers[`custom_${idx}`];
            if (ans && typeof ans === "string" && ans.trim().length > 0) {
              customFeedbackMap[q].push(ans);
            }
          });
        }

        let responseTotal = 0;
        let responseQCount = 0;

        PSQ_QUESTIONS.filter((q) => q.type === "likert").forEach((q) => {
          const val = answers[q.id];
          if (typeof val === "number" && val > 0) {
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
        name: survey.title.replace("PSQ Cycle ", "") || "Untitled",
        date: new Date(survey.created_at).toLocaleDateString(),
        score: surveyAvg,
      };
    })
    .filter(Boolean) as any[];

  const breakdown = Object.entries(domainScores)
    .map(([name, data]) => ({
      id: name,
      name,
      score: data.count >= DOMAIN_MIN_THRESHOLD ? parseFloat((data.sum / data.count).toFixed(2)) : "Insufficient Data",
      count: data.count,
    }))
    .sort((a, b) => {
      if (typeof a.score === "string") return 1;
      if (typeof b.score === "string") return -1;
      return b.score - a.score;
    });

  const averageScore = totalResponseCount > 0 ? parseFloat((totalScoreSum / totalResponseCount).toFixed(2)) : 0;

  const responseThreshold = surveys.length > 0 && surveys[0].required_responses ? surveys[0].required_responses : 34;

  const thresholdMet = totalResponseCount >= responseThreshold;
  const responsesNeeded = Math.max(0, responseThreshold - totalResponseCount);

  const appointmentTypes = Object.entries(appointmentCounts).map(([name, value]) => ({ name, value }));
  const customFeedback = Object.entries(customFeedbackMap)
    .map(([question, answers]) => ({ question, answers }))
    .filter((cf) => cf.answers.length > 0);

  const safeTextFeedback = thresholdMet ? rawTextFeedback.sort(() => Math.random() - 0.5) : [];

  return {
    stats: {
      totalResponses: totalResponseCount,
      averageScore,
      topArea: breakdown.length > 0 && typeof breakdown[0].score === "number" ? breakdown[0].name : "Pending Data",
      lowestArea:
        breakdown.length > 0 && typeof breakdown[breakdown.length - 1].score === "number"
          ? breakdown[breakdown.length - 1].name
          : "Pending Data",
      thresholdMet,
      responsesNeeded,
      targetThreshold: responseThreshold,
    },
    trendData,
    breakdown,
    appointmentTypes,
    customFeedback,
    textFeedback: safeTextFeedback,
  };
}
