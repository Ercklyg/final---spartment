import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import { isRecoveryPage } from "./lib/passwordRecovery.js";
import ActionFeedback from "./components/ActionFeedback.jsx";
import "./components/ActionFeedback.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isRecoveryPage ? <ResetPasswordPage /> : <App />}
    <ActionFeedback />
  </StrictMode>
);
