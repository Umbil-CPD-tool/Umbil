/** Capture-learning suggestion cadence. One nudge each time the day's questions hit a multiple of this. */
export const DAILY_NUDGE_EVERY = 10;

export type DailyNudgeAnchor = {
  count: number;
  conversationId: string;
  questionIndex: number;
};

export type DailyNudgeState = {
  date: string;
  count: number;
  anchors: DailyNudgeAnchor[];
};

export const emptyDailyNudge = (date: string): DailyNudgeState => ({
  date,
  count: 0,
  anchors: [],
});

/** Calendar day in London, so a session that crosses midnight starts again. */
export const calendarDateKey = (now = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const parseDailyNudgeState = (raw: string | null, today: string): DailyNudgeState => {
  if (!raw) return emptyDailyNudge(today);
  try {
    const parsed = JSON.parse(raw) as Partial<DailyNudgeState>;
    if (parsed.date !== today) return emptyDailyNudge(today);
    const count = Number.isFinite(parsed.count) ? Math.max(0, Math.floor(Number(parsed.count))) : 0;
    const anchors = Array.isArray(parsed.anchors)
      ? parsed.anchors.filter((anchor): anchor is DailyNudgeAnchor => {
          if (!anchor || typeof anchor !== "object") return false;
          const item = anchor as DailyNudgeAnchor;
          return (
            Number.isInteger(item.count) &&
            item.count > 0 &&
            item.count <= count &&
            item.count % DAILY_NUDGE_EVERY === 0 &&
            typeof item.conversationId === "string" &&
            item.conversationId.length > 0 &&
            Number.isInteger(item.questionIndex) &&
            item.questionIndex > 0
          );
        })
      : [];
    return { date: today, count, anchors };
  } catch {
    return emptyDailyNudge(today);
  }
};

export const recordDailyQuestion = (
  state: DailyNudgeState,
  input: { today: string; conversationId: string; questionIndex: number }
): DailyNudgeState => {
  const base = state.date === input.today ? state : emptyDailyNudge(input.today);
  const count = base.count + 1;
  const anchors =
    count % DAILY_NUDGE_EVERY === 0
      ? [
          ...base.anchors,
          {
            count,
            conversationId: input.conversationId,
            questionIndex: input.questionIndex,
          },
        ]
      : base.anchors;
  return { date: input.today, count, anchors };
};

/** Drop the suggestion after learning is saved. The day's count keeps going. */
export const clearDailyNudges = (state: DailyNudgeState, today: string): DailyNudgeState => {
  if (state.date !== today) return emptyDailyNudge(today);
  return { ...state, anchors: [] };
};

/** A rejected question should not count toward the next suggestion. */
export const undoDailyQuestion = (state: DailyNudgeState, today: string): DailyNudgeState => {
  if (state.date !== today || state.count <= 0) return state.date === today ? state : emptyDailyNudge(today);
  const count = state.count - 1;
  return {
    date: today,
    count,
    anchors: state.anchors.filter((anchor) => anchor.count <= count),
  };
};

export const showsDailyNudge = (
  state: DailyNudgeState,
  today: string,
  conversationId: string | null,
  questionIndex: number
): boolean => {
  if (state.date !== today || !conversationId) return false;
  return state.anchors.some(
    (anchor) => anchor.conversationId === conversationId && anchor.questionIndex === questionIndex
  );
};

export const dashboardReturnPath = (
  conversationId: string | null | undefined,
  scrollTop: number | null | undefined
): string => {
  const params = new URLSearchParams();
  if (conversationId) params.set("c", conversationId);
  if (typeof scrollTop === "number" && Number.isFinite(scrollTop) && scrollTop >= 0) {
    params.set("scroll", String(Math.round(scrollTop)));
  }
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
};
