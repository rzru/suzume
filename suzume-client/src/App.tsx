import { Navigate, Route, Routes } from "react-router-dom";
import { HealthGate } from "./components/health-gate";
import { DecksPage } from "./pages/DecksPage";
import { PracticePage } from "./pages/PracticePage";
import { StatusPage } from "./pages/StatusPage";

export function App() {
  return (
    <HealthGate>
      <Routes>
        <Route path="/" element={<DecksPage />} />
        <Route path="/decks/:deckId" element={<DecksPage />} />
        <Route path="/decks/:deckId/:mode/:level/:scope/:direction?" element={<PracticePage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HealthGate>
  );
}
