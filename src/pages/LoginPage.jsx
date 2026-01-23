import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./login.css";

async function getRedirectPathByRole(userId) {
  // Kalau tabel profiles belum ada / belum diisi, fallback ke "/"
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data?.role) return "/admin";

  if (data.role === "admin") return "/admin";
  if (data.role === "paralegal") return "/paralegal";
  return "/admin";
}

export default function LoginPage() {
  const nav = useNavigate();

  const [sessionEmail, setSessionEmail] = useState(""); // kalau sudah login, tampilkan info
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 0 && e.includes("@") && password.length >= 8 && !loading;
  }, [email, password, loading]);

  useEffect(() => {
    // cek session awal
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      setSessionEmail(data?.session?.user?.email ?? "");

      if (userId) {
        const path = await getRedirectPathByRole(userId);
        nav(path, { replace: true });
      }
    })();

    // listen perubahan auth (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSessionEmail(newSession?.user?.email ?? "");
      }
    );

    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const onLogout = async () => {
    setErrorMsg("");
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) setErrorMsg(error.message);
    // setelah logout, tetap di halaman login biar bisa login lagi
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
    if (!userId) {
      nav("/admin", { replace: true });
      return;
    }

    const path = await getRedirectPathByRole(userId);
    nav(path, { replace: true });
  };

  // Kalau sudah ada session, jangan sembunyikan halaman login:
  // Tampilkan info + tombol Keluar (biar user bisa ganti akun)
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

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button
                className="lp-btn"
                type="button"
                onClick={async () => {
                  const { data } = await supabase.auth.getSession();
                  const userId = data?.session?.user?.id;
                  if (!userId) return nav("/admin", { replace: true });
                  const path = await getRedirectPathByRole(userId);
                  nav(path, { replace: true });
                }}
              >
                Ke Dashboard
              </button>

              <button
                className="lp-btn"
                type="button"
                onClick={onLogout}
                disabled={loading}
                style={{ background: "#9ca3af" }}
              >
                {loading ? "Memproses..." : "Keluar (Ganti Akun)"}
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <Link to="/admin" className="lp-link">
                Ke Dashboard
              </Link>
            </div>
          </div>
        </div>

        <p className="lp-foot">© {new Date().getFullYear()} POSBANKUM</p>
      </div>
    );
  }

  // Mode normal (belum login)
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
