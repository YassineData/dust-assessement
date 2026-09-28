import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DEMO_CODES, DEMO_FLAG, installDemoInterceptor, isDemoMode } from "./demo/demo-data";

// A link carrying a demo campaign code (e.g. /assessment?code=VELOR119) opens in demo mode.
try {
  const code = new URLSearchParams(window.location.search).get("code")?.toUpperCase();
  if (code && DEMO_CODES.includes(code)) localStorage.setItem(DEMO_FLAG, "1");
} catch {
  /* storage unavailable */
}

// Demo mode serves four fictional rollouts from memory and never touches the database.
if (isDemoMode()) installDemoInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
