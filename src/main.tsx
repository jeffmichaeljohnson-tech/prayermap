import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDatadogRum } from "./lib/datadog";

// Initialize Datadog RUM with Session Replay before rendering
initDatadogRum();

createRoot(document.getElementById("root")!).render(<App />);
