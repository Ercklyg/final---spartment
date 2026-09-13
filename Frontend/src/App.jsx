import { useEffect, useState } from "react";
import PageSkeleton from './components/PageSkeleton.jsx';
import { api, auth } from "./lib/api.js";
import LandingPage from "./pages/LandingPage.jsx"; import GuestPage from "./pages/GuestPage.jsx"; import TenantDashboardPage from "./pages/TenantDashboardPage.jsx"; import TenantBillingPage from "./pages/TenantBillingPage.jsx"; import TenantSettingsPage from "./pages/TenantSettingsPage.jsx"; import AdminDashboardPage from "./pages/AdminDashboardPage.jsx"; import AdminRoomsPage from "./pages/AdminRoomsPage.jsx"; import AdminTenantsPage from "./pages/AdminTenantsPage.jsx"; import AdminBillingPage from "./pages/AdminBillingPage.jsx"; import AdminRequestsPage from "./pages/AdminRequestsPage.jsx"; import AdminAnalyticsPage from "./pages/AdminAnalyticsPage.jsx";

export default function App() {
  const [page, setPage] = useState("landing");
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    return auth.subscribe(setSession);
  }, []);
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    api.get("/auth/profile").then(data => {
      if (!active) return;
      if (data?.id !== userId || !["admin", "tenant"].includes(data?.role)) {
        setError("Unable to verify your account role. Please retry or contact your administrator.");
      } else {
        setProfile(data);
        setError("");
        setPage(data.role === "admin" ? "admin" : "tenant");
      }
    }).catch(error => { if (active) setError(error.message || "Unable to load your account. Please retry."); });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  const logout = async () => {
    try {
      await auth.signOut();
      setProfile(null); setError(""); setPage("landing");
    } catch { setError("Logout failed. Please retry."); }
  };
  const signIn = async (email, password) => {
    setProfile(null); setError("");
    await auth.signIn(email, password);
  };
  if (session === undefined) return <PageSkeleton variant="auth" label="Checking your session..." fullPage/>;
  if (userId && profile?.id !== userId && !error) return <PageSkeleton label="Loading your account..." fullPage/>;
  if (session?.error) return <main className="p-8"><p role="alert">{session.error}</p><button type="button" onClick={()=>auth.restore()} className="mt-4 underline">Retry session check</button></main>;
  if (userId && (profile?.id !== userId || error)) return <main className="p-8"><p role={error ? "alert" : "status"}>{error || "Loading your account..."}</p><div className="mt-4 flex gap-4">{error && <button onClick={() => window.location.reload()}>Retry</button>}<button onClick={logout}>Sign out</button></div></main>;
  if (userId && profile?.role === "admin") {
    const pages = { admin: AdminDashboardPage, Rooms: AdminRoomsPage, Tenants: AdminTenantsPage, Billing: AdminBillingPage, "Customer Requests": AdminRequestsPage, "Analytics & Reports": AdminAnalyticsPage };
    const Page = pages[page] || AdminDashboardPage;
    return <Page key={userId} onNavigate={setPage} onLogout={logout} />;
  }
  if (userId && profile?.role === "tenant") {
    const pages = { tenant: TenantDashboardPage, billing: TenantBillingPage, settings: TenantSettingsPage };
    const Page = pages[page] || TenantDashboardPage;
    return <Page key={userId} onNavigate={setPage} onLogout={logout} />;
  }
  if (page === "guest") return <GuestPage onExit={() => setPage("landing")} />;
  return <LandingPage onContinueAsGuest={() => setPage("guest")} onSignIn={signIn} />;
}
