export const leaseHistory = (client, id) => client.get('/tenants/' + encodeURIComponent(id) + '/leases');
export const moveOut = (client, id, form) => client.post('/tenants/' + encodeURIComponent(id) + '/move-out', form);
