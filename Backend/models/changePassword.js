// The verification client must use in-memory storage so it cannot replace the
// application's active session when checking the current password.
export async function changePassword(auth, verificationAuth, passwords) {
  if (!passwords.current) throw new Error("Enter your current password.");
  if (passwords.new.length < 8 || passwords.new.length > 128 ||
      !/[a-z]/.test(passwords.new) || !/[A-Z]/.test(passwords.new) ||
      !/\d/.test(passwords.new) || !/[^A-Za-z0-9]/.test(passwords.new)) {
    throw new Error("Use 8–128 characters, uppercase and lowercase letters, a number, and a symbol.");
  }
  if (passwords.new !== passwords.confirm) throw new Error("Your new passwords do not match.");
  if (passwords.new === passwords.current) throw new Error("Choose a different password from your current password.");
  const { data, error } = await auth.getUser();
  if (error || !data.user?.email) throw new Error("Your session expired. Sign in again before changing your password.");
  try {
    const verified = await verificationAuth.signInWithPassword({ email: data.user.email, password: passwords.current });
    if (verified.error) {
      if (verified.error.code === "invalid_credentials") throw new Error("Your current password is incorrect.");
      throw new Error("Unable to verify your password. Check your connection and try again shortly.");
    }
    if (verified.data.user?.id !== data.user.id) throw new Error("Your account changed. Sign in again and retry.");
    const latest = await auth.getUser();
    if (latest.error || latest.data.user?.id !== data.user.id) throw new Error("Your session changed. Sign in again and retry.");
    const updated = await auth.updateUser({ password: passwords.new, current_password: passwords.current });
    if (updated.error) {
      if (updated.error.code === "reauthentication_needed" || updated.error.code === "reauthentication_not_valid") {
        throw new Error("Sign out and sign in again, then retry changing your password.");
      }
      if (updated.error.code === "weak_password") throw new Error("Supabase rejected this password as too weak. Choose a stronger password.");
      throw new Error("Password update was not confirmed. Check your connection and try again.");
    }
  } finally {
    // Only revoke the temporary verification session, never the app session.
    try { await verificationAuth.signOut({ scope: "local" }); } catch { /* In-memory session is discarded by the caller. */ }
  }
}
