export const loadAdminAnalytics=(client,month,period='Monthly')=>client.get('/analytics?month='+encodeURIComponent(month)+'&period='+encodeURIComponent(period));
