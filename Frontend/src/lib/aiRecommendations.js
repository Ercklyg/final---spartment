export const loadAiRecommendations = (client, month, period = 'Monthly', force = false) =>
  client.post('/analytics/recommendations', { month, period, force });
