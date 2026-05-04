import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import brandLogo from "../assets/image 1.png";

const STORAGE_KEY = "posbankum-forgot-password-flow";
const RESEND_SECONDS = 60;
const LOGIN_PATH = "/login";
const CODE_EXPIRED_MESSAGE = "Kode sudah kadaluwarsa";

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

function ShieldIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3L19 6V11C19 15.42 16.15 19.4 12 21C7.85 19.4 5 15.42 5 11V6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 8V12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function Spinner({ className = "w-5 h-5" }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
    />
  );
}

function MailBadgeIcon({ className = "w-6 h-6" }) {
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

function CheckBadgeIcon({ className = "w-7 h-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 12L11.5 14.5L16.5 9.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [name, domain] = email.split("@");
  const [domainName, extension] = domain.split(".");
  const safeName =
    name.length <= 2
      ? `${name[0] || ""}*`
      : `${name[0]}${"*".repeat(Math.max(name.length - 2, 1))}${name[name.length - 1]}`;
  const safeDomain =
    !domainName || domainName.length <= 2
      ? `${domainName?.[0] || ""}*`
      : `${domainName[0]}${"*".repeat(Math.max(domainName.length - 2, 1))}${domainName[domainName.length - 1]}`;
  return `${safeName}@${safeDomain}.${extension || "com"}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function checkRegisteredEmail(email) {
  const cleanedEmail = email.trim().toLowerCase();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "is_registered_login_email",
    { p_email: cleanedEmail },
  );

  if (!rpcError && typeof rpcData === "boolean") {
    return rpcData;
  }

  const [posbankumResult, profileResult] = await Promise.all([
    supabase
      .from("posbankum")
      .select("id_posbankum")
      .ilike("email_akun", cleanedEmail)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id")
      .ilike("email_kantor", cleanedEmail)
      .limit(1)
      .maybeSingle(),
  ]);

  if (posbankumResult.error) throw posbankumResult.error;
  if (profileResult.error) throw profileResult.error;

  return Boolean(posbankumResult.data || profileResult.data);
}

function getFriendlyErrorMessage(error, fallback) {
  const message = error?.message?.toLowerCase?.() || "";

  if (
    message.includes("expired") ||
    message.includes("invalid") ||
    message.includes("otp")
  ) {
    return "Kode verifikasi tidak valid atau sudah kedaluwarsa.";
  }

  if (message.includes("rate limit") || error?.status === 429) {
    return "Terlalu banyak permintaan. Coba lagi beberapa saat.";
  }

  if (message.includes("password")) {
    return fallback || "Kata sandi tidak valid.";
  }

  return fallback || error?.message || "Terjadi kesalahan. Silakan coba lagi.";
}

function PasswordCriteriaItem({ ok, text }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
          ok ? "bg-[#28B95A]" : "bg-[#D7DCE5]"
        }`}
      >
        {ok ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 12L10 16L18 8"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 8L16 16"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M16 8L8 16"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <span
        className={`text-[14px] ${ok ? "text-[#23984A]" : "text-[#6C7486]"}`}
      >
        {text}
      </span>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formError, setFormError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [resendIn, setResendIn] = useState(0);
  const [codeExpiresAt, setCodeExpiresAt] = useState(null);

  const otpRefs = useRef([]);
  const autoVerifyRef = useRef("");
  const redirectTimerRef = useRef(null);

  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      match: confirmPassword.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.match;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.email) setEmail(parsed.email);
      if (parsed?.step) setStep(parsed.step);

      const storedExpiresAt =
        parsed?.codeExpiresAt || parsed?.resendUntil || null;

      if (storedExpiresAt) {
        const diff = Math.max(
          0,
          Math.ceil((storedExpiresAt - Date.now()) / 1000),
        );
        setCodeExpiresAt(storedExpiresAt);
        setResendIn(diff);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const resendUntil = resendIn > 0 ? Date.now() + resendIn * 1000 : null;

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email,
        step,
        resendUntil,
        codeExpiresAt,
      }),
    );
  }, [email, step, resendIn, codeExpiresAt]);

  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    const joinedOtp = otp.join("");
    if (step !== "otp") return;
    if (joinedOtp.length !== 6) return;
    if (verifyingOtp) return;
    if (autoVerifyRef.current === joinedOtp) return;

    autoVerifyRef.current = joinedOtp;
    handleVerifyOtp(joinedOtp);
  }, [otp, step, verifyingOtp]);

  useEffect(() => {
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const errorCode = params.get("error_code");
    const error = params.get("error");

    if (errorCode || error) {
      setStep("email");
      setFormError(
        "Link reset lama tidak digunakan pada flow ini. Silakan masukkan email lalu gunakan kode OTP 6 digit dari email.",
      );
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const persistResetState = (
    nextStep,
    nextResend = resendIn,
    nextEmail = email,
    nextCodeExpiresAt = codeExpiresAt,
  ) => {
    const resendUntil = nextResend > 0 ? Date.now() + nextResend * 1000 : null;

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email: nextEmail,
        step: nextStep,
        resendUntil,
        codeExpiresAt: nextCodeExpiresAt,
      }),
    );
  };

  const clearResetState = () => {
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const isOtpExpired = () => {
    return !codeExpiresAt || Date.now() > codeExpiresAt;
  };

  const goToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    clearResetState();
    navigate(LOGIN_PATH);
  };

  const handleSendCode = async (e) => {
    e?.preventDefault?.();
    setFormError("");
    setEmailError("");
    setOtpError("");
    setPasswordError("");

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail) {
      setEmailError("Email tidak boleh kosong");
      return;
    }

    if (!isValidEmail(cleanedEmail)) {
      setEmailError("Format email tidak valid");
      return;
    }

    setSendingEmail(true);

    try {
      const isRegistered = await checkRegisteredEmail(cleanedEmail);

      if (!isRegistered) {
        setEmailError("Email tidak terdaftar sebagai akun pengguna.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail);

      if (error) throw error;

      const nextExpiresAt = Date.now() + RESEND_SECONDS * 1000;

      setEmail(cleanedEmail);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setResendIn(RESEND_SECONDS);
      setCodeExpiresAt(nextExpiresAt);
      autoVerifyRef.current = "";
      persistResetState("otp", RESEND_SECONDS, cleanedEmail, nextExpiresAt);
    } catch (error) {
      setFormError(
        getFriendlyErrorMessage(
          error,
          "Gagal mengirim kode verifikasi. Silakan coba lagi.",
        ),
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    setOtpError("");

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const nextOtp = [...otp];
        nextOtp[index] = "";
        setOtp(nextOtp);
        autoVerifyRef.current = "";
        return;
      }

      if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    e.preventDefault();
    const nextOtp = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, idx) => {
      nextOtp[idx] = char;
    });
    setOtp(nextOtp);
    autoVerifyRef.current = "";
  };

  const handleVerifyOtp = async (codeArg) => {
    const token = codeArg || otp.join("");

    if (token.length !== 6) return;

    setOtpError("");
    setFormError("");

    if (isOtpExpired()) {
      setOtpError(CODE_EXPIRED_MESSAGE);
      setOtp(["", "", "", "", "", ""]);
      setResendIn(0);
      setCodeExpiresAt(null);
      autoVerifyRef.current = "";
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
      return;
    }

    setVerifyingOtp(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "recovery",
      });

      if (error) throw error;

      setStep("password");
      setResendIn(0);
      setCodeExpiresAt(null);
      persistResetState("password", 0, email.trim().toLowerCase(), null);
    } catch (error) {
      setOtpError(
        getFriendlyErrorMessage(
          error,
          "Kode verifikasi tidak valid atau sudah kedaluwarsa.",
        ),
      );
      setOtp(["", "", "", "", "", ""]);
      autoVerifyRef.current = "";
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || sendingEmail) return;

    setSendingEmail(true);
    setOtpError("");
    setFormError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
      );

      if (error) throw error;

      const nextExpiresAt = Date.now() + RESEND_SECONDS * 1000;

      setOtp(["", "", "", "", "", ""]);
      setResendIn(RESEND_SECONDS);
      setCodeExpiresAt(nextExpiresAt);
      autoVerifyRef.current = "";
      persistResetState(
        "otp",
        RESEND_SECONDS,
        email.trim().toLowerCase(),
        nextExpiresAt,
      );

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
    } catch (error) {
      setOtpError(
        getFriendlyErrorMessage(error, "Gagal mengirim ulang kode verifikasi."),
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setFormError("");

    if (!isPasswordValid) {
      setPasswordError("Kata sandi belum memenuhi seluruh kriteria.");
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setStep("success");
      clearResetState();

      redirectTimerRef.current = setTimeout(async () => {
        await goToLogin();
      }, 5000);
    } catch (error) {
      setPasswordError(
        getFriendlyErrorMessage(
          error,
          "Gagal mengubah kata sandi. Silakan coba lagi.",
        ),
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleBack = () => {
    setFormError("");
    setEmailError("");
    setOtpError("");
    setPasswordError("");

    if (step === "email") {
      navigate(LOGIN_PATH);
      return;
    }

    if (step === "otp") {
      setStep("email");
      setCodeExpiresAt(null);
      persistResetState("email", 0, email, null);
      return;
    }

    if (step === "password") {
      setStep("otp");
      persistResetState("otp", resendIn, email, codeExpiresAt);
      return;
    }

    goToLogin();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#EEF2FA_0%,#EAF0F8_62%,#E6EEF1_100%)] px-4 py-6 md:px-6 lg:px-8">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex h-[46px] items-center gap-2 rounded-2xl border border-[#D9DDE7] bg-[#F7F7F8] px-5 text-[14px] font-semibold text-[#1F5AC8] shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:translate-y-[-1px]"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        {step === "success" ? "Kembali" : "Kembali ke Login"}
      </button>

      <div className="mx-auto flex min-h-[calc(100vh-88px)] items-center justify-center">
        <div className="w-full max-w-[448px] rounded-[28px] bg-[#FCFCFD] px-10 pb-10 pt-8 shadow-[0_28px_70px_rgba(67,76,170,0.20)]">
          {step === "email" && (
            <>
              <div className="flex justify-center mb-7">
                <img
                  src={brandLogo}
                  alt="Logo Posbankum"
                  className="h-[94px] w-[104px] object-contain"
                />
              </div>

              <div className="text-center">
                <h1 className="text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#101828]">
                  Lupa Kata
                  <br />
                  Sandi?
                </h1>
                <p className="mx-auto mt-5 max-w-[290px] text-[15px] leading-8 text-[#5F6B7A]">
                  Masukkan email Anda untuk menerima kode verifikasi
                </p>
              </div>

              <form onSubmit={handleSendCode} className="mt-10">
                <label className="mb-3 block text-[14px] font-semibold text-[#374151]">
                  Email
                </label>

                <div className="flex h-[56px] items-center rounded-[16px] border border-[#C9D0DB] bg-white px-4 text-[#98A2B3]">
                  <MailIcon className="w-5 h-5 shrink-0" />
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                      setFormError("");
                    }}
                    className="ml-3 h-full w-full border-none bg-transparent text-[16px] text-[#344054] outline-none placeholder:text-[#98A2B3]"
                    disabled={sendingEmail}
                  />
                </div>

                {(emailError || formError) && (
                  <div className="mt-6 flex items-center gap-3 rounded-[16px] border border-[#F4B5B5] bg-[#FFF3F3] px-4 py-4 text-[#DC2626]">
                    <AlertCircleIcon className="w-5 h-5 shrink-0" />
                    <p className="text-[14px] font-medium">
                      {emailError || formError}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sendingEmail}
                  className={`mt-6 flex h-[52px] w-full items-center justify-center gap-3 rounded-[16px] text-[17px] font-semibold text-white shadow-[0_12px_24px_rgba(28,80,194,0.28)] transition ${
                    sendingEmail
                      ? "bg-[#88A4DA]"
                      : "bg-[linear-gradient(180deg,#235BCA_0%,#1E51B3_100%)] hover:translate-y-[-1px]"
                  }`}
                >
                  {sendingEmail ? (
                    <>
                      <Spinner className="w-5 h-5" />
                      Kirim Kode Verifikasi
                    </>
                  ) : (
                    <>
                      Kirim Kode Verifikasi
                      <ArrowRightIcon className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="mt-7 rounded-[18px] border border-[#9DBEFD] bg-[#EAF1FF] px-5 py-5">
                  <div className="flex items-start gap-3">
                    <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#225AD3]" />
                    <div>
                      <h3 className="text-[14px] font-bold text-[#3B4658]">
                        Keamanan Data Anda
                      </h3>
                      <p className="mt-2 text-[15px] leading-8 text-[#2159D1]">
                        Kode verifikasi akan dikirim ke email Anda dan berlaku
                        selama 60 detik.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="flex justify-center mb-7">
                <div className="flex h-[80px] w-[80px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#235BCA_0%,#1E51B3_100%)] text-white shadow-[0_10px_22px_rgba(28,80,194,0.28)]">
                  <MailBadgeIcon className="w-10 h-10" />
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-[18px] font-semibold text-[#252F3F]">
                  Masukkan Kode Verifikasi
                </h1>
                <p className="mx-auto mt-3 max-w-[320px] text-[15px] leading-8 text-[#5F6B7A]">
                  Kode verifikasi sudah dikirim ke alamat email
                  <br />
                  <span className="font-bold text-[#3B4658]">
                    {maskEmail(email)}
                  </span>
                </p>
              </div>

              <div className="mt-10">
                <div
                  className="flex items-center justify-center gap-3"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="h-[64px] w-[56px] rounded-[16px] border border-[#2058C7] bg-[#EFF4FA] text-center text-[18px] font-bold text-[#1D4EA8] outline-none"
                      disabled={verifyingOtp}
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="mt-5 text-center text-[14px] font-medium text-[#DC2626]">
                    {otpError}
                  </div>
                )}

                <button
                  type="button"
                  disabled
                  className="mt-7 flex h-[52px] w-full items-center justify-center gap-3 rounded-[16px] bg-[#88A4DA] text-[17px] font-semibold text-white"
                >
                  {verifyingOtp ? (
                    <>
                      <Spinner className="w-5 h-5" />
                      Memverifikasi...
                    </>
                  ) : (
                    "Masukkan 6 digit kode"
                  )}
                </button>

                <div className="mt-7 text-center text-[15px] text-[#4B5565]">
                  {resendIn > 0 ? (
                    <>
                      Kirim ulang kode dalam{" "}
                      <span className="font-bold text-[#2159D1]">
                        {resendIn}s
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-semibold text-[#2159D1] hover:underline"
                      disabled={sendingEmail}
                    >
                      Kirim ulang kode
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <div className="flex justify-center mb-6">
                <img
                  src={brandLogo}
                  alt="Logo Posbankum"
                  className="h-[94px] w-[104px] object-contain"
                />
              </div>

              <div className="text-center">
                <h1 className="text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#101828]">
                  Buat Kata Sandi
                  <br />
                  Baru
                </h1>
                <p className="mx-auto mt-5 max-w-[300px] text-[15px] leading-8 text-[#5F6B7A]">
                  Kata sandi baru Anda harus berbeda dari kata sandi sebelumnya
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="mt-9">
                <div>
                  <label className="mb-3 block text-[14px] font-semibold text-[#374151]">
                    Kata Sandi Baru
                  </label>

                  <div className="flex h-[56px] items-center rounded-[16px] border border-[#C9D0DB] bg-white px-4 text-[#98A2B3]">
                    <LockIcon className="w-5 h-5 shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Masukkan kata sandi baru"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError("");
                      }}
                      className="ml-3 h-full w-full border-none bg-transparent text-[16px] text-[#344054] outline-none placeholder:text-[#98A2B3] [&::-ms-clear]:hidden [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:invisible [&::-webkit-credentials-auto-fill-button]:invisible"
                      disabled={updatingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-[#98A2B3]"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-3 block text-[14px] font-semibold text-[#374151]">
                    Konfirmasi Kata Sandi
                  </label>

                  <div className="flex h-[56px] items-center rounded-[16px] border border-[#C9D0DB] bg-white px-4 text-[#98A2B3]">
                    <LockIcon className="w-5 h-5 shrink-0" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Konfirmasi kata sandi baru"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError("");
                      }}
                      className="ml-3 h-full w-full border-none bg-transparent text-[16px] text-[#344054] outline-none placeholder:text-[#98A2B3] [&::-ms-clear]:hidden [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:invisible [&::-webkit-credentials-auto-fill-button]:invisible"
                      disabled={updatingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="text-[#98A2B3]"
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-[18px] border border-[#D8DDE7] bg-[#F8FAFC] px-5 py-5">
                  <h3 className="text-[14px] font-bold text-[#3B4658]">
                    Kriteria Kata Sandi:
                  </h3>

                  <div className="mt-4 space-y-3">
                    <PasswordCriteriaItem
                      ok={passwordChecks.minLength}
                      text="Minimal 8 karakter"
                    />
                    <PasswordCriteriaItem
                      ok={passwordChecks.upper}
                      text="Minimal 1 huruf besar (A-Z)"
                    />
                    <PasswordCriteriaItem
                      ok={passwordChecks.lower}
                      text="Minimal 1 huruf kecil (a-z)"
                    />
                    <PasswordCriteriaItem
                      ok={passwordChecks.number}
                      text="Minimal 1 angka (0-9)"
                    />
                    {confirmPassword.length > 0 && (
                      <PasswordCriteriaItem
                        ok={passwordChecks.match}
                        text="Kata sandi cocok"
                      />
                    )}
                  </div>
                </div>

                {passwordError && (
                  <div className="mt-5 rounded-[16px] border border-[#F4B5B5] bg-[#FFF3F3] px-4 py-4 text-[14px] font-medium text-[#DC2626]">
                    {passwordError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={updatingPassword || !isPasswordValid}
                  className={`mt-6 flex h-[52px] w-full items-center justify-center gap-3 rounded-[16px] text-[17px] font-semibold text-white shadow-[0_12px_24px_rgba(28,80,194,0.22)] ${
                    updatingPassword || !isPasswordValid
                      ? "bg-[#88A4DA]"
                      : "bg-[linear-gradient(180deg,#235BCA_0%,#1E51B3_100%)] hover:translate-y-[-1px]"
                  }`}
                >
                  {updatingPassword ? (
                    <>
                      <Spinner className="w-5 h-5" />
                      Mengubah...
                    </>
                  ) : (
                    <>
                      Ubah Kata Sandi
                      <ArrowRightIcon className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="mt-7 rounded-[18px] border border-[#9DBEFD] bg-[#EAF1FF] px-5 py-5">
                  <div className="flex items-start gap-3">
                    <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#225AD3]" />
                    <div>
                      <h3 className="text-[14px] font-bold text-[#3B4658]">
                        Tips Keamanan
                      </h3>
                      <p className="mt-2 text-[15px] leading-8 text-[#2159D1]">
                        Gunakan kombinasi huruf, angka, dan karakter khusus
                        untuk keamanan maksimal.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}

          {step === "success" && (
            <>
              <div className="flex justify-center mb-8">
                <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#235BCA_0%,#1E51B3_100%)] text-white shadow-[0_16px_28px_rgba(28,80,194,0.28)]">
                  <CheckBadgeIcon className="w-12 h-12" />
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-[36px] font-extrabold leading-[1.12] tracking-[-0.03em] text-[#101828]">
                  Kata Sandi Berhasil
                  <br />
                  Diubah!
                </h1>
                <p className="mx-auto mt-5 max-w-[320px] text-[15px] leading-8 text-[#5F6B7A]">
                  Kata sandi Anda telah berhasil diperbarui. Anda akan dialihkan
                  ke halaman login dalam beberapa detik.
                </p>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="mt-6 text-[16px] font-semibold text-[#1F5AC8] hover:underline"
                >
                  Langsung ke Login →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
