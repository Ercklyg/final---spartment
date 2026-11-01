import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import { isRecoveryPage } from "./lib/passwordRecovery.js";
import App from "./App.jsx";
import { ResetPasswordPage } from "./lazyEntrypoints.jsx";
import ActionFeedback from "./components/ActionFeedback.jsx";
import PageSkeleton from "./components/PageSkeleton.jsx";
import ConnectionStatus from "./components/ConnectionStatus.jsx";
import "./components/ActionFeedback.css";

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>undefined));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<PageSkeleton variant={isRecoveryPage ? 'password' : 'auth'} label="Loading application..." fullPage/>}>
      {isRecoveryPage ? <ResetPasswordPage /> : <App />}
    </Suspense>
    <ActionFeedback />
    <ConnectionStatus />
  </StrictMode>
);
