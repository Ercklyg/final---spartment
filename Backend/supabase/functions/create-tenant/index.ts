import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return reply(405, { error: "Use POST." });
  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply(401, { error: "Sign in to continue." });
  const serviceKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").spartment_production;
  if (!serviceKey) return reply(503, { error: "Account provisioning is temporarily unavailable." });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply(401, { error: "Your session expired. Sign in again." });
    const { data: profile, error: roleError } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (roleError || profile?.role !== "admin") return reply(403, { error: "Administrator access required." });
    let input;
    try { input = await request.json(); } catch { return reply(400, { error: "Invalid request body." }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return reply(400, { error: "Invalid tenant details." });
    const account: Record<string, string | number> = {};
    for (const key of ["name", "email", "phone", "room", "moveIn", "leaseEnd", "emergencyName", "emergencyPhone", "relationship"]) {
      if (input[key] != null && typeof input[key] !== "string") return reply(400, { error: "Invalid tenant details." });
      account[key] = (input[key] || "").trim();
      if (String(account[key]).length > 254) return reply(400, { error: "Tenant details are too long." });
    }
    account.email = String(account.email).toLowerCase();
    account.rent = Number(input.rent);
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
    if (!account.name || !account.emergencyName || !account.relationship ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(account.email)) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(account.room)) ||
        ![account.phone, account.emergencyPhone].every(value => /^\+?[\d\s()-]{7,20}$/.test(String(value))) ||
        !Number.isFinite(account.rent) || account.rent <= 0 || account.rent > 9999999999.99 ||
        !validDate(String(account.moveIn)) ||
        (account.leaseEnd && (!validDate(String(account.leaseEnd)) || account.leaseEnd < account.moveIn)) ||
        typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128 ||
        !/[a-z]/.test(input.password) || !/[A-Z]/.test(input.password) ||
        !/\d/.test(input.password) || !/[^A-Za-z0-9]/.test(input.password)) {
      return reply(400, { error: "Check the required fields, dates and rent. Use an 8–128 character password with uppercase and lowercase letters, a number, and a symbol." });
    }
    const { data: room, error: roomError } = await admin.from("rooms").select("id").eq("id", account.room).eq("status", "available").maybeSingle();
    if (roomError) return reply(500, { error: "Unable to check room availability." });
    if (!room) return reply(409, { error: "Room is no longer available. Reload tenants and choose another room." });
    const { data, error } = await admin.auth.admin.createUser({
      email: String(account.email), password: input.password, email_confirm: true,
      user_metadata: { full_name: account.name }, app_metadata: { role: "tenant" },
    });
    if (error || !data.user) return reply(400, { error: "Unable to create account. Check whether the email already exists and the password meets your Auth policy." });
    const { error: saveError } = await admin.rpc("finish_tenant_account", { account_id: data.user.id, account });
    if (saveError) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
      if (cleanupError) {
        console.error("Tenant account cleanup required", data.user.id);
        return reply(500, { error: "Account setup failed and requires administrator cleanup before retrying." });
      }
      return reply(409, { error: "Tenant setup failed. Reload rooms and retry; the room or email may already be assigned." });
    }
    return reply(201, { id: data.user.id });
  } catch {
    return reply(500, { error: "Unable to create tenant. Check the account list before retrying." });
  }
});
