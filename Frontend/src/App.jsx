import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import PageSkeleton from './components/PageSkeleton.jsx';
import { api, auth } from "./lib/api.js";
import LandingPage from "./pages/LandingPage.jsx";

const GuestPage = lazy(() => import("./pages/GuestPage.jsx"));
const TenantDashboardPage = lazy(() => import("./pages/TenantDashboardPage.jsx"));
const TenantBillingPage = lazy(() => import("./pages/TenantBillingPage.jsx"));
const TenantSettingsPage = lazy(() => import("./pages/TenantSettingsPage.jsx"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage.jsx"));
const AdminRoomsPage = lazy(() => import("./pages/AdminRoomsPage.jsx"));
const AdminTenantsPage = lazy(() => import("./pages/AdminTenantsPage.jsx"));
const AdminBillingPage = lazy(() => import("./pages/AdminBillingPage.jsx"));
const AdminRequestsPage = lazy(() => import("./pages/AdminRequestsPage.jsx"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage.jsx"));

const skeletons = {
  admin: 'dashboard', Rooms: 'rooms', Tenants: 'tenants', Billing: 'billing',
  'Customer Requests': 'table', 'Analytics & Reports': 'analytics',
  tenant: 'dashboard', billing: 'tenant-billing', settings: 'account', guest: 'rooms',
};

function LazyPage({ Page, variant, ...props }) {
  return <Suspense fallback={<PageSkeleton variant={variant} label="Loading page..." fullPage/>}>
    <Page {...props}/>
  </Suspense>;
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const scrollPositions = useRef(new Map());
  const navigate = useCallback(nextPage => {
    scrollPositions.current.set(page, window.scrollY);
    setPage(nextPage);
  }, [page]);
  useEffect(() => {
    return auth.subscribe(setSession);
  }, []);
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    api.get("/auth/profile", { signal: controller.signal, cacheMs: 30_000 }).then(data => {
      if (data?.id !== userId || !["admin", "tenant"].includes(data?.role)) {
        setError("Unable to verify your account role. Please retry or contact your administrator.");
      } else {
        setProfile(data);
        setError("");
        setPage(data.role === "admin" ? "admin" : "tenant");
      }
    }).catch(error => { if (error?.name !== 'AbortError') setError(error.message || "Unable to load your account. Please retry."); });
    return () => controller.abort();
  }, [userId]);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo({top:scrollPositions.current.get(page) || 0,behavior:'auto'}));
    return () => cancelAnimationFrame(frame);
  }, [page]);
  const logout = async () => {
    try {
      await auth.signOut();
      scrollPositions.current.clear();
      setProfile(null); setError(""); setPage("landing");
    } catch { setError("Logout failed. Please retry."); }
  };
  const signIn = async (email, password) => {
    scrollPositions.current.clear();
    setProfile(null); setError("");
    await auth.signIn(email, password);
  };
  // Session restoration must not hold the public website behind the API. This
  // is especially important when the backend is waking from an idle state.
  if (session === undefined || session?.error) return <LandingPage onContinueAsGuest={() => navigate("guest")} onSignIn={signIn} />;
  if (page === "guest" && !userId) return <LazyPage Page={GuestPage} variant={skeletons.guest} onExit={() => navigate("landing")} />;
  if (!userId) return <LandingPage onContinueAsGuest={() => navigate("guest")} onSignIn={signIn} />;
  if (profile?.id !== userId && !error) return <PageSkeleton label="Loading your account..." fullPage/>;
  if (profile?.id !== userId || error) return <main className="p-8"><p role={error ? "alert" : "status"}>{error || "Loading your account..."}</p><div className="mt-4 flex gap-4">{error && <button onClick={() => window.location.reload()}>Retry</button>}<button onClick={logout}>Sign out</button></div></main>;
  if (profile?.role === "admin") {
    const pages = { admin: AdminDashboardPage, Rooms: AdminRoomsPage, Tenants: AdminTenantsPage, Billing: AdminBillingPage, "Customer Requests": AdminRequestsPage, "Analytics & Reports": AdminAnalyticsPage };
    const Page = pages[page] || AdminDashboardPage;
    return <LazyPage key={userId} Page={Page} variant={skeletons[page] || 'dashboard'} onNavigate={navigate} onLogout={logout} />;
  }
  if (profile?.role === "tenant") {
    const pages = { tenant: TenantDashboardPage, billing: TenantBillingPage, settings: TenantSettingsPage };
    const Page = pages[page] || TenantDashboardPage;
    return <LazyPage key={userId} Page={Page} variant={skeletons[page] || 'dashboard'} onNavigate={navigate} onLogout={logout} />;
  }
  return <LandingPage onContinueAsGuest={() => navigate("guest")} onSignIn={signIn} />;
}
