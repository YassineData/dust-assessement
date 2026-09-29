import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DEMO_CODES, DEMO_FLAG, installDemoInterceptor, isDemoMode } from "./demo/demo-data";

// Demo mode only applies to demo links. A real survey or results link always talks to the real
// database, even in a browser where someone clicked "Try the platform" before.
let demoAllowed = true;
try {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code")?.toUpperCase();
  const key = params.get("key");
  const onSurvey = window.location.pathname.startsWith("/assessment") && params.get("preview") !== "1";
  if (code) {
    if (DEMO_CODES.includes(code)) localStorage.setItem(DEMO_FLAG, "1");
    else localStorage.removeItem(DEMO_FLAG);
  }
  if (key) {
    if (key.startsWith("demo-")) localStorage.setItem(DEMO_FLAG, "1");
    else localStorage.removeItem(DEMO_FLAG);
  }
  // /login is the real Dust sign-in: leave any sample-data session behind (a real session is kept).
  if (window.location.pathname === "/login") {
    localStorage.removeItem(DEMO_FLAG);
    const session = localStorage.getItem("dashboard_session_v2") || "";
    if (session.includes('"campaignId":"demo-')) localStorage.removeItem("dashboard_session_v2");
    if ((localStorage.getItem("dust_access_key") || "").startsWith("demo-")) localStorage.removeItem("dust_access_key");
    demoAllowed = false;
  }
  // The survey itself never runs on sample data unless opened with a demo code.
  if (onSurvey && !(code && DEMO_CODES.includes(code))) demoAllowed = false;
} catch {
  /* storage unavailable */
}

// Demo mode serves fictional rollouts from memory and never touches the database.
if (demoAllowed && isDemoMode()) installDemoInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
