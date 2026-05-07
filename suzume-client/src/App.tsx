import { Navigate, Route, Routes } from "react-router-dom";
import HealthGate from "./components/HealthGate";
import DecksPage from "./pages/DecksPage";
import StatusPage from "./pages/StatusPage";

function App() {
  return (
    <HealthGate>
      <Routes>
        <Route path="/" element={<DecksPage />} />
        <Route path="/decks/*" element={<DecksPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HealthGate>
  );
}

export default App;
