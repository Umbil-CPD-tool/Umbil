/**
 * How far the keyboard covers the window.
 * iOS sometimes reports a height that stops short of the predictive-text bar.
 * The distance from the top of the keyboard to the bottom of the window includes that bar.
 */
export const keyboardOverlap = (
  windowHeight: number,
  screenY: number,
  reportedHeight: number
): number => {
  const reported = Number.isFinite(reportedHeight) ? Math.max(0, reportedHeight) : 0;
  const fromTop =
    Number.isFinite(screenY) && screenY > 0 ? Math.max(0, windowHeight - screenY) : 0;
  if (reported === 0) return fromTop;
  return Math.max(reported, fromTop);
};
