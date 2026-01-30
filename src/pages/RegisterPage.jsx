import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthLayout from "../components/layouts/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error saat user mulai mengetik
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validasi nama lengkap
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Nama lengkap wajib diisi";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Nama lengkap minimal 3 karakter";
    }

    // Validasi email
    if (!formData.email) {
      newErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }

    // Validasi password
    if (!formData.password) {
      newErrors.password = "Kata sandi wajib diisi";
    } else if (formData.password.length < 8) {
      newErrors.password = "Kata sandi minimal 8 karakter";
    }

    // Validasi konfirmasi password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi kata sandi wajib diisi";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Kata sandi tidak cocok";
    }

    return newErrors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validasi form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Sign up dengan Supabase (default role: posbankum)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: "posbankum", // Default role
          },
        },
      });

      if (signUpError) throw signUpError;

      // Redirect ke halaman sukses atau konfirmasi email
      alert("Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.");
      navigate("/login");
    } catch (err) {
      setErrors({ general: err.message || "Pendaftaran gagal. Silakan coba lagi." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Daftar Akun Baru"
      subtitle="Bergabung dengan Posbankum sekarang"
      showIllustration={true}
    >
      <form onSubmit={handleRegister} className="space-y-5">
        {/* General Error Alert */}
        {errors.general && (
          <div className="bg-danger-l bg-opacity-20 border-2 border-danger-2 rounded-xl p-4">
            <p className="text-b3 text-danger-d text-center">{errors.general}</p>
          </div>
        )}

        {/* Full Name Input */}
        <Input
          label="Nama Lengkap"
          type="text"
          name="fullName"
          placeholder="Masukkan nama lengkap"
          value={formData.fullName}
          onChange={handleChange}
          error={errors.fullName}
          required
          disabled={loading}
        />

        {/* Email Input */}
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="nama@email.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
          disabled={loading}
        />

        {/* Password Input */}
        <Input
          label="Kata Sandi"
          type="password"
          name="password"
          placeholder="Minimal 8 karakter"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          helperText={!errors.password ? "Gunakan kombinasi huruf, angka, dan simbol" : ""}
          required
          disabled={loading}
        />

        {/* Confirm Password Input */}
        <Input
          label="Konfirmasi Kata Sandi"
          type="password"
          name="confirmPassword"
          placeholder="Ulangi kata sandi"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          required
          disabled={loading}
        />

        {/* Register Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
          className="mt-6"
        >
          {loading ? "Memproses..." : "Daftar Sekarang"}
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-softWhite"></div>
          </div>
          <div className="relative flex justify-center text-b3">
            <span className="bg-white px-4 text-neutral-grey">
              Sudah punya akun?
            </span>
          </div>
        </div>

        {/* Login Link */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => navigate("/login")}
          disabled={loading}
        >
          Masuk
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-field-2 text-neutral-grey">
          Dengan mendaftar, Anda menyetujui{" "}
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
