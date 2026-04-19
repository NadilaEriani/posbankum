import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import KelolaBerita from "./pages/admin/KelolaBerita.jsx";
import DataPosbankum from "./pages/admin/DataPosbankum";
import ManajemenAkun from "./pages/admin/ManajemenAkun.jsx";
import LaporanKegiatan from "./pages/admin/LaporanKegiatan.jsx";

// posbankum
import PosbankumDashboard from "./pages/posbankum/PosbankumDashboard.jsx";
import KelolaKegiatan from "./pages/posbankum/KelolaKegiatan";
import LaporanPelayanan from "./pages/posbankum/LaporanPelayanan.jsx";
import SemuaKasus from "./pages/posbankum/SemuaKasus.jsx";
import KelolaPosbankum from "./pages/posbankum/KelolaPosbankum.jsx";

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
    if (wasDashboard && !isDashboard) {
      supabase.auth.signOut();
    }

    prevPathRef.current = curr;
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ForgotPasswordPage />} />
      {/* Admin */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/KelolaBerita" element={<KelolaBerita />} />
      <Route path="/dataPosbankum" element={<DataPosbankum />} />
      <Route path="/ManajemenAkun" element={<ManajemenAkun />} />
      <Route path="/laporanKegiatan" element={<LaporanKegiatan />} />

      {/* Posbankum */}
      <Route path="/posbankum" element={<PosbankumDashboard />} />
      <Route path="/kegiatan" element={<KelolaKegiatan />} />
      <Route path="/laporanPelayanan" element={<LaporanPelayanan />} />
      <Route path="/semuaKasus" element={<SemuaKasus />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
