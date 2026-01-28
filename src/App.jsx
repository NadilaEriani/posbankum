import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
// admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import DataPosbankum from "./pages/admin/DataPosbankum";
import KelolaPosbankum from "./pages/admin/KelolaPosbankum";
// posbankum
import PosbankumDashboard from "./pages/posbankum/PosbankumDashboard.jsx";

export default function App() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;

    const wasDashboard =
      prev.startsWith("/admin") || prev.startsWith("/posbankum");
    const isDashboard =
      curr.startsWith("/admin") || curr.startsWith("/posbankum");

    // ✅ keluar dari dashboard => logout
    // (logout hanya saat pindah route, tidak kena StrictMode "unmount palsu")
    if (wasDashboard && !isDashboard) {
      supabase.auth.signOut();
    }

    prevPathRef.current = curr;
  }, [location.pathname]);

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
