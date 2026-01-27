import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./login.css";

async function getRedirectPathByRole(userId) {
  // Ambil role dari profiles
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  // Kalau belum ada profiles -> jangan lempar ke /admin, kasih fallback aman
  if (error) {
    // sering terjadi kalau RLS profiles belum ada policy SELECT untuk user
    console.warn("getRedirectPathByRole error:", error.message);
    return "/"; // atau tampilkan pesan (dibawah kita handle)
  }
  if (!data?.role) return "/";

  const role = String(data.role).toLowerCase();

  if (role === "admin") return "/admin";
  if (role === "posbankum") return "/posbankum";

  // kompatibilitas jika Anda dulu pakai istilah paralegal
  if (role === "paralegal") return "/posbankum";

  return "/";
}

export default function LoginPage() {
  const nav = useNavigate();

  const [sessionEmail, setSessionEmail] = useState("");
  const [dashboardPath, setDashboardPath] = useState("/");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 0 && e.includes("@") && password.length >= 8 && !loading;
  }, [email, password, loading]);

  // cek session awal + redirect otomatis sesuai role
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        const userId = data?.session?.user?.id;
        const userEmail = data?.session?.user?.email ?? "";

        setSessionEmail(userEmail);

        if (userId) {
          const path = await getRedirectPathByRole(userId);
          setDashboardPath(path);

          // kalau role terbaca, langsung redirect
          if (path !== "/") nav(path, { replace: true });
          else {
            // kalau path "/", berarti role belum kebaca / profiles belum ada
            setErrorMsg(
              "Akun ini belum punya role/profiles atau policy belum aktif. Hubungi admin.",
            );
          }
        }
      } catch (e) {
        console.error(e);
        setErrorMsg(e?.message || "Gagal cek session.");
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const userEmail = newSession?.user?.email ?? "";
      setSessionEmail(userEmail);

      const uid = newSession?.user?.id;
      if (!uid) return;

      const path = await getRedirectPathByRole(uid);
      setDashboardPath(path);
    });

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, [nav]);

  const onLogout = async () => {
    setErrorMsg("");
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) setErrorMsg(error.message);
    setSessionEmail("");
    setDashboardPath("/");
  };

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
    const userEmail = data?.user?.email ?? "";
    setSessionEmail(userEmail);

    if (!userId) {
      setErrorMsg("Login berhasil, tapi userId tidak ditemukan. Coba ulang.");
      return;
    }

    const path = await getRedirectPathByRole(userId);
    setDashboardPath(path);

    if (path === "/") {
      setErrorMsg(
        "Login berhasil, tapi role/profiles tidak ditemukan atau policy belum aktif. Hubungi admin.",
      );
      return;
    }

    nav(path, { replace: true });
  };

  // Sudah login: tampilkan info + tombol logout + link sesuai role
  if (sessionEmail) {
    return (
      <div className="lp">
        <div className="lp-card" role="region" aria-label="Sudah Login">
          <div className="lp-left" aria-hidden="true">
            <div className="lp-illu" />
          </div>

          <div className="lp-right">
            <h1 className="lp-title">Kamu sudah login</h1>
            <p className="lp-hint" style={{ marginTop: 6 }}>
              Login sebagai: <b>{sessionEmail}</b>
            </p>

            {errorMsg && (
              <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 10 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button
                className="lp-btn"
                type="button"
                onClick={onLogout}
                disabled={loading}
              >
                {loading ? "Keluar..." : "Keluar"}
              </button>

              <Link to={dashboardPath} className="lp-link">
                Ke Dashboard
              </Link>
            </div>
          </div>
        </div>

        <p className="lp-foot">© {new Date().getFullYear()} POSBANKUM</p>
      </div>
    );
  }

  // Belum login
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
