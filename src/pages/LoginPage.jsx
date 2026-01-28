import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./login.css";

async function getRedirectPathByRole(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("getRedirectPathByRole error:", error.message);
    return "/";
  }
  if (!data?.role) return "/";

  const role = String(data.role).toLowerCase();
  if (role === "admin") return "/admin";
  if (role === "posbankum") return "/posbankum";
  if (role === "paralegal") return "/posbankum";

  return "/";
}

export default function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 0 && e.includes("@") && password.length >= 8 && !loading;
  }, [email, password, loading]);

  // ✅ kalau sudah ada session, langsung redirect (tanpa layar "kamu sudah login")
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        const userId = data?.session?.user?.id;

        if (userId) {
          const path = await getRedirectPathByRole(userId);
          if (!alive) return;

          if (path !== "/") {
            nav(path, { replace: true });
            return;
          }

          // role tidak kebaca / profiles tidak ada / policy belum aktif
          setErrorMsg(
            "Session terdeteksi, tapi role/profiles tidak ditemukan atau policy belum aktif. Hubungi admin.",
          );
          // optional: paksa logout supaya user bisa login ulang dengan bersih
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.error(e);
        setErrorMsg(e?.message || "Gagal cek session.");
      } finally {
        if (alive) setCheckingSession(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [nav]);

  const onLogin = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const userId = data?.user?.id;
    if (!userId) {
      setErrorMsg("Login berhasil, tapi userId tidak ditemukan. Coba ulang.");
      return;
    }

    const path = await getRedirectPathByRole(userId);

    if (path === "/") {
      setErrorMsg(
        "Login berhasil, tapi role/profiles tidak ditemukan atau policy belum aktif. Hubungi admin.",
      );
      // optional: logout supaya tidak nyangkut session tanpa role
      await supabase.auth.signOut();
      return;
    }

    nav(path, { replace: true });
  };

  // Saat cek session awal, cukup tahan UI biar gak “kedip”
  if (checkingSession) {
    return (
      <div className="lp">
        <div className="lp-card" role="region" aria-label="Memuat">
          <div className="lp-left" aria-hidden="true">
            <div className="lp-illu" />
          </div>
          <div className="lp-right">
            <h1 className="lp-title">Memuat...</h1>
            <p className="lp-hint" style={{ marginTop: 6 }}>
              Mengecek session
            </p>
          </div>
        </div>
        <p className="lp-foot">© {new Date().getFullYear()} POSBANKUM</p>
      </div>
    );
  }

  // ✅ Belum login (atau session gagal dibaca) => tampilkan form login biasa
  return (
    <div className="lp">
      <div className="lp-card" role="region" aria-label="Login POSBANKUM">
        <div className="lp-left" aria-hidden="true">
          <div className="lp-illu" />
        </div>

        <div className="lp-right">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <h1 className="lp-title">Masuk</h1>
            <Link to="/" className="lp-link">
              Kembali
            </Link>
          </div>

          <form className="lp-form" onSubmit={onLogin}>
            <label className="lp-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="lp-input"
              type="email"
              autoComplete="email"
              placeholder="Masukkan Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <label className="lp-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="lp-input"
              type="password"
              autoComplete="current-password"
              placeholder="Masukkan Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <div className="lp-row">
              <p className="lp-hint">Gunakan minimal 8 karakter.</p>
              <a
                className="lp-link"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Lupa Password
              </a>
            </div>

            {errorMsg && (
              <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 10 }}>
                {errorMsg}
              </div>
            )}

            <button className="lp-btn" type="submit" disabled={!canSubmit}>
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>

      <p className="lp-foot">© {new Date().getFullYear()} POSBANKUM</p>
    </div>
  );
}
