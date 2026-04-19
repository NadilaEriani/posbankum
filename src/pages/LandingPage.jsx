import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

import burung1 from "../assets/burung1.png";
import burung2 from "../assets/burung2.png";
import burung3 from "../assets/burung3.png";
import burung4 from "../assets/burung4.png";
import burung5 from "../assets/burung5.png";
import burung7 from "../assets/burung7.png";
import burung9 from "../assets/burung9.png";
import logo from "../assets/logo.png";

const ORG_SHORT = "Kemenkum Riau";
const ORG_FULL = "Kantor Wilayah Kementerian Hukum Riau";
const ORG_ADDR = "Jl. Jend. Sudirman No.233, Sumahilang, Kec. Pekanbaru Kota, Kota Pekanbaru, Riau 28111";
const ORG_EMAIL = "humaskumriau@gmail.com";
const ORG_WA_DISPLAY = "0811-6904-422";
const ORG_WA_TEL = "+628116904422";
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
  const [openFaq, setOpenFaq] = useState(0);

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
    if (!userId) { setLoading(false); nav("/login"); return; }
    const path = await getRedirectPathByRole(userId);
    setLoading(false);
    nav(path);
  };

  const onLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const toggleFaq = (index) => setOpenFaq(openFaq === index ? null : index);

  const faqs = [
    {
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
      question: "Apa itu Pos Bantuan Hukum dan siapa yang berhak mendapatkan layanannya?",
      answer: "Pos Bantuan Hukum adalah layanan penyuluhan, konsultasi, dan pendampingan hukum yang diberikan secara gratis kepada masyarakat tidak mampu melalui paralegal terlatih di setiap kelurahan. Layanan ini terbuka untuk seluruh masyarakat yang membutuhkan bantuan hukum, khususnya masyarakat kurang mampu yang tidak dapat mengakses layanan hukum berbayar.",
    },
    {
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>,
      question: "Bagaimana cara mengetahui lokasi Posbankum di kelurahan saya?",
      answer: "Anda dapat menemukan lokasi Posbankum terdekat melalui peta interaktif di website ini atau menghubungi kantor kelurahan/desa setempat. Setiap Posbankum memiliki paralegal terlatih yang siap membantu Anda dengan jadwal layanan yang telah ditentukan.",
    },
    {
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>,
      question: "Apa saja tugas paralegal di Posbankum?",
      answer: "Paralegal Posbankum bertugas memberikan konsultasi hukum awal, membantu menyusun dokumen hukum sederhana, memberikan informasi tentang hak-hak hukum masyarakat, melakukan mediasi perselisihan ringan, dan menghubungkan masyarakat dengan advokat atau lembaga bantuan hukum jika diperlukan pendampingan lebih lanjut.",
    },
    {
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
      question: "Apa saja dokumen yang dikelola dalam sistem Posbankum?",
      answer: "Dokumen yang biasanya diperlukan meliputi: KTP asli dan fotokopi, Kartu Keluarga, surat keterangan tidak mampu dari kelurahan (jika ada), dan dokumen terkait permasalahan hukum Anda seperti surat gugatan, kontrak, atau dokumen lain yang relevan.",
    },
    {
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
      question: "Apakah layanan Posbankum benar-benar gratis?",
      answer: "Ya, seluruh layanan Posbankum sepenuhnya gratis untuk masyarakat yang memenuhi persyaratan. Tidak ada biaya apapun yang dikenakan untuk konsultasi, pendampingan, maupun bantuan hukum lainnya.",
    },
    {
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>,
      question: "Berapa lama proses penanganan kasus di Posbankum?",
      answer: "Waktu penanganan kasus bervariasi tergantung kompleksitas masalah hukum. Konsultasi awal dapat dilakukan pada hari yang sama. Untuk kasus yang memerlukan pendampingan lebih lanjut, paralegal akan memberikan estimasi waktu setelah penilaian awal.",
    },
    {
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>,
      question: "Bagaimana cara menghubungi paralegal Posbankum?",
      answer: "Anda dapat menghubungi paralegal Posbankum melalui telepon atau WhatsApp di nomor 0811-6904-422, email di humaskumriau@gmail.com, atau langsung datang ke kantor Posbankum terdekat di kelurahan Anda pada jam layanan Senin-Jumat pukul 08.00-16.00 WIB.",
    },
  ];

  const posbankumList = [
    { num: 1, name: "Posbankum Kec. Tampan", address: "Jl. HR Soebrantas KM 12.5, Simpang Baru, Tampan", paralegal: 4, kasus: 52 },
    { num: 2, name: "Posbankum Kec. Sukajadi", address: "Jl. SM Amin No. 128, Kampung Melayu, Sukajadi", paralegal: 3, kasus: 45 },
    { num: 3, name: "Posbankum Kec. Marpoyan Damai", address: "Jl. Riau No. 156, Sidomulyo Barat, Marpoyan Damai", paralegal: 3, kasus: 38 },
    { num: 4, name: "Posbankum Kec. Tenayan Raya", address: "Jl. Kaharuddin Nasution No. 88, Sail, Tenayan Raya", paralegal: 4, kasus: 61 },
    { num: 5, name: "Posbankum Kec. Bukit Raya", address: "Jl. Arifin Ahmad No. 45, Tangkerang Selatan, Bukit Raya", paralegal: 2, kasus: 34 },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Nunito', sans-serif" }} className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          /* === Exact palette from screenshots === */
          --navy-darkest:  #030712;
          --navy-dark:     #051531;
          --navy-900:      #101828;
          --navy:          #0A2A62;
          --navy-mid:      #1E3A8A;
          --blue-btn:      #1447E6;
          --blue-hover:    #1454C4;
          --blue-bright:   #155DFC;
          --blue-51:       #51A2FF;
          --blue-75:       #75A5F9;
          --blue-a3:       #A3C3FB;
          --blue-be:       #BEDBFF;
          --blue-dbe:      #DBEAFE;
          --blue-e8:       #E8F0FE;
          --blue-bg:       #EFF6FF;
          --blue-d1:       #D1E1FD;
          --green-dark:    #008236;
          --green-00a:     #00A63E;
          --green-00c:     #00C950;
          --green-mid:     #15803D;
          --green-22:      #22C55E;
          --green-81:      #81C784;
          --green-bb:      #BBF7D0;
          --green-c8:      #C8E6C9;
          --green-dc:      #DCFCE7;
          --green-f0:      #F0FDF4;
          --red-e7:        #E7000B;
          --red-ffe:       #FFE2E2;
          --orange-ffb:    #FFB84D;
          --orange-ffe:    #FFEDD5;
          --orange-ffd:    #FFD700;
          --orange-ffe4:   #FFE4B5;
          --orange-c24:    #C2410C;
          --gray-f9:       #F9FAFB;
          --gray-f3:       #F3F4F6;
          --gray-e5:       #E5E7EB;
          --gray-d5:       #D5D5D5;
          --gray-9c:       #9CA3AF;
          --gray-6b:       #6B7280;
          --gray-6a:       #6A7282;
          --gray-4b:       #4B5563;
          --gray-4a:       #4A5565;
          --gray-37:       #374151;
          --gray-36:       #364153;
          --gray-1f:       #1F2937;
          --gray-10:       #101828;
          --white:         #FFFFFF;
          --black:         #000000;
          --blue-277:      #0277BD;
        }

        /* ===== TOPBAR ===== */
        .topbar {
          background: var(--navy-dark);
          padding: 9px 0;
        }
        .topbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .topbar-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .topbar-contact {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #94A3B8;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
        }
        .topbar-contact svg { flex-shrink: 0; opacity: 0.8; }
        .topbar-lang {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .lang-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 10px;
          border-radius: 5px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
        }
        .lang-btn.active { color: #fff; }
        .lang-btn.inactive { color: rgba(255,255,255,0.45); }
        .lang-divider { color: rgba(255,255,255,0.2); font-size: 14px; }

        /* ===== HEADER ===== */
        .header-sticky {
          background: var(--white);
          border-bottom: 1px solid var(--gray-e5);
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        }
        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .logo-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1E3A8A 0%, #155DFC 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 7px;
          flex-shrink: 0;
        }
        .logo-box img { width: 100%; height: 100%; object-fit: contain; }
        .logo-title { font-weight: 800; font-size: 17px; color: #0A2A62; letter-spacing: 0.5px; line-height: 1; }
        .logo-sub { font-size: 11.5px; color: #6B7280; margin-top: 2px; }

        /* ===== BTN ===== */
        .btn-masuk {
          background: #1E3A8A;
          color: #fff;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }
        .btn-masuk:hover { background: #1454C4; }
        .btn-outline-danger {
          border: 2px solid #dc2626;
          color: #dc2626;
          background: transparent;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-outline-danger:hover { background: #dc2626; color: #fff; }

        /* ===== HERO ===== */
        .hero-section {
          background: linear-gradient(160deg, #EFF6FF 0%, #F8FBFF 55%, #EFF6FF 100%);
          padding: 60px 24px 76px;
          position: relative;
          overflow: hidden;
        }
        .hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
          margin-bottom: 52px;
        }

        /* Mascot card */
        .mascot-card {
          background: linear-gradient(150deg, #0A2A62 0%, #1E3A8A 100%);
          border-radius: 22px;
          padding: 32px 28px 28px;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 48px rgba(10,42,98,0.22);
        }
        .mascot-card::before {
          content: '';
          position: absolute;
          top: -50px;
          left: -50px;
          width: 180px;
          height: 180px;
          background: rgba(255,255,255,0.04);
          border-radius: 50%;
        }
        .mascot-card::after {
          content: '';
          position: absolute;
          bottom: -30px;
          right: -30px;
          width: 140px;
          height: 140px;
          background: rgba(255,255,255,0.03);
          border-radius: 50%;
        }
        .mascot-circle-wrap {
          width: 192px;
          height: 192px;
          background: #fff;
          border-radius: 50%;
          margin: 0 auto 22px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        .mascot-circle-wrap img {
          width: 150%;
          height: 150%;
          object-fit: contain;
          margin-bottom: -8px;
        }
        .mascot-nameplate {
          background: rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 14px 28px;
          display: inline-block;
          min-width: 210px;
          position: relative;
          z-index: 1;
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .mascot-nameplate-title { font-weight: 800; font-size: 18px; color: #fff; }
        .mascot-nameplate-sub { font-size: 13px; color: rgba(255,255,255,0.75); margin-top: 3px; }
        .mascot-badge-float {
          position: absolute;
          bottom: -14px;
          right: -8px;
          width: 60px;
          height: 60px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          padding: 8px;
          z-index: 2;
        }
        .mascot-badge-float img { width: 100%; height: 100%; object-fit: contain; }

        /* Hero right */
        .hero-org-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 99px;
          padding: 7px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 22px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background: #22C55E;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.9)} }

        .hero-h1 {
          font-size: 42px;
          font-weight: 800;
          color: #0A2A62;
          line-height: 1.18;
          margin-bottom: 18px;
          letter-spacing: -0.5px;
        }
        .hero-h1 span { color: #155DFC; }
        .hero-desc {
          font-size: 15px;
          color: #4B5563;
          line-height: 1.72;
          margin-bottom: 28px;
          max-width: 480px;
        }

        /* Info chips 2x2 grid */
        .chips-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 30px;
        }
        .chip {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
        }
        .chip-green  { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
        .chip-blue   { background: #EFF6FF; color: #1E3A8A; border: 1px solid #DBEAFE; }
        .chip-orange { background: #FFEDD5; color: #92400E; border: 1px solid #FED7AA; }
        .chip-red    { background: #FFE2E2; color: #B91C1C; border: 1px solid #FECACA; }
        .chip-icon {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .chip-icon-green  { background: #15803D; color: #fff; }
        .chip-icon-blue   { background: #1E3A8A; color: #fff; }
        .chip-icon-orange { background: #F59E0B; color: #fff; }
        .chip-icon-red    { background: #E7000B; color: #fff; }

        /* Hero CTA buttons */
        .hero-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn-hero-primary {
          background: #1E3A8A;
          color: #fff;
          padding: 14px 26px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(30,58,138,0.3);
        }
        .btn-hero-primary:hover { background: #1454C4; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(30,58,138,0.38); }
        .btn-hero-outline {
          background: #fff;
          color: #1E3A8A;
          padding: 14px 26px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          border: 2px solid #1E3A8A;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-hero-outline:hover { background: #EFF6FF; }

        /* Section label */
        .keunggulan-label {
          text-align: center;
          margin-bottom: 32px;
        }
        .label-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 99px;
          padding: 7px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          letter-spacing: 0.5px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        /* Hero bottom feature cards */
        .hero-features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 18px;
        }
        .hero-feat-card {
          border-radius: 16px;
          padding: 24px;
          transition: all 0.25s;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .hero-feat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.08); }
        .hero-feat-card.blue-card   { background: #EFF6FF; }
        .hero-feat-card.orange-card { background: #FFFBEB; }
        .hero-feat-card.green-card  { background: #F0FDF4; }
        .feat-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 11px;
          margin-bottom: 16px;
        }
        .feat-icon-box img { width: 100%; height: 100%; object-fit: contain; }
        .feat-icon-blue   { background: #1E3A8A; }
        .feat-icon-orange { background: #F59E0B; }
        .feat-icon-green  { background: #008236; }
        .feat-title { font-weight: 700; font-size: 15.5px; color: #0A2A62; margin-bottom: 7px; }
        .feat-desc  { font-size: 13.5px; color: #4B5563; line-height: 1.6; }

        /* ===== WHY SECTION ===== */
        .why-section {
          background: #fff;
          padding: 80px 24px;
        }
        .section-center { text-align: center; margin-bottom: 44px; }
        .section-badge-wrap { margin-bottom: 18px; }
        .section-h2 {
          font-size: 36px;
          font-weight: 800;
          color: #0A2A62;
          margin-bottom: 12px;
        }
        .section-desc {
          font-size: 15px;
          color: #4B5563;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.65;
        }
        .why-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .why-card {
          border-radius: 20px;
          padding: 30px 28px;
          transition: all 0.25s;
          cursor: default;
        }
        .why-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.09); }
        .why-card.wc-blue   { background: #EFF6FF; }
        .why-card.wc-orange { background: #FFFBEB; }
        .why-card.wc-green  { background: #F0FDF4; }
        .why-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 13px;
          margin-bottom: 20px;
        }
        .why-icon img { width: 100%; height: 100%; object-fit: contain; }
        .wi-blue   { background: #1E3A8A; }
        .wi-orange { background: #F59E0B; }
        .wi-green  { background: #008236; }
        .why-title { font-weight: 700; font-size: 17px; color: #0A2A62; margin-bottom: 8px; }
        .why-desc  { font-size: 14px; color: #4B5563; line-height: 1.65; }

        /* ===== GREEN SECTION (Akses Bantuan Hukum) ===== */
        .green-section {
          background: linear-gradient(160deg, #F0FDF4 0%, #F8FFFC 100%);
          padding: 80px 24px;
        }
        .two-col {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .section-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 16px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 16px;
          letter-spacing: 0.2px;
        }
        .sbp-green { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
        .sbp-red   { background: #FFE2E2; color: #B91C1C; border: 1px solid #FECACA; }
        .sbp-blue  { background: #EFF6FF; color: #1E3A8A; border: 1px solid #DBEAFE; }
        .section-h2-blue {
          font-size: 30px;
          font-weight: 800;
          color: #155DFC;
          margin-bottom: 14px;
          line-height: 1.3;
        }
        .section-body {
          font-size: 15px;
          color: #4B5563;
          line-height: 1.72;
          margin-bottom: 24px;
        }

        /* Service items */
        .service-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .service-item {
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }
        .service-item:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.06); }
        .service-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #DCFCE7;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #15803D;
          flex-shrink: 0;
        }

        /* Mascot visual card – green */
        .visual-card-green {
          background: linear-gradient(140deg, #008236 0%, #22C55E 100%);
          border-radius: 22px;
          padding: 28px 28px 0;
          overflow: hidden;
          position: relative;
          box-shadow: 0 12px 48px rgba(0,130,54,0.22);
        }
        .visual-card-green::before {
          content: '';
          position: absolute;
          top: -40px;
          right: -40px;
          width: 160px;
          height: 160px;
          background: rgba(255,255,255,0.07);
          border-radius: 50%;
        }
        .visual-card-mascot {
          display: flex;
          justify-content: center;
        }
        .visual-circle {
          width: 200px;
          height: 200px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
        }
        .visual-circle img {
          width: 150%;
          height: 150%;
          object-fit: contain;
          margin-bottom: -10px;
        }
        .visual-footer {
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(10px);
          border-radius: 0 0 16px 16px;
          padding: 16px 24px;
          text-align: center;
          margin-top: 20px;
        }
        .visual-footer-title { font-weight: 800; font-size: 17px; color: #fff; }
        .visual-footer-sub   { font-size: 13px; color: rgba(255,255,255,0.82); margin-top: 3px; }

        /* Visual card – red */
        .visual-card-red {
          background: linear-gradient(140deg, #E7000B 0%, #F97316 100%);
          border-radius: 22px;
          padding: 28px 28px 0;
          overflow: hidden;
          position: relative;
          box-shadow: 0 12px 48px rgba(231,0,11,0.2);
        }
        .visual-online-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          background: #22C55E;
          color: #fff;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 5px;
          z-index: 2;
        }
        .online-dot {
          width: 6px;
          height: 6px;
          background: #fff;
          border-radius: 50%;
          display: inline-block;
        }
        .visual-square {
          width: 200px;
          height: 200px;
          background: #fff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .visual-square img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        /* ===== RED SECTION (Pusat Informasi) ===== */
        .red-section {
          background: #FFF5F5;
          padding: 80px 24px;
        }
        .btn-red {
          background: #E7000B;
          color: #fff;
          padding: 14px 26px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(231,0,11,0.28);
        }
        .btn-red:hover { background: #C2410C; transform: translateY(-1px); }

        /* ===== MAP SECTION ===== */
        .map-section {
          background: #fff;
          padding: 80px 24px;
        }
        .map-wrap {
          max-width: 1200px;
          margin: 0 auto;
        }
        .map-container {
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #E5E7EB;
          display: flex;
          height: 448px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        }
        .map-left { flex: 1; position: relative; background: #E8EEF3; }

        /* Search bar on map */
        .map-searchbar {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .map-search-wrap {
          flex: 1;
          position: relative;
        }
        .map-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9CA3AF;
          pointer-events: none;
        }
        .map-search-input {
          width: 100%;
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 10px 14px 10px 36px;
          font-size: 14px;
          color: #374151;
          outline: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          font-family: inherit;
        }
        .map-search-input::placeholder { color: #9CA3AF; }
        .map-count-pill {
          background: #1E3A8A;
          color: #fff;
          padding: 9px 14px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 700;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }
        .count-dot { width: 8px; height: 8px; background: #22C55E; border-radius: 50%; display: inline-block; }

        /* Fake map elements */
        .fake-map { width: 100%; height: 100%; position: relative; overflow: hidden; background: #E8EEF3; }
        .road-h { position: absolute; left: 0; right: 0; background: #fff; }
        .road-v { position: absolute; top: 0; bottom: 0; background: #fff; }
        .block-green { position: absolute; background: #D1FAE5; border-radius: 6px; }
        .block-gray  { position: absolute; background: #DDE3E9; border-radius: 4px; }
        .river       { position: absolute; background: #BAE6FD; border-radius: 20px; opacity: 0.88; }
        .road-label  { position: absolute; font-size: 9.5px; color: #374151; font-weight: 600; pointer-events: none; white-space: nowrap; }
        .compass-box {
          position: absolute;
          top: 58px;
          right: 14px;
          width: 28px;
          height: 28px;
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: #1E3A8A;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        .scale-box {
          position: absolute;
          bottom: 54px;
          left: 14px;
          font-size: 11px;
          color: #374151;
          font-weight: 500;
          background: rgba(255,255,255,0.85);
          padding: 2px 7px;
          border-radius: 4px;
        }
        /* Zoom controls */
        .zoom-controls {
          position: absolute;
          bottom: 14px;
          right: 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .zoom-btn {
          width: 32px;
          height: 32px;
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 17px;
          color: #374151;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          line-height: 1;
          font-weight: 400;
        }
        .layer-btn {
          position: absolute;
          bottom: 14px;
          left: 14px;
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* Map pin */
        .map-pin {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
        .map-pin-body {
          width: 30px;
          height: 30px;
          background: #1E3A8A;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.28);
          transition: transform 0.2s;
        }
        .map-pin-body:hover { transform: rotate(-45deg) scale(1.18); }
        .map-pin-body::after {
          content: '';
          width: 11px;
          height: 11px;
          background: #fff;
          border-radius: 50%;
        }

        /* Map right sidebar */
        .map-sidebar {
          width: 310px;
          background: #fff;
          border-left: 1px solid #E5E7EB;
          overflow-y: auto;
          flex-shrink: 0;
        }
        .sidebar-header {
          background: #1E3A8A;
          color: #fff;
          padding: 16px 18px;
        }
        .sidebar-header-title { font-weight: 800; font-size: 15px; }
        .sidebar-header-sub   { font-size: 12px; color: rgba(255,255,255,0.72); margin-top: 3px; }
        .sidebar-see-all      { font-size: 12px; color: #93C5FD; margin-top: 6px; text-align: right; cursor: pointer; }
        .pb-item {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F1F1;
          cursor: pointer;
          transition: background 0.15s;
        }
        .pb-item:hover { background: #F8FAFC; }
        .pb-item.selected {
          background: #EFF6FF;
          border-left: 3px solid #1447E6;
          padding-left: 13px;
        }
        .pb-num {
          width: 28px;
          height: 28px;
          background: #1E3A8A;
          color: #fff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pb-name { font-weight: 700; font-size: 13px; color: #0A2A62; margin-bottom: 3px; }
        .pb-addr { font-size: 11px; color: #6B7280; margin-bottom: 8px; line-height: 1.45; }
        .pb-aktif-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          background: #DCFCE7;
          color: #15803D;
          border: 1px solid #BBF7D0;
        }
        .pb-meta { font-size: 11px; color: #6B7280; display: flex; align-items: center; gap: 3px; }

        /* ===== FAQ SECTION ===== */
        .faq-section {
          background: linear-gradient(160deg, #EFF6FF 0%, #F0F5FF 100%);
          padding: 80px 24px;
        }
        .faq-inner {
          max-width: 860px;
          margin: 0 auto;
        }
        .faq-list { display: flex; flex-direction: column; gap: 10px; }
        .faq-item {
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
        }
        .faq-item.faq-open {
          border-color: #1447E6;
          box-shadow: 0 4px 18px rgba(20,71,230,0.1);
        }
        .faq-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 22px;
          text-align: left;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .faq-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .fib-default { background: #EFF6FF; color: #1E3A8A; }
        .fib-open    { background: #1E3A8A; color: #fff; }
        .faq-question {
          flex: 1;
          font-weight: 700;
          font-size: 15px;
          color: #0A2A62;
          text-align: left;
        }
        .faq-chevron {
          flex-shrink: 0;
          color: #9CA3AF;
          transition: transform 0.3s;
        }
        .faq-chevron.chev-open { transform: rotate(180deg); color: #1447E6; }
        .faq-body-wrap {
          overflow: hidden;
          transition: max-height 0.32s ease;
        }
        .faq-answer {
          font-size: 14px;
          color: #4B5563;
          line-height: 1.72;
          background: #F8FBFF;
          border-radius: 12px;
          padding: 14px 18px;
          margin: 0 12px 12px;
        }

        /* CTA box */
        .cta-box {
          background: linear-gradient(135deg, #051531 0%, #1E3A8A 100%);
          border-radius: 20px;
          padding: 42px 36px;
          text-align: center;
          margin-top: 48px;
          box-shadow: 0 8px 36px rgba(5,21,49,0.25);
        }
        .cta-title { font-size: 25px; font-weight: 800; color: #fff; margin-bottom: 10px; }
        .cta-desc  { font-size: 14px; color: rgba(255,255,255,0.78); line-height: 1.65; margin-bottom: 24px; }
        .btn-cta-white {
          background: #fff;
          color: #1E3A8A;
          padding: 13px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(255,255,255,0.15);
        }
        .btn-cta-white:hover { background: #EFF6FF; transform: translateY(-1px); }

        /* ===== FOOTER ===== */
        footer { background: #051531; color: #fff; }
        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 24px 32px;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1.25fr;
          gap: 36px;
          margin-bottom: 48px;
        }
        .footer-col-title { font-weight: 800; font-size: 14px; margin-bottom: 20px; color: #fff; }
        .footer-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .social-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .social-btn {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-decoration: none;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .social-btn:hover { background: rgba(255,255,255,0.2); }
        .footer-link {
          color: rgba(255,255,255,0.65);
          font-size: 14px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          transition: all 0.2s;
        }
        .footer-link::before {
          content: '';
          width: 6px;
          height: 6px;
          background: #FFB84D;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .footer-link:hover { color: #fff; padding-left: 3px; }
        .footer-links-col { display: flex; flex-direction: column; gap: 2px; }
        .footer-contact-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }
        .fc-icon {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFB84D;
          flex-shrink: 0;
        }
        .fc-label { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 3px; }
        .fc-value { font-size: 13px; font-weight: 600; color: #fff; }
        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .footer-copy { font-size: 13px; color: rgba(255,255,255,0.45); }
        .footer-legal-links { display: flex; gap: 20px; }
        .footer-legal-link {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-legal-link:hover { color: rgba(255,255,255,0.8); }

        /* ===== FLOATING CHAT ===== */
        .floating-chat {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 52px;
          height: 52px;
          background: #1447E6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(20,71,230,0.42);
          z-index: 999;
          transition: transform 0.2s;
        }
        .floating-chat:hover { transform: scale(1.1); }
      `}</style>

      {/* ===== TOP BAR ===== */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <a href={`mailto:${ORG_EMAIL}`} className="topbar-contact">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
              {ORG_EMAIL}
            </a>
            <a href={`tel:${ORG_WA_TEL}`} className="topbar-contact">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
              {ORG_WA_DISPLAY}
            </a>
          </div>
          <div className="topbar-lang">
            <button className="lang-btn active">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/></svg>
              ID
            </button>
            <span className="lang-divider">|</span>
            <button className="lang-btn inactive">EN</button>
          </div>
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <header className="header-sticky">
        <div className="header-inner">
          <Link to="/" className="logo-wrap">
            <div className="logo-box">
              <img src={logo} alt="Logo Posbankum" />
            </div>
            <div>
              <div className="logo-title">POSBANKUM</div>
              <div className="logo-sub">{ORG_SHORT}</div>
            </div>
          </Link>

          {!sessionEmail ? (
            <Link to="/login" className="btn-masuk">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Masuk
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-masuk" onClick={goDashboard} disabled={loading}>
                {loading ? "..." : "Dashboard"}
              </button>
              <button className="btn-outline-danger" onClick={onLogout} disabled={loading}>Keluar</button>
            </div>
          )}
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-grid">
            {/* LEFT: Mascot Card */}
            <div style={{ position: 'relative' }}>
              <div className="mascot-card">
                <div className="mascot-circle-wrap">
                  <img src={burung5} alt="Maskot Posbankum" />
                </div>
                <div className="mascot-nameplate">
                  <div className="mascot-nameplate-title">Posbankum</div>
                  <div className="mascot-nameplate-sub">Kanwil Kemenkum Riau</div>
                </div>
                <div className="mascot-badge-float">
                  <img src={burung5} alt="" />
                </div>
              </div>
            </div>

            {/* RIGHT: Hero Text */}
            <div>
              <div className="hero-org-badge">
                <span className="live-dot"></span>
                Kantor Wilayah Kementerian Hukum dan HAM Riau
              </div>

              <h1 className="hero-h1">
                Ayo Cek Data <span>Posbankum</span><br />di Wilayah Anda
              </h1>

              <p className="hero-desc">
                Temukan informasi lengkap Pos Bantuan Hukum (Posbankum) di desa atau kelurahan Anda. Akses data paralegal aktif, dokumen hukum, hingga kegiatan Posbankum terbaru dengan mudah dan cepat.
              </p>

              <div className="chips-grid">
                <div className="chip chip-green">
                  <span className="chip-icon chip-icon-green">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  </span>
                  Data Real-time &amp; Akurat
                </div>
                <div className="chip chip-blue">
                  <span className="chip-icon chip-icon-blue">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  </span>
                  Resmi Pemerintah
                </div>
                <div className="chip chip-orange">
                  <span className="chip-icon chip-icon-orange">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                  </span>
                  1K+ Paralegal Terlatih
                </div>
                <div className="chip chip-red">
                  <span className="chip-icon chip-icon-red">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>
                  </span>
                  100+ Kasus Ditangani
                </div>
              </div>

              <div className="hero-cta-row">
                <button className="btn-hero-primary">
                  <svg width="17" height="17" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                  Lihat Posbankum Terdekat
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                </button>
                <button className="btn-hero-outline">Pelajari Lebih Lanjut</button>
              </div>
            </div>
          </div>

          {/* KEUNGGULAN LAYANAN label */}
          <div className="keunggulan-label">
            <span className="label-badge">KEUNGGULAN LAYANAN</span>
          </div>

          {/* Hero feature cards */}
          <div className="hero-features-grid">
            {[
              { img: burung1, title: 'Akses Mudah & Cepat', desc: 'Layanan bantuan hukum yang mudah diakses kapan saja dan dimana saja', cardCls: 'blue-card', iconCls: 'feat-icon-blue' },
              { img: burung3, title: 'Paralegal Berpengalaman', desc: 'Didampingi paralegal terlatih dan bersertifikat resmi', cardCls: 'orange-card', iconCls: 'feat-icon-orange' },
              { img: burung7, title: 'Jangkauan Luas', desc: 'Tersebar di seluruh desa dan kelurahan di Provinsi Riau', cardCls: 'green-card', iconCls: 'feat-icon-green' },
            ].map((item, i) => (
              <div key={i} className={`hero-feat-card ${item.cardCls}`}>
                <div className={`feat-icon-box ${item.iconCls}`}>
                  <img src={item.img} alt={item.title} />
                </div>
                <div className="feat-title">{item.title}</div>
                <p className="feat-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MENGAPA MEMILIH KAMI ===== */}
      <section className="why-section">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="section-center">
            <div className="section-badge-wrap">
              <span className="label-badge">KEUNGGULAN LAYANAN</span>
            </div>
            <h2 className="section-h2">Mengapa Memilih Kami?</h2>
            <p className="section-desc">Posbankum hadir untuk memberikan akses keadilan yang merata bagi seluruh lapisan masyarakat</p>
          </div>
          <div className="why-grid">
            {[
              { img: burung1, title: 'Akses Mudah & Cepat', desc: 'Layanan bantuan hukum yang mudah diakses kapan saja dan dimana saja', cardCls: 'wc-blue', iconCls: 'wi-blue' },
              { img: burung3, title: 'Paralegal Berpengalaman', desc: 'Didampingi paralegal terlatih dan bersertifikat resmi', cardCls: 'wc-orange', iconCls: 'wi-orange' },
              { img: burung7, title: 'Jangkauan Luas', desc: 'Tersebar di seluruh desa dan kelurahan di Provinsi Riau', cardCls: 'wc-green', iconCls: 'wi-green' },
            ].map((item, i) => (
              <div key={i} className={`why-card ${item.cardCls}`}>
                <div className={`why-icon ${item.iconCls}`}>
                  <img src={item.img} alt={item.title} />
                </div>
                <div className="why-title">{item.title}</div>
                <p className="why-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AKSES BANTUAN HUKUM GRATIS ===== */}
      <section className="green-section">
        <div className="two-col">
          <div>
            <span className="section-badge-pill sbp-green">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              LAYANAN MASYARAKAT
            </span>
            <h2 className="section-h2-blue">Akses Bantuan Hukum Gratis</h2>
            <p className="section-body">
              Kanwil Kemenkum Riau melalui Posbankum menyediakan layanan bantuan hukum gratis untuk masyarakat kurang mampu. Posbankum hadir di setiap kelurahan untuk memastikan keadilan dapat diakses oleh seluruh lapisan masyarakat.
            </p>
            <div className="service-list">
              {['Konsultasi hukum gratis dan konfidensial', 'Pendampingan hukum di pengadilan', 'Mediasi & penyelesaian sengketa'].map((item, i) => (
                <div key={i} className="service-item">
                  <div className="service-icon">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                      {i === 0 && <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>}
                      {i === 1 && <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>}
                      {i === 2 && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>}
                    </svg>
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="visual-card-green">
              <div className="visual-card-mascot">
                <div className="visual-circle">
                  <img src={burung7} alt="Layanan Hukum Gratis" />
                </div>
              </div>
              <div className="visual-footer">
                <div className="visual-footer-title">Bantuan Hukum Gratis</div>
                <div className="visual-footer-sub">Untuk Seluruh Masyarakat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PUSAT INFORMASI LAYANAN HUKUM ===== */}
      <section className="red-section">
        <div className="two-col">
          <div>
            <div className="visual-card-red">
              <div className="visual-online-badge">
                <span className="online-dot"></span>Online
              </div>
              <div className="visual-card-mascot">
                <div className="visual-square">
                  <img src={burung9} alt="Platform Digital" />
                </div>
              </div>
              <div className="visual-footer">
                <div className="visual-footer-title">Platform Digital Terintegrasi</div>
                <div className="visual-footer-sub">Akses Informasi 24/7</div>
              </div>
            </div>
          </div>

          <div>
            <span className="section-badge-pill sbp-red">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
              PUSAT INFORMASI
            </span>
            <h2 className="section-h2-blue">Pusat Informasi Layanan Hukum</h2>
            <p className="section-body">
              Akses informasi lengkap tentang prosedur bantuan hukum, hak-hak Anda sebagai warga negara, dan informasi hukum terkini dari paralegal profesional yang tersebar di seluruh Indonesia.
            </p>
            <button className="btn-red">
              Hubungi Paralegal
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ===== PETA LOKASI INTERAKTIF ===== */}
      <section className="map-section">
        <div className="map-wrap">
          <div className="section-center">
            <div className="section-badge-wrap">
              <span className="section-badge-pill sbp-blue" style={{ marginBottom: 16 }}>
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                PETA LOKASI INTERAKTIF
              </span>
            </div>
            <h2 className="section-h2">Temukan Posbankum Terdekat</h2>
            <p className="section-desc">Jelajahi peta interaktif dan temukan lokasi Pos Bantuan Hukum di seluruh wilayah Provinsi Riau</p>
          </div>

          <div className="map-container">
            {/* Map left */}
            <div className="map-left">
              {/* Search bar */}
              <div className="map-searchbar">
                <div className="map-search-wrap">
                  <span className="map-search-icon">
                    <svg width="15" height="15" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>
                  </span>
                  <input type="text" placeholder="Cari Posbankum di Pekanbaru..." className="map-search-input" />
                </div>
                <div className="map-count-pill">
                  <span className="count-dot"></span>5 Lokasi
                </div>
              </div>

              {/* Fake map tiles */}
              <div className="fake-map">
                {/* Roads horizontal */}
                <div className="road-h" style={{ top: '20%', height: 10 }}></div>
                <div className="road-h" style={{ top: '42%', height: 10 }}></div>
                <div className="road-h" style={{ top: '60%', height: 8 }}></div>
                <div className="road-h" style={{ top: '75%', height: 8 }}></div>
                {/* Roads vertical */}
                <div className="road-v" style={{ left: '18%', width: 8 }}></div>
                <div className="road-v" style={{ left: '38%', width: 10 }}></div>
                <div className="road-v" style={{ left: '60%', width: 8 }}></div>
                <div className="road-v" style={{ left: '78%', width: 8 }}></div>
                {/* Park */}
                <div className="block-green" style={{ top: '25%', left: '41%', width: 110, height: 65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11, color: '#15803D', fontWeight: 600 }}>Taman</div>
                </div>
                {/* Buildings */}
                <div className="block-gray" style={{ top: '8%', left: '20%', width: 62, height: 36 }}></div>
                <div className="block-gray" style={{ top: '8%', left: '62%', width: 92, height: 42 }}></div>
                <div className="block-gray" style={{ top: '48%', left: '62%', width: 82, height: 48 }}></div>
                <div className="block-gray" style={{ top: '64%', left: '20%', width: 72, height: 34 }}></div>
                <div className="block-gray" style={{ top: '26%', left: '20%', width: 52, height: 40 }}></div>
                {/* River */}
                <div className="river" style={{ bottom: '8%', left: 0, right: 0, height: 52 }}></div>
                {/* Road labels */}
                <div className="road-label" style={{ top: '17%', left: '20%' }}>Jl. HR Soebrantas</div>
                <div className="road-label" style={{ top: '39%', left: '42%' }}>Jl. Arifin Ahmad</div>
                <div className="road-label" style={{ top: '57%', left: '26%' }}>Jl. Riau</div>
                <div className="road-label" style={{ top: '72%', left: '42%' }}>Jl. Garuda Sakti</div>
                <div className="road-label" style={{ top: '36%', left: '7%', transform: 'rotate(-90deg)', transformOrigin: 'center' }}>Jl. SM Amin</div>
                <div className="road-label" style={{ bottom: '16%', left: '30%', color: '#0277BD', fontWeight: 700 }}>Sungai Siak</div>
                {/* Jl. Kaharuddin Nasution */}
                <div className="road-label" style={{ top: '39%', left: '62%' }}>Jl. Kaharuddin Nasution</div>
                {/* Map pins */}
                <div className="map-pin" style={{ top: '15%', left: '27%' }}><div className="map-pin-body"></div></div>
                <div className="map-pin" style={{ top: '26%', left: '62%' }}><div className="map-pin-body"></div></div>
                <div className="map-pin" style={{ top: '38%', left: '38%' }}><div className="map-pin-body"></div></div>
                <div className="map-pin" style={{ top: '52%', left: '57%' }}><div className="map-pin-body"></div></div>
                <div className="map-pin" style={{ top: '60%', left: '11%' }}><div className="map-pin-body"></div></div>
                {/* Compass */}
                <div className="compass-box">N</div>
                {/* Scale */}
                <div className="scale-box">2 km</div>
                {/* Zoom controls */}
                <div className="zoom-controls">
                  <div className="zoom-btn" style={{ borderRadius: '6px 6px 0 0' }}>+</div>
                  <div className="zoom-btn" style={{ borderRadius: '0 0 6px 6px', borderTop: 'none' }}>−</div>
                  <div className="zoom-btn" style={{ borderRadius: 6, marginTop: 6 }}>
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                  </div>
                </div>
                {/* Layer button */}
                <div className="layer-btn">
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
                  Layer
                </div>
              </div>
            </div>

            {/* Map right sidebar */}
            <div className="map-sidebar">
              <div className="sidebar-header">
                <div className="sidebar-header-title">Daftar Posbankum</div>
                <div className="sidebar-header-sub">Kota Pekanbaru, Riau</div>
                <div className="sidebar-see-all">Lihat Semua Lokasi →</div>
              </div>
              {posbankumList.map((pb, i) => (
                <div key={i} className={`pb-item ${i === 1 ? 'selected' : ''}`}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="pb-num">{pb.num}</div>
                    <div style={{ flex: 1 }}>
                      <div className="pb-name">{pb.name}</div>
                      <div className="pb-addr">{pb.address}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="pb-aktif-badge">✓ Aktif</span>
                        <span className="pb-meta">
                          <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                          {pb.paralegal}
                        </span>
                        <span className="pb-meta">{pb.kasus} kasus</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="faq-section">
        <div className="faq-inner">
          <div className="section-center">
            <div className="section-badge-wrap">
              <span className="section-badge-pill sbp-blue">
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                FAQ
              </span>
            </div>
            <h2 className="section-h2">Pertanyaan yang Sering Diajukan</h2>
            <p className="section-desc">Temukan jawaban dari pertanyaan umum seputar layanan Posbankum, mulai dari akses lokasi hingga informasi bantuan hukum</p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'faq-open' : ''}`}>
                <button className="faq-btn" onClick={() => toggleFaq(i)}>
                  <div className={`faq-icon-box ${openFaq === i ? 'fib-open' : 'fib-default'}`}>
                    {faq.icon}
                  </div>
                  <span className="faq-question">{faq.question}</span>
                  <svg className={`faq-chevron ${openFaq === i ? 'chev-open' : ''}`} width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
                <div className="faq-body-wrap" style={{ maxHeight: openFaq === i ? 300 : 0 }}>
                  <div className="faq-answer">{faq.answer}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="cta-box">
            <div className="cta-title">Masih Ada Pertanyaan?</div>
            <p className="cta-desc">Tim kami siap membantu Anda. Hubungi kami melalui email atau telepon untuk informasi lebih lanjut.</p>
            <button className="btn-cta-white">
              <svg width="17" height="17" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
              Hubungi Kami
            </button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="footer-inner">
          <div className="footer-grid">
            {/* Col 1 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7, flexShrink: 0 }}>
                  <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}>POSBANKUM</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{ORG_SHORT}</div>
                </div>
              </div>
              <p className="footer-desc">Pos Bantuan Hukum yang tersebar di seluruh Indonesia untuk memberikan akses keadilan bagi masyarakat.</p>
              <div className="social-row">
                {[
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878V12.89h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd"/></svg>,
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>,
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.94a8.17 8.17 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z"/></svg>,
                ].map((icon, i) => (
                  <a key={i} href="#" className="social-btn">{icon}</a>
                ))}
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <div className="footer-col-title">Tautan Cepat</div>
              <div className="footer-links-col">
                {['Tentang Kami', 'Layanan', 'Kontak'].map((item, i) => (
                  <a key={i} href="#" className="footer-link">{item}</a>
                ))}
              </div>
            </div>

            {/* Col 3 */}
            <div>
              <div className="footer-col-title">Layanan Kami</div>
              <div className="footer-links-col">
                {['Cek Posbankum', 'Data Paralegal', 'Dokumen Hukum', 'Pengaduan'].map((item, i) => (
                  <a key={i} href="#" className="footer-link">{item}</a>
                ))}
              </div>
            </div>

            {/* Col 4 */}
            <div>
              <div className="footer-col-title">Hubungi Kami</div>
              <div className="footer-contact-item">
                <div className="fc-icon">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                </div>
                <div>
                  <div className="fc-label">Email</div>
                  <div className="fc-value">{ORG_EMAIL}</div>
                </div>
              </div>
              <div className="footer-contact-item">
                <div className="fc-icon">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                </div>
                <div>
                  <div className="fc-label">Telepon</div>
                  <div className="fc-value">{ORG_WA_DISPLAY}</div>
                </div>
              </div>
              <div className="footer-contact-item">
                <div className="fc-icon">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                </div>
                <div>
                  <div className="fc-label">Alamat</div>
                  <div className="fc-value">Kanwil Kemenkum Riau, Pekanbaru</div>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} Posbankum – Kementerian Hukum dan HAM RI. All rights reserved.</p>
            <div className="footer-legal-links">
              <a href="#" className="footer-legal-link">Kebijakan Privasi</a>
              <a href="#" className="footer-legal-link">Syarat &amp; Ketentuan</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating chat */}
      <div className="floating-chat">
        <svg width="22" height="22" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/></svg>
      </div>
    </div>
  );
}