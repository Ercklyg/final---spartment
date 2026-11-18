import { serviceError } from '../middleware/errors.js';

export async function loadSavedRecommendations(db, adminId, month, period) {
  const { data, error } = await db.from('saved_ai_recommendations')
    .select('items,generated_at,reporting_cutoff,last_failure,failed_at,last_attempt_at')
    .eq('admin_id', adminId).eq('report_month', month + '-01').eq('period', period).maybeSingle();
  if (error) throw serviceError(503, 'Unable to load saved AI recommendations.', error);
  return data;
}

export async function saveRecommendations(db, { month, period, items, cutoff, startedAt }) {
  const { data, error } = await db.rpc('save_ai_recommendations', {
    p_month: month + '-01', p_period: period, p_items: items, p_cutoff: cutoff, p_started_at: startedAt,
  });
  if (error) throw serviceError(503, 'Unable to save AI recommendations. Please retry.', error);
  return data;
}

export async function saveRecommendationFailure(db, { month, period, reason, startedAt }) {
  const { data, error } = await db.rpc('record_ai_recommendation_failure', {
    p_month: month + '-01', p_period: period, p_reason: reason, p_started_at: startedAt,
  });
  if (error) throw serviceError(503, 'Unable to save the recommendation status. Please retry.', error);
  return data;
}
