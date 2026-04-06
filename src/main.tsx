import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Mount into #game-root (defined in index.html)
const el = document.getElementById("game-root")!;
createRoot(el).render(<App />);
