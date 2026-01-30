import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthLayout from "../components/layouts/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) Login Auth
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) throw loginError;

      const user = loginData?.user;
      if (!user?.id) throw new Error("Login gagal: user tidak ditemukan.");

      // 2) Ambil role dari public.profiles (bukan metadata)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = (profile?.role || "").toString().toLowerCase();

      if (!role) {
        // profil belum dibuat / role kosong
        await supabase.auth.signOut();
        throw new Error(
          "Role tidak valid (profil belum dibuat / role kosong).",
        );
      }

      // 3) Redirect berdasarkan role
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "posbankum") {
        navigate("/posbankum");
      } else {
        await supabase.auth.signOut();
        throw new Error("Role tidak valid");
      }
    } catch (err) {
      setError(err?.message || "Login gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Selamat Datang"
      subtitle="Masuk ke akun Posbankum Anda"
      showIllustration={true}
    >
      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="bg-danger-l bg-opacity-20 border-2 border-danger-2 rounded-xl p-4">
            <p className="text-b3 text-danger-d text-center">{error}</p>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <Input
          label="Kata Sandi"
          type="password"
          name="password"
          placeholder="Masukkan kata sandi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <div className="text-right">
          <button
            type="button"
            onClick={() => navigate("/reset-password")}
            className="text-b3 text-brand-blue-1 hover:text-brand-blue-d transition-colors"
            disabled={loading}
          >
            Lupa kata sandi?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
        >
          {loading ? "Memproses..." : "Masuk"}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-softWhite"></div>
          </div>
          <div className="relative flex justify-center text-b3">
            <span className="bg-white px-4 text-neutral-grey">
              Belum punya akun?
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => navigate("/register")}
          disabled={loading}
        >
          Daftar Sekarang
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-field-2 text-neutral-grey">
          Dengan masuk, Anda menyetujui{" "}
          <a href="/terms" className="text-brand-blue-1 hover:underline">
            Syarat & Ketentuan
          </a>{" "}
          serta{" "}
          <a href="/privacy" className="text-brand-blue-1 hover:underline">
            Kebijakan Privasi
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
