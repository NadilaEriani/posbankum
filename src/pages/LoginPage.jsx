import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import brandLogo from "../assets/image 1.png";
import mascotImage from "../assets/burung1.png";

function ArrowLeftIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M13 6L19 12L13 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7L10.94 11.84C11.57 12.28 12.43 12.28 13.06 11.84L20 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.8"
        stroke="currentColor"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function LockIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 10V8C7 5.24 9.24 3 12 3C14.76 3 17 5.24 17 8V10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="11"
        rx="2.8"
        stroke="currentColor"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function EyeIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12C3.73 8.11 7.52 5.5 12 5.5C16.48 5.5 20.27 8.11 22 12C20.27 15.89 16.48 18.5 12 18.5C7.52 18.5 3.73 15.89 2 12Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function EyeOffIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.36 5.36C10.21 5.12 11.09 5 12 5C16.48 5 20.27 7.61 22 11.5C21.34 12.99 20.39 14.31 19.22 15.39"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.61 6.61C4.7 7.81 3.16 9.48 2 11.5C3.73 15.39 7.52 18 12 18C13.83 18 15.54 17.56 17.03 16.78"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanedEmail,
          password,
        });

      if (loginError) {
        throw new Error(
          "Email atau kata sandi salah. Silakan periksa kembali.",
        );
      }

      const user = loginData?.user;
      if (!user?.id) throw new Error("Login gagal: user tidak ditemukan.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = (profile?.role || "").toString().toLowerCase();

      if (!role) {
        await supabase.auth.signOut();
        throw new Error(
          "Role tidak valid (profil belum dibuat / role kosong).",
        );
      }

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
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#EEF2FA_0%,#E9EDF7_58%,#E7E0F2_100%)] px-4 py-6 md:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="inline-flex h-[46px] items-center gap-2 rounded-2xl border border-[#D9DDE7] bg-[#F7F7F8] px-5 text-[14px] font-semibold text-[#4257C8] shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:translate-y-[-1px]"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Kembali ke Beranda
      </button>

      <div className="mx-auto mt-16 flex max-w-[1150px] flex-col items-center justify-center gap-8 lg:flex-row lg:items-start lg:gap-8 xl:mt-20">
        <div className="relative w-full max-w-[560px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#4D5AD0_0%,#6674E4_55%,#7280EA_100%)] px-12 pb-8 pt-12 text-white shadow-[0_35px_80px_rgba(67,76,170,0.28)]">
          <div className="pointer-events-none absolute right-8 top-8 h-16 w-16 rounded-tr-[22px] border-r border-t border-white/18" />
          <div className="pointer-events-none absolute bottom-8 left-8 h-16 w-16 rounded-bl-[22px] border-b border-l border-white/18" />

          <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-sm">
            <div className="flex items-center justify-center overflow-hidden bg-white rounded-full h-11 w-11">
              <img
                src={brandLogo}
                alt="Logo Posbankum"
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-[15px] font-semibold tracking-[0.02em] text-white">
              POSBANKUM
            </span>
          </div>

          <h1 className="text-[44px] font-bold leading-none tracking-[-0.03em] text-white">
            Posbankum
          </h1>

          <p className="mt-6 text-[18px] font-normal leading-[1.5] text-white">
            Platform Bantuan Hukum Terpercaya
          </p>

          <div className="mt-12 flex h-[260px] items-end justify-center overflow-hidden rounded-[24px] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] px-6 pt-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)]">
            <img
              src={mascotImage}
              alt="Maskot Posbankum"
              className="max-h-[280px] w-auto object-contain"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-9">
            {[
              { value: "1,800+", label: "Posbankum" },
              { value: "1K+", label: "Paralegal" },
              { value: "100+", label: "Kasus" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-white/18 bg-white/10 px-3 py-4 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)] backdrop-blur-sm"
              >
                <div className="text-[24px] font-bold leading-none text-white">
                  {item.value}
                </div>
                <div className="mt-2 text-[14px] text-white/78">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[560px] rounded-[30px] bg-[#FCFCFD] px-10 pb-12 pt-10 shadow-[0_32px_80px_rgba(70,72,114,0.22)] md:px-10 lg:min-h-[676px]">
          <div className="text-center">
            <h2 className="text-[30px] font-bold text-[#3442A6]">
              Selamat Datang
            </h2>
            <p className="mt-3 text-[16px] text-[#6D7688]">
              Masuk ke akun Posbankum Anda
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-10">
            {error && (
              <div className="mb-5 rounded-2xl border border-[#F3B3B3] bg-[#FFF1F1] px-4 py-3 text-center text-sm text-[#B42318]">
                {error}
              </div>
            )}

            <div className="mb-5">
              <label className="mb-3 block text-[14px] font-semibold text-[#374151]">
                Email<span className="text-[#E53935]">*</span>
              </label>
              <div className="flex h-[54px] items-center rounded-[16px] border border-[#D9DEE8] bg-white px-4 text-[#98A2B3]">
                <MailIcon className="w-5 h-5 shrink-0" />
                <input
                  type="email"
                  name="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="ml-3 h-full w-full border-none bg-transparent text-[16px] text-[#344054] outline-none placeholder:text-[#98A2B3] disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-3 block text-[14px] font-semibold text-[#374151]">
                Kata Sandi<span className="text-[#E53935]">*</span>
              </label>
              <div className="flex h-[54px] items-center rounded-[16px] border border-[#D9DEE8] bg-white px-4 text-[#98A2B3]">
                <LockIcon className="w-5 h-5 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="ml-3 h-full w-full border-none bg-transparent text-[16px] text-[#344054] outline-none placeholder:text-[#98A2B3] disabled:cursor-not-allowed [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="ml-3 shrink-0 text-[#98A2B3] transition hover:text-[#667085]"
                  disabled={loading}
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6 text-right">
              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                className="text-[14px] font-semibold text-[#4257C8] transition hover:text-[#3442A6]"
                disabled={loading}
              >
                Lupa kata sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[56px] w-full items-center justify-center gap-3 rounded-[16px] bg-[linear-gradient(90deg,#5664D7_0%,#5E6CDD_100%)] text-[17px] font-semibold text-white shadow-[0_12px_24px_rgba(86,100,215,0.34)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>{loading ? "Memproses..." : "Masuk"}</span>
              {!loading && <ArrowRightIcon className="w-5 h-5" />}
            </button>
          </form>

          <div className="mx-auto mt-8 max-w-[390px] text-center text-[13px] leading-6 text-[#6D7688]">
            Dengan masuk, Anda menyetujui{" "}
            <a
              href="/terms"
              className="font-semibold text-[#4257C8] transition hover:underline"
            >
              Syarat & Ketentuan
            </a>{" "}
            serta{" "}
            <a
              href="/privacy"
              className="font-semibold text-[#4257C8] transition hover:underline"
            >
              Kebijakan Privasi
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
