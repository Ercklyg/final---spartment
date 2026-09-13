export async function loadTenantAccount(client,verifiedUser) {
  const auth=verifiedUser?{user:verifiedUser}:(await client.auth.getUser()).data;
  if(!auth?.user)throw new Error('Your session expired. Please sign in again.');
  const id = auth.user.id;
  const [profile, assignment, lease] = await Promise.all([
    client.from("profiles").select("id, full_name, phone, role").eq("id", id).single(),
    client.from("tenant_assignments").select("monthly_rent, emergency_name, emergency_phone, relationship").eq("id", id).maybeSingle(),
    client.from("leases").select("id, room_id, move_in_date, lease_end_date, rooms(id, room_number, floor, monthly_rate, buildings(name))").eq("tenant_id", id).eq("status", "active").maybeSingle(),
  ]);
  if (profile.error || assignment.error || lease.error) throw new Error("Unable to load your account. Please retry.");
  if (profile.data.role !== "tenant") throw new Error("A tenant account is required.");
  if (lease.data && !lease.data.rooms) throw new Error("Unable to load your assigned room. Please contact your administrator.");
  return { ...profile.data, email: auth.user.email, assignment: assignment.data, lease: lease.data, room: lease.data?.rooms || null,
    rent: lease.data ? Number(assignment.data?.monthly_rent ?? lease.data.rooms.monthly_rate) : null };
}

export const formatTenantDate = value => value ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "Not specified";
export const formatTenantRent = value => value == null ? "Not assigned" : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
