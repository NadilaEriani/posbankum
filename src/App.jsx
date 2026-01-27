import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
// admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import DataPosbankum from "./pages/admin/DataPosbankum";
import KelolaPosbankum from "./pages/admin/KelolaPosbankum";
// posbankum
import PosbankumDashboard from "./pages/posbankum/PosbankumDashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Admin */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/dataPosbankum" element={<DataPosbankum />} />
      <Route path="/kelolaPosbankum" element={<KelolaPosbankum />} />
      {/* Posbankum */}
      <Route path="/posbankum" element={<PosbankumDashboard />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
