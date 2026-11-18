export const loadAiRecommendations = (client, month, period = 'Monthly', force = false) =>
  client.post('/analytics/recommendations', { month, period, force });

// Memory only: never persist tenant names/financial insights to localStorage.
// api.js clears this cache when signing in/out or switching accounts.
const previews = new Map();
const previewKey = (month, period) => month + '|' + period;
export const getRecommendationPreview = (month, period = 'Monthly') => previews.get(previewKey(month, period)) || null;
export function saveRecommendationPreview(month, result, period = 'Monthly') {
  previews.set(previewKey(month, period), { ...result, cached: true });
}
export const clearRecommendationPreviews = () => previews.clear();

export function formatInsightDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${day} at ${time} (Philippine time)`;
}

export function recommendationFallbackMessage({ reason, updatedAt, hasItems }) {
  const lead = reason === 'quota' ? 'AI usage limit reached.' : 'AI insights are temporarily unavailable.';
  if (!hasItems) return `${lead} No previous AI recommendations are saved for this report yet.`;
  const generatedAt = formatInsightDate(updatedAt);
  return generatedAt
    ? `${lead} Showing the last generated recommendations from ${generatedAt}.`
    : `${lead} Showing the last saved recommendations. Their generation time is unavailable.`;
}
