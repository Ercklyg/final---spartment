export const loadAiRecommendations = (client, month, period = 'Monthly', force = false) =>
  client.post('/analytics/recommendations', { month, period, force });

// Memory only: never persist tenant names/financial insights to localStorage.
// api.js clears this cache when signing in/out or switching accounts.
const previews = new Map();
export const getRecommendationPreview = month => previews.get(month) || null;
export function saveRecommendationPreview(month, result) {
  previews.set(month, { ...result, cached: true });
}
export const clearRecommendationPreviews = () => previews.clear();
