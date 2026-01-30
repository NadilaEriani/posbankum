import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// Import gambar burung
import burung1 from "../assets/burung1.png";
import burung2 from "../assets/burung2.png";
import burung3 from "../assets/burung3.png";
import burung4 from "../assets/burung4.png";
import burung5 from "../assets/burung5.png";
import burung7 from "../assets/burung7.png";
import burung9 from "../assets/burung9.png";
import logo from "../assets/logo.png";
// ====== IDENTITAS KEMENKUM RIAU ======
const ORG_SHORT = "Kemenkum Riau";
const ORG_FULL = "Kantor Wilayah Kementerian Hukum Riau";
const ORG_ADDR =
  "Jl. Jend. Sudirman No.233, Sumahilang, Kec. Pekanbaru Kota, Kota Pekanbaru, Riau 28111";
const ORG_EMAIL = "humaskumriau@gmail.com";
const ORG_WA_DISPLAY = "0811-6904-422";
const ORG_WA_TEL = "+628116904422"; // untuk href tel:
const ORG_HOURS_DAYS = "Senin - Jumat";
const ORG_HOURS_TIME = "08:00 - 16:00 WIB";

async function getRedirectPathByRole(userId) {
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

export default function LandingPage() {
  const nav = useNavigate();
  const [sessionEmail, setSessionEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      setSessionEmail(user?.email ?? "");

      if (user?.id) {
        const path = await getRedirectPathByRole(user.id);
        nav(path, { replace: true });
      }
    })();

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
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question:
        "Apa itu Pos Bantuan Hukum dan siapa yang berhak mendapatkan layanannya?",
      answer:
        "Pos Bantuan Hukum (Posbankum) adalah layanan bantuan hukum gratis yang disediakan melalui {ORG_FULL} untuk masyarakat kurang mampu. Layanan ini mencakup konsultasi hukum, pendampingan hukum, dan bantuan litigasi di pengadilan. Setiap warga negara Indonesia yang memenuhi kriteria ekonomi tertentu berhak mendapatkan layanan ini secara gratis.",
    },
    {
      question:
        "Bagaimana cara menghubungi lokasi Posbankum di kelurahan saya?",
      answer:
        "Anda dapat menemukan lokasi Posbankum terdekat melalui peta interaktif di website ini atau menghubungi kantor kelurahan/desa setempat. Setiap Posbankum memiliki paralegal terlatih yang siap membantu Anda dengan jadwal layanan yang telah ditentukan. Informasi kontak lengkap juga tersedia di halaman detail setiap Posbankum.",
    },
    {
      question: "Apa saja tugas paralegal di Posbankum?",
      answer:
        "Paralegal Posbankum bertugas memberikan konsultasi hukum awal, membantu menyusun dokumen hukum sederhana, memberikan informasi tentang hak-hak hukum masyarakat, melakukan mediasi perselisihan ringan, dan menghubungkan masyarakat dengan advokat atau lembaga bantuan hukum jika diperlukan pendampingan lebih lanjut.",
    },
    {
      question:
        "Apa saja dokumen yang dibutuhkan untuk mendapatkan bantuan di Posbankum?",
      answer:
        "Dokumen yang biasanya diperlukan meliputi: KTP asli dan fotokopi, Kartu Keluarga, surat keterangan tidak mampu dari kelurahan (jika ada), dan dokumen terkait permasalahan hukum Anda seperti surat gugatan, kontrak, atau dokumen lain yang relevan. Untuk kasus tertentu, mungkin diperlukan dokumen tambahan yang akan diinformasikan oleh paralegal.",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-white">
      {/* ========== TOP BAR ========== */}
      <div className="bg-gradient-to-r from-brand-blue-d to-brand-blue-s2 py-2 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-neutral-white text-field-2">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 hover:text-brand-yellow-2 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              {ORG_EMAIL}
            </span>
            <span className="flex items-center gap-2 hover:text-brand-yellow-2 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              {ORG_WA_DISPLAY}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1 rounded hover:bg-white/10 transition-colors font-medium">
              ID
            </button>
            <span className="text-neutral-lGrey">|</span>
            <button className="px-3 py-1 rounded hover:bg-white/10 transition-colors">
              EN
            </button>
          </div>
        </div>
      </div>

      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-neutral-softWhite">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue-1 to-brand-blue-2 flex items-center justify-center shadow-soft group-hover:shadow-md transition-all p-2">
              <img
                src={logo}
                alt="Logo Posbankum"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-h4 text-brand-blue-d font-bold block leading-tight">
                POSBANKUM
              </span>
              <span className="text-field-2 text-neutral-grey">
                {ORG_SHORT}
              </span>
            </div>
          </Link>

          {!sessionEmail ? (
            <Link
              className="px-6 py-2.5 text-btn-md font-semibold rounded-xl bg-brand-blue-1 text-white hover:bg-brand-blue-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              to="/login"
            >
              Masuk
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <button
                className="px-6 py-2.5 text-btn-md font-semibold rounded-xl bg-brand-blue-1 text-white hover:bg-brand-blue-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={goDashboard}
                disabled={loading}
              >
                {loading ? "..." : "Dashboard"}
              </button>

              <button
                className="px-6 py-2.5 text-btn-md font-semibold rounded-xl border-2 border-danger-1 text-danger-1 hover:bg-danger-1 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={onLogout}
                disabled={loading}
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ========== HERO SECTION ========== */}
      <section className="relative py-20 lg:py-28 px-6 lg:px-12 bg-gradient-to-br from-neutral-white via-secondary-3/20 to-neutral-white overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-blue-2 opacity-[0.02] rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary-2 opacity-[0.03] rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
            {/* Hero Image */}
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-1/10 to-brand-blue-2/10 rounded-2xl blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-brand-blue-d to-brand-blue-1 rounded-2xl p-12 shadow-soft">
                  <div className="text-center">
                    <div className="mb-6 flex justify-center">
                      <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center shadow-soft p-4">
                        <img
                          src={burung5}
                          alt="Maskot Posbankum"
                          className="w-[170%] h-[170%] object-contain relative translate-y-9 translate-x-0"
                        />
                      </div>
                    </div>
                    <h3 className="text-h3 text-white font-bold mb-2">
                      Maskot Posbankum
                    </h3>
                    <p className="text-b2 text-white/90">
                      Siap Membantu Masyarakat
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 bg-brand-blue-1/10 text-brand-blue-1 text-field-1 font-semibold rounded-xl border border-brand-blue-1/20">
                <span>🇮🇩</span>
                <span>Layanan {ORG_FULL}</span>
              </div>
              <h1 className="text-h1 text-brand-blue-d font-bold mb-6 leading-tight">
                Ayo Cek Data Posbankum di Wilayah Anda
              </h1>
              <p className="text-b1 text-neutral-dGrey mb-8 leading-relaxed">
                Temukan informasi lengkap Pos Bantuan Hukum (Posbankum) di desa
                atau kelurahan Anda. Akses data paralegal aktif, dokumen hukum,
                hingga kegiatan Posbankum terbaru dengan mudah dan cepat.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <button className="px-8 py-4 text-btn font-semibold rounded-xl bg-brand-blue-1 text-white hover:bg-brand-blue-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 group">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Lihat Posbankum Terdekat
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button className="px-8 py-4 text-btn font-semibold rounded-xl border-2 border-brand-blue-1 text-brand-blue-1 hover:bg-brand-blue-1 hover:text-white transition-all">
                  Pelajari Lebih Lanjut
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { num: "5,957+", label: "Posbankum Aktif" },
                  { num: "10,000+", label: "Paralegal Terlatih" },
                  { num: "100K+", label: "Kasus Ditangani" },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="text-center p-4 rounded-xl bg-white border border-neutral-softWhite shadow-sm"
                  >
                    <div className="text-h3 text-brand-blue-1 font-bold mb-1">
                      {stat.num}
                    </div>
                    <div className="text-field-2 text-neutral-grey">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Bottom Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                img: burung1,
                title: "Akses Mudah & Cepat",
                desc: "Layanan bantuan hukum yang mudah diakses kapan saja",
              },
              {
                img: burung3,
                title: "Paralegal Berpengalaman",
                desc: "Didampingi paralegal terlatih dan bersertifikat",
              },
              {
                img: burung7,
                title: "Jangkauan Luas",
                desc: "Tersebar di seluruh desa/kelurahan di Indonesia",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-neutral-softWhite shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-blue-1 to-brand-blue-2 flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform p-2.5">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-b1 font-bold text-brand-blue-d mb-2 group-hover:text-brand-blue-1 transition-colors">
                  {item.title}
                </h3>
                <p className="text-b3 text-neutral-grey leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== INFORMASI UTAMA SECTION ========== */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-5 py-2 bg-brand-blue-1/10 text-brand-blue-1 text-field-1 font-semibold rounded-xl border border-brand-blue-1/20">
              LAYANAN TERPADU
            </div>
            <h2 className="text-h2 text-brand-blue-d font-bold mb-4">
              Informasi Utama Posbankum
            </h2>
            <p className="text-b1 text-neutral-dGrey max-w-2xl mx-auto leading-relaxed">
              Dapatkan informasi lengkap dan akurat tentang layanan bantuan
              hukum di wilayah Anda melalui platform terintegrasi {ORG_FULL}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                img: burung1,
                title: "Cek Lokasi Posbankum",
                desc: "Temukan Posbankum terdekat dengan peta interaktif",
                color: "from-brand-blue-1 to-brand-blue-2",
              },
              {
                img: burung2,
                title: "Dokumen Posbankum",
                desc: "Akses dokumen dan formulir bantuan hukum resmi",
                color: "from-danger-1 to-danger-2",
              },
              {
                img: burung3,
                title: "Data Paralegal",
                desc: "Lihat profil paralegal bersertifikat yang bertugas",
                color: "from-success-d to-success-2",
              },
              {
                img: burung4,
                title: "Kegiatan Terbaru",
                desc: "Pantau program dan kegiatan Posbankum real-time",
                color: "from-secondary-1 to-secondary-2",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-neutral-softWhite shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group h-full"
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform p-3`}
                >
                  <img
                    src={feature.img}
                    alt={feature.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-b1 font-bold text-brand-blue-d mb-3 group-hover:text-brand-blue-1 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-b3 text-neutral-grey leading-relaxed mb-4">
                  {feature.desc}
                </p>
                <button className="text-field-1 text-brand-blue-1 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Lihat Detail
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button className="px-10 py-4 text-btn-md font-semibold rounded-xl border-2 border-brand-blue-1 text-brand-blue-1 hover:bg-brand-blue-1 hover:text-white transition-all shadow-sm hover:shadow-md">
              Lihat Semua Layanan →
            </button>
          </div>
        </div>
      </section>

      {/* ========== TWO COLUMN SECTIONS ========== */}
      <section className="py-24 px-6 lg:px-12 bg-gradient-to-br from-neutral-white to-secondary-3/10">
        <div className="max-w-7xl mx-auto space-y-24">
          {/* Section 1 - Akses Layanan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-block mb-4 px-4 py-2 bg-success-2/10 text-success-d text-field-2 font-semibold rounded-xl border border-success-2/20">
                LAYANAN MASYARAKAT
              </div>
              <h3 className="text-h3 text-brand-blue-d font-bold mb-5 leading-tight">
                Akses Layanan Hukum Gratis
              </h3>
              <p className="text-b1 text-neutral-dGrey leading-relaxed mb-6">
                {ORG_FULL} menyediakan akses bantuan hukum gratis untuk
                masyarakat kurang mampu. Posbankum hadir di setiap kelurahan
                untuk memastikan keadilan dapat diakses oleh seluruh lapisan
                masyarakat.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Konsultasi hukum gratis",
                  "Pendampingan di pengadilan",
                  "Mediasi & penyelesaian sengketa",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-b2 text-neutral-dGrey"
                  >
                    <div className="w-6 h-6 rounded-lg bg-success-2/10 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-success-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="px-8 py-4 text-btn-md font-semibold rounded-xl bg-gradient-to-r from-success-d to-success-2 text-white hover:from-success-s hover:to-success-d transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                Ajukan Bantuan Sekarang →
              </button>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-success-2/10 to-success-1/10 rounded-2xl blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-success-d to-success-2 rounded-2xl h-96 shadow-soft flex items-center justify-center overflow-hidden p-8">
                  <img
                    src={burung7}
                    alt="Layanan Hukum"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 - Informasi Layanan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-danger-1/10 to-danger-2/10 rounded-2xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-danger-1 to-danger-2 rounded-2xl h-96 shadow-soft flex items-center justify-center overflow-hidden p-8">
                <img
                  src={burung9}
                  alt="Informasi Layanan"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <div className="inline-block mb-4 px-4 py-2 bg-danger-1/10 text-danger-1 text-field-2 font-semibold rounded-xl border border-danger-1/20">
                INFORMASI & EDUKASI
              </div>
              <h3 className="text-h3 text-brand-blue-d font-bold mb-5 leading-tight">
                Informasi Layanan Posbankum
              </h3>
              <p className="text-b1 text-neutral-dGrey leading-relaxed mb-6">
                Dapatkan penjelasan lengkap tentang prosedur bantuan hukum,
                hak-hak Anda sebagai warga negara, dan informasi hukum terkini
                dari paralegal profesional yang tersebar di seluruh Indonesia.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  "Panduan Lengkap",
                  "FAQ Terpercaya",
                  "Video Tutorial",
                  "Download Formulir",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl p-4 border border-neutral-softWhite shadow-sm hover:border-danger-1/30 hover:shadow-md transition-all"
                  >
                    <span className="text-b3 text-brand-blue-d font-semibold">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <button className="px-8 py-4 text-btn-md font-semibold rounded-xl bg-gradient-to-r from-danger-1 to-danger-2 text-white hover:from-danger-d hover:to-danger-1 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                Hubungi Paralegal →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== MAPS SECTION ========== */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4 px-5 py-2 bg-brand-blue-1/10 text-brand-blue-1 text-field-1 font-semibold rounded-xl border border-brand-blue-1/20">
              <span>🗺️</span>
              <span>PETA LOKASI</span>
            </div>
            <h2 className="text-h2 text-brand-blue-d font-bold mb-4">
              Lokasi Posbankum Terdekat
            </h2>
            <p className="text-b1 text-neutral-dGrey max-w-2xl mx-auto leading-relaxed">
              Temukan Pos Bantuan Hukum di wilayah Anda melalui peta interaktif
              yang terintegrasi dengan data real-time {ORG_SHORT}
            </p>
          </div>

          {/* Maps Container */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-2/5 to-brand-blue-1/5 rounded-2xl blur-2xl"></div>
            <div className="relative bg-gradient-to-br from-secondary-3 to-secondary-2 rounded-2xl h-[480px] border border-white/50 shadow-soft flex items-center justify-center overflow-hidden">
              <div className="text-center p-12">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white shadow-soft flex items-center justify-center p-4">
                  <img
                    src={burung5}
                    alt="Peta"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-h3 text-brand-blue-d font-bold mb-3">
                  Peta Interaktif Posbankum
                </h3>
                <p className="text-b2 text-neutral-dGrey mb-6 max-w-md mx-auto leading-relaxed">
                  Integrasi dengan Google Maps API untuk menampilkan lokasi
                  seluruh Posbankum secara real-time
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue-d text-white rounded-xl font-semibold shadow-sm">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  5,957 Posbankum Terdaftar
                </div>
              </div>
            </div>
          </div>

          {/* Location Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Posbankum Kelurahan Simpang Baru",
                address: "Jl. Sudirman No. 123, Pekanbaru",
                phone: "(0761) 123-456",
                status: "Aktif",
                paralegal: "3 Paralegal",
                img: burung1,
              },
              {
                name: "Posbankum Kelurahan Sail",
                address: "Jl. Jend. Sudirman No. 45, Pekanbaru",
                phone: "(0761) 234-567",
                status: "Aktif",
                paralegal: "4 Paralegal",
                img: burung3,
              },
              {
                name: "Posbankum Kelurahan Labuh Baru",
                address: "Jl. Garuda Sakti KM 3, Pekanbaru",
                phone: "(0761) 345-678",
                status: "Aktif",
                paralegal: "2 Paralegal",
                img: burung7,
              },
            ].map((location, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-neutral-softWhite shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-danger-1 to-danger-2 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform p-2.5">
                    <img
                      src={location.img}
                      alt={location.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-b1 font-bold text-brand-blue-d mb-2 group-hover:text-brand-blue-1 transition-colors leading-snug">
                      {location.name}
                    </h4>
                  </div>
                </div>
                <div className="space-y-2 mb-5">
                  <p className="text-b3 text-neutral-grey flex items-start gap-2">
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="flex-1">{location.address}</span>
                  </p>
                  <p className="text-b3 text-neutral-grey flex items-center gap-2">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    {location.phone}
                  </p>
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-block px-3 py-1.5 text-field-2 font-semibold rounded-lg bg-success-l/20 text-success-d border border-success-2/20">
                    ✓ {location.status}
                  </span>
                  <span className="text-field-2 text-neutral-grey flex items-center gap-1.5 font-medium">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    {location.paralegal}
                  </span>
                </div>
                <button className="w-full px-5 py-3 rounded-xl bg-brand-blue-d text-white font-semibold hover:bg-brand-blue-s2 transition-all flex items-center justify-center gap-2 text-btn-sm shadow-sm hover:shadow-md">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Lihat Rute
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section className="py-24 px-6 lg:px-12 bg-gradient-to-br from-neutral-white to-secondary-3/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4 px-5 py-2 bg-danger-1/10 text-danger-1 text-field-1 font-semibold rounded-xl border border-danger-1/20">
              <span>❓</span>
              <span>FAQ</span>
            </div>
            <h2 className="text-h2 text-brand-blue-d font-bold mb-4">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-b1 text-neutral-dGrey leading-relaxed">
              Temukan jawaban atas pertanyaan umum seputar layanan Posbankum dan
              bantuan hukum gratis
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-neutral-softWhite shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-start justify-between p-6 text-left hover:bg-secondary-3/5 transition-all group"
                >
                  <div className="flex items-start gap-4 flex-1 pr-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        openFaq === index
                          ? "bg-brand-blue-1 text-white"
                          : "bg-brand-blue-1/10 text-brand-blue-1 group-hover:bg-brand-blue-1/20"
                      }`}
                    >
                      {openFaq === index ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-b1 font-bold text-brand-blue-d group-hover:text-brand-blue-1 transition-colors">
                      {faq.question}
                    </span>
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === index ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <div className="px-6 pb-6 pl-[72px] text-b2 text-neutral-dGrey leading-relaxed border-t border-neutral-softWhite pt-5">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-b2 text-neutral-grey mb-6">
              Masih ada pertanyaan lain?
            </p>
            <button className="px-8 py-4 text-btn-md font-semibold rounded-xl bg-brand-blue-1 text-white hover:bg-brand-blue-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
              Hubungi Layanan Bantuan →
            </button>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="relative bg-gradient-to-br from-brand-blue-d to-brand-blue-s2 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-yellow-2 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-blue-2 rounded-full blur-3xl"></div>
        </div>

        <div className="h-1 bg-gradient-to-r from-danger-1 via-brand-yellow-2 to-danger-1"></div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Column 1: Brand */}
            <div>
              <div className="flex items-center gap-3 mb-6 group">
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-soft group-hover:shadow-md transition-all p-2.5">
                  <img
                    src={burung5}
                    alt="Logo Footer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-h4 font-bold block leading-tight mb-1">
                    POSBANKUM
                  </span>
                  <span className="text-field-2 opacity-90">{ORG_SHORT}</span>
                </div>
              </div>
              <p className="text-b3 opacity-85 leading-relaxed mb-6">
                Platform resmi {ORG_FULL} untuk layanan bantuan hukum masyarakat
                di Provinsi Riau
              </p>

              <div className="flex items-center gap-3 mb-6">
                <a
                  href={`mailto:${ORG_EMAIL}`}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </a>
                <a
                  href={`tel:${ORG_WA_TEL}`}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20">
                <div className="w-2 h-2 rounded-full bg-success-2 animate-pulse"></div>
                <span className="text-field-2 font-semibold">
                  Melayani 24/7
                </span>
              </div>
            </div>

            {/* Column 2: Layanan */}
            <div>
              <h4 className="text-b1 font-bold mb-6">Layanan Kami</h4>
              <ul className="space-y-3 text-b3">
                {[
                  "Cek Lokasi Posbankum",
                  "Dokumen & Formulir",
                  "Data Paralegal",
                  "Kegiatan Posbankum",
                  "Panduan Bantuan Hukum",
                ].map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="flex items-center gap-2 opacity-85 hover:opacity-100 hover:translate-x-1 transition-all group"
                    >
                      <svg
                        className="w-4 h-4 text-brand-yellow-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="group-hover:text-brand-yellow-1 transition-colors">
                        {item}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Informasi */}
            <div>
              <h4 className="text-b1 font-bold mb-6">Informasi</h4>
              <ul className="space-y-3 text-b3">
                {[
                  "Tentang Posbankum",
                  "Visi & Misi",
                  "Struktur Organisasi",
                  "Berita Terkini",
                  "FAQ",
                ].map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="flex items-center gap-2 opacity-85 hover:opacity-100 hover:translate-x-1 transition-all group"
                    >
                      <svg
                        className="w-4 h-4 text-brand-yellow-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="group-hover:text-brand-yellow-1 transition-colors">
                        {item}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Hubungi */}
            <div>
              <h4 className="text-b1 font-bold mb-6">Hubungi Kami</h4>
              <ul className="space-y-4 text-b3">
                <li className="flex items-start gap-3 opacity-85">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-brand-yellow-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="leading-relaxed">{ORG_ADDR}</span>
                </li>
                <li>
                  <a
                    href={`tel:${ORG_WA_TEL}`}
                    className="flex items-start gap-3 opacity-85 hover:opacity-100 hover:text-brand-yellow-1 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-brand-yellow-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <span>{ORG_WA_DISPLAY}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${ORG_EMAIL}`}
                    className="flex items-start gap-3 opacity-85 hover:opacity-100 hover:text-brand-yellow-1 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-brand-yellow-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <span className="break-all">{ORG_EMAIL}</span>
                  </a>
                </li>
                <li className="flex items-start gap-3 opacity-85">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-brand-yellow-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Senin - Jumat</div>
                    <div className="text-field-2">08:00 - 16:00 WIB</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="px-4 bg-gradient-to-r from-transparent via-brand-blue-s2 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-yellow-2"></div>
                  <div className="w-2 h-2 rounded-full bg-brand-yellow-1"></div>
                  <div className="w-2 h-2 rounded-full bg-brand-yellow-2"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-b3 opacity-75">
              © {new Date().getFullYear()} {ORG_FULL}. Hak Cipta
              Dilindungi.{" "}
            </p>
            <div className="flex items-center gap-6 text-b3">
              <a
                href="#"
                className="opacity-75 hover:opacity-100 hover:text-brand-yellow-2 transition-all"
              >
                Syarat & Ketentuan
              </a>
              <span className="opacity-50">•</span>
              <a
                href="#"
                className="opacity-75 hover:opacity-100 hover:text-brand-yellow-2 transition-all"
              >
                Kebijakan Privasi
              </a>
              <span className="opacity-50">•</span>
              <a
                href="#"
                className="opacity-75 hover:opacity-100 hover:text-brand-yellow-2 transition-all"
              >
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
