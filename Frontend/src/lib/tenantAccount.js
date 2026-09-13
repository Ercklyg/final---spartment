export const loadTenantAccount=client=>client.get('/account');
export const formatTenantDate = value => value ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "Not specified";
export const formatTenantRent = value => value == null ? "Not assigned" : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
