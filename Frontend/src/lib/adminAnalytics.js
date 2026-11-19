export const loadAdminAnalytics=(client,month,period='Monthly')=>client.get('/analytics?month='+encodeURIComponent(month)+'&period='+encodeURIComponent(period));
export const loadAdminDashboard=(client,month)=>client.get('/analytics?month='+encodeURIComponent(month)+'&period=Monthly&view=dashboard');

// Selected bills already exclude test records and payments after the report cutoff.
export const collectedForSelectedBills = snapshot =>
  (snapshot.selected || []).reduce((total, bill) => total + Math.round(Number(bill.paid || 0) * 100), 0) / 100;
