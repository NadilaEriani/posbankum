import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./landing.css";

async function getRedirectPathByRole(userId) {
  // kalau profiles belum siap, fallback ke admin dulu atau "/"
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data?.role) return "/admin";

  if (data.role === "admin") return "/admin";
  if (data.role === "paralegal") return "/paralegal";
  return "/admin"; // role lain (misal masyarakat)
}

export default function LandingPage() {
  const nav = useNavigate();
  const [sessionEmail, setSessionEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // cek session awal
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      setSessionEmail(user?.email ?? "");

      // kalau sudah login, langsung ke dashboard
      if (user?.id) {
        const path = await getRedirectPathByRole(user.id);
        nav(path, { replace: true });
      }
    })();

    // listen login/logout
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? "");
    });

    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const goDashboard = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) {
      setLoading(false);
      nav("/login");
      return;
    }

    const path = await getRedirectPathByRole(userId);
    setLoading(false);
    nav(path);
  };

  const onLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    // sessionEmail akan otomatis kosong lewat listener
  };

  return (
    <div className="lp2">
      {/* HEADER */}
      <header className="lp2-header">
        <div className="lp2-brand">
          <span className="lp2-icon">✉</span>
          <span className="lp2-name">Posbankum</span>
        </div>

        {/* KANAN HEADER */}
        {!sessionEmail ? (
          <Link className="lp2-loginBtn" to="/login">
            Masuk
          </Link>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="lp2-loginBtn"
              type="button"
              onClick={goDashboard}
              disabled={loading}
            >
              {loading ? "..." : "Dashboard"}
            </button>

            <button
              className="lp2-loginBtn"
              type="button"
              onClick={onLogout}
              disabled={loading}
              style={{
                borderColor: "rgba(245,158,11,.35)",
                background: "rgba(245,158,11,.10)",
              }}
            >
              Keluar
            </button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="lp2-hero">
        <div className="lp2-heroGrid">
          <div className="ph ph-hero"></div>

          <div className="lp2-heroText">
            <h1>Ayok cek data Posbakum di wilayah Anda</h1>
            <p>
              Temukan informasi Pos Bantuan Hukum (Posbakum) di desa atau
              kelurahan Anda, mulai dari daftar paralegal aktif, dokumen hukum,
              hingga kegiatan Posbakum terbaru.
            </p>

            <div className="lp2-cta">
              <button className="btn primary" type="button">
                Lihat Posbakum Terdekat <span className="arrow">→</span>
              </button>
              <button className="btn" type="button">
                Pelajari Cara Kerja Posbakum
              </button>
            </div>
          </div>
        </div>

        <div className="lp2-heroRow">
          <div className="ph ph-small"></div>
          <div className="ph ph-small"></div>
          <div className="ph ph-small"></div>
        </div>
      </section>

      {/* SECTION INFORMASI UTAMA */}
      <section className="lp2-mainInfo">
        <p className="lp2-kicker">
          INFORMASI LAYANAN POSBAKUM DALAM SATU PLATFORM
        </p>
        <h2>Informasi Utama Posbakum</h2>

        <div className="lp2-features">
          <div className="lp2-feature">
            <div className="mini"></div>
            <p>Cek Lokasi Posbakum</p>
          </div>
          <div className="lp2-feature">
            <div className="mini"></div>
            <p>Dokumen Posbakum</p>
          </div>
          <div className="lp2-feature">
            <div className="mini"></div>
            <p>Data paralegal yang bertugas.</p>
          </div>
          <div className="lp2-feature">
            <div className="mini"></div>
            <p>Pantau kegiatan Posbakum terbaru</p>
          </div>
        </div>

        <button className="btn ghost" type="button">
          Lihat Selengkapnya
        </button>
      </section>

      {/* SECTION BAWAH */}
      <section className="lp2-twoCol">
        <div className="lp2-col">
          <h3>Akses Layanan Hukum</h3>
          <p>
            Informasi mengenai cara memperoleh layanan bantuan hukum bagi
            masyarakat
          </p>
        </div>
        <div className="ph ph-mid"></div>

        <div className="ph ph-mid"></div>
        <div className="lp2-col">
          <h3>Informasi Layanan Posbakum</h3>
          <p>
            Tanyakan apa saja terkait layanan bantuan hukum, dan dapatkan
            penjelasan yang jelas
          </p>
        </div>
      </section>

      <footer className="lp2-footer">
        © {new Date().getFullYear()} Posbankum
      </footer>
    </div>
  );
}
