export const loadNotifications=client=>client.get('/notifications');
export async function markNotificationsRead(client,ids){for(let i=0;i<ids.length;i+=100)await client.post('/notifications/read',{ids:ids.slice(i,i+100)});}
export const markAllNotificationsRead=(client,before)=>client.post('/notifications/read',{all:true,before});
export const updateNotificationEngagement=(client,ids,action)=>client.post('/notifications/engagement',{ids,action});
export const loadNotificationPreferences=client=>client.get('/notifications/preferences',{force:true});
export const saveNotificationPreferences=(client,preferences)=>client.put('/notifications/preferences',preferences);
export const loadPushKey=client=>client.get('/notifications/push-key',{force:true});
export const savePushSubscription=(client,subscription)=>client.post('/notifications/push-subscriptions',subscription);
export const removePushSubscription=(client,endpoint)=>client.delete('/notifications/push-subscriptions',{body:JSON.stringify({endpoint})});
