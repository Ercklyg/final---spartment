import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react";
import PageSkeleton from './components/PageSkeleton.jsx';
import { showFeedback } from "./lib/actionFeedback.js";
import { api, auth } from "./lib/api.js";
import { DEFAULT_IDLE_TIMEOUT_MINUTES, formatIdleTimeout, useIdleLogout } from "./lib/useIdleLogout.js";
import { uiStatePrefix } from "./lib/useSessionState.js";
import LandingPage from "./pages/LandingPage.jsx";
import AdminHeader from "./components/admin/AdminHeader.jsx";
import AdminSidebar from "./components/admin/AdminSidebar.jsx";

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

const adminPages = { admin: AdminDashboardPage, Rooms: AdminRoomsPage, Tenants: AdminTenantsPage, Billing: AdminBillingPage, "Customer Requests": AdminRequestsPage, "Analytics & Reports": AdminAnalyticsPage };
const tenantPages = { tenant: TenantDashboardPage, billing: TenantBillingPage, settings: TenantSettingsPage };
const lastPageKey = userId => `${uiStatePrefix}last-page:${userId}`;

function readLastPage(userId) {
  try { return sessionStorage.getItem(lastPageKey(userId)); } catch { return null; }
}

function saveLastPage(userId, page) {
  try { sessionStorage.setItem(lastPageKey(userId), page); } catch { /* Page restoration is optional. */ }
}

function LazyPage({ Page, variant, ...props }) {
  return <Suspense fallback={<PageSkeleton variant={variant} label="Loading page..." fullPage/>}>
    <Page {...props}/>
  </Suspense>;
}

function AdminPageFallback({ activePage, variant, onNavigate, onLogout }) {
  return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900">
    <AdminSidebar activePage={activePage} onNavigate={onNavigate}/>
    <div className="min-w-0 flex-1">
      <AdminHeader onLogout={onLogout}/>
      <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 lg:pb-10 xl:px-8">
        <PageSkeleton variant={variant} label={`Loading ${activePage.toLowerCase()}...`}/>
      </div>
    </div>
  </main>;
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(DEFAULT_IDLE_TIMEOUT_MINUTES);
  const userId = session?.user?.id;
  const navigate = useCallback(nextPage => {
    if (userId) saveLastPage(userId, nextPage);
    setPage(nextPage);
  }, [userId]);
  useEffect(() => {
    return auth.subscribe(setSession);
  }, []);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    api.get("/auth/profile", { signal: controller.signal, cacheMs: 30_000 }).then(data => {
      if (data?.id !== userId || !["admin", "tenant"].includes(data?.role)) {
        setError("Unable to verify your account role. Please retry or contact your administrator.");
      } else {
        const pages = data.role === "admin" ? adminPages : tenantPages;
        const savedPage = readLastPage(userId);
        setProfile(data);
        setError("");
        setPage(pages[savedPage] ? savedPage : data.role);
      }
    }).catch(error => { if (error?.name !== 'AbortError') setError(error.message || "Unable to load your account. Please retry."); });
    return () => controller.abort();
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    api.get("/public/config", { signal: controller.signal, cacheMs: 60_000 }).then(data => {
      const minutes = Number.parseFloat(data?.idleTimeoutMinutes);
      if (Number.isFinite(minutes) && minutes > 0) setIdleTimeoutMinutes(minutes);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [userId]);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    return () => cancelAnimationFrame(frame);
  }, [page]);
  const logout = async () => {
    try {
      await auth.signOut();
      setProfile(null); setError(""); setPage("landing");
    } catch { setError("Logout failed. Please retry."); }
  };
  const logoutForInactivity = useCallback(async () => {
    const message = `You were signed out after ${formatIdleTimeout(idleTimeoutMinutes)} of inactivity.`;
    try {
      await auth.signOut(message);
    } catch {
      auth.clearLocalSession();
      showFeedback(message, "info");
    }
    setProfile(null); setError(""); setPage("landing");
  }, [idleTimeoutMinutes]);
  useIdleLogout({
    enabled: Boolean(userId && profile?.id === userId),
    userId,
    onIdle: logoutForInactivity,
    timeoutMs: idleTimeoutMinutes * 60 * 1000,
  });
  const signIn = async (email, password) => {
    setProfile(null); setError("");
    await auth.signIn(email, password);
  };
  // Resolve the HttpOnly session before choosing the landing page or the
  // signed-in UI so an authenticated reload never flashes the public website.
  if (session === undefined) return <PageSkeleton label="Restoring your session..." fullPage/>;
  if (session?.error) return <LandingPage onContinueAsGuest={() => navigate("guest")} onSignIn={signIn} />;
  if (page === "guest" && !userId) return <LazyPage Page={GuestPage} variant={skeletons.guest} onExit={() => navigate("landing")} />;
  if (!userId) return <LandingPage onContinueAsGuest={() => navigate("guest")} onSignIn={signIn} />;
  if (profile?.id !== userId && !error) return <PageSkeleton label="Loading your account..." fullPage/>;
  if (profile?.id !== userId || error) return <main className="p-8"><p role={error ? "alert" : "status"}>{error || "Loading your account..."}</p><div className="mt-4 flex gap-4">{error && <button onClick={() => window.location.reload()}>Retry</button>}<button onClick={logout}>Sign out</button></div></main>;
  if (profile?.role === "admin") {
    const Page = adminPages[page] || AdminDashboardPage;
    const activePage = page === 'admin' ? 'Dashboard' : page;
    const variant = skeletons[page] || 'dashboard';
    return <Suspense key={userId} fallback={<AdminPageFallback activePage={activePage} variant={variant} onNavigate={navigate} onLogout={logout}/>}>
      <Page onNavigate={navigate} onLogout={logout}/>
    </Suspense>;
  }
  if (profile?.role === "tenant") {
    const Page = tenantPages[page] || TenantDashboardPage;
    return <LazyPage key={userId} Page={Page} variant={skeletons[page] || 'dashboard'} onNavigate={navigate} onLogout={logout} />;
  }
  return <LandingPage onContinueAsGuest={() => navigate("guest")} onSignIn={signIn} />;
}
