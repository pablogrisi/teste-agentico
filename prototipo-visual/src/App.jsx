import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "@/routes/HomePage/HomePage";
import { AnalysisPage } from "@/routes/AnalysisPage/AnalysisPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/analise/:id" element={<AnalysisPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
