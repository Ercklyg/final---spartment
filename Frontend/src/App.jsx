import { useState } from "react";

import LandingPage from "./pages/LandingPage.jsx";
import GuestPage from "./pages/GuestPage.jsx";
import TenantDashboardPage from "./pages/TenantDashboardPage.jsx";
import TenantBillingPage from "./pages/TenantBillingPage.jsx";
import TenantSettingsPage from "./pages/TenantSettingsPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminRoomsPage from "./pages/AdminRoomsPage.jsx";
import AdminTenantsPage from "./pages/AdminTenantsPage.jsx";
import AdminBillingPage from "./pages/AdminBillingPage.jsx";
import AdminRequestsPage from "./pages/AdminRequestsPage.jsx";

function App() {
  const [currentPage, setCurrentPage] = useState("landing");

  const goToGuest = () => {
    setCurrentPage("guest");
  };

  const goToLanding = () => {
    setCurrentPage("landing");
  };

  const goToTenantDashboard = () => {
    setCurrentPage("tenant");
  };

  const goToAdminDashboard = () => {
    setCurrentPage("admin");
  };

  if (currentPage === "guest") {
    return <GuestPage onExit={goToLanding} />;
  }

  if (currentPage === "tenant") {
    return <TenantDashboardPage onLogout={goToLanding} onNavigate={setCurrentPage} />;
  }

  if (currentPage === "billing") {
    return <TenantBillingPage onLogout={goToLanding} onNavigate={setCurrentPage} />;
  }

  if (currentPage === "settings") {
    return <TenantSettingsPage onLogout={goToLanding} onNavigate={setCurrentPage} />;
  }

  if (currentPage === "admin") {
    return <AdminDashboardPage onLogout={goToLanding} onNavigate={(page) => page === "Rooms" ? setCurrentPage("admin-rooms") : page === "Tenants" ? setCurrentPage("admin-tenants") : page === "Billing" ? setCurrentPage("admin-billing") : page === "Customer Requests" && setCurrentPage("admin-requests")} />;
  }

  if (currentPage === "admin-rooms") {
    return <AdminRoomsPage onLogout={goToLanding} onNavigate={(page) => page === "Dashboard" ? setCurrentPage("admin") : page === "Tenants" ? setCurrentPage("admin-tenants") : page === "Billing" ? setCurrentPage("admin-billing") : page === "Customer Requests" && setCurrentPage("admin-requests")} />;
  }

  if (currentPage === "admin-tenants") {
    return <AdminTenantsPage onLogout={goToLanding} onNavigate={(page) => page === "Dashboard" ? setCurrentPage("admin") : page === "Rooms" ? setCurrentPage("admin-rooms") : page === "Billing" ? setCurrentPage("admin-billing") : page === "Customer Requests" && setCurrentPage("admin-requests")} />;
  }

  if (currentPage === "admin-billing") {
    return <AdminBillingPage onLogout={goToLanding} onNavigate={(page) => page === "Dashboard" ? setCurrentPage("admin") : page === "Rooms" ? setCurrentPage("admin-rooms") : page === "Tenants" ? setCurrentPage("admin-tenants") : page === "Customer Requests" && setCurrentPage("admin-requests")} />;
  }

  if (currentPage === "admin-requests") {
    return <AdminRequestsPage onLogout={goToLanding} onNavigate={(page) => page === "Dashboard" ? setCurrentPage("admin") : page === "Rooms" ? setCurrentPage("admin-rooms") : page === "Tenants" ? setCurrentPage("admin-tenants") : page === "Billing" && setCurrentPage("admin-billing")} />;
  }

  return <LandingPage onContinueAsGuest={goToGuest} onSignIn={goToTenantDashboard} onAdminSignIn={goToAdminDashboard} />;
}

export default App;
