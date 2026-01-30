import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiSettings,
  FiLogOut,
  FiTrendingUp,
} from "react-icons/fi";
import "./adminDashboard.css";
import DataPosbankum from "./DataPosbankum";
import KelolaPosbankum from "./KelolaPosbankum";
import VerifikasiDataPosbankum from "./VerifikasiDataPosbankum";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [active, setActive] = useState("Beranda");
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Guard: kalau tidak ada session -> balik ke Landing (/)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        if (!data?.session) {
          navigate("/", { replace: true });
          return;
        }
      } finally {
        if (alive) setCheckingSession(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/", { replace: true });
    });

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      alert("Logout gagal. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  };

  const menu = useMemo(
    () => [
      { label: "Beranda", icon: <FiHome /> },
      { label: "Kelola Berita", icon: <FiFileText /> },
      { label: "Data Posbankum", icon: <FiUsers /> },
      { label: "Verifikasi Data Posbankum", icon: <FiCheckCircle /> },
      { label: "Riwayat Pengajuan Kegiatan", icon: <FiClock /> },
      { label: "Kelola Posbankum", icon: <FiSettings /> },
    ],
    [],
  );

  const stats = useMemo(
    () => [
      {
        title: "Total Posbankum",
        value: "128",
        icon: <FiUsers />,
        tone: "green",
      },
      {
        title: "Menunggu Verifikasi",
        value: "14",
        icon: <FiClock />,
        tone: "yellow",
      },
      {
        title: "Kegiatan Bulan Ini",
        value: "36",
        icon: <FiTrendingUp />,
        tone: "blue",
      },
    ],
    [],
  );

  const activities = useMemo(
    () => [
      {
        title: "Pengajuan kegiatan baru",
        meta: "Posbankum Sukajadi • 10 menit lalu",
        tone: "yellow",
      },
      {
        title: "Data Posbankum diverifikasi",
        meta: "Posbankum Marpoyan • 1 jam lalu",
        tone: "green",
      },
      {
        title: "Berita dipublikasikan",
        meta: "Admin • 3 jam lalu",
        tone: "blue",
      },
      {
        title: "Perubahan data paralegal",
        meta: "Posbankum Tenayan • kemarin",
        tone: "green",
      },
    ],
    [],
  );

  if (checkingSession) {
    return (
      <div className="ad" style={{ padding: 24 }}>
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="ad">
      {/* SIDEBAR */}
      <aside className="ad-side">
        <div className="ad-brand">
          <div className="ad-logo">
            <span className="ad-logoMark">P</span>
          </div>
          <div className="ad-brandText">
            <div className="ad-brandName">Posbankum</div>
            <div className="ad-brandSub">Admin Panel</div>
          </div>
        </div>

        <nav className="ad-nav">
          {menu.map((m) => (
            <button
              key={m.label}
              className={`ad-navItem ${active === m.label ? "is-active" : ""}`}
              onClick={() => setActive(m.label)}
              type="button"
            >
              <span className="ad-navIcon">{m.icon}</span>
              <span className="ad-navLabel">{m.label}</span>
            </button>
          ))}
        </nav>

        <div className="ad-sideFooter">
          <button className="ad-ghostBtn" type="button">
            <FiSettings /> Pengaturan
          </button>

          <button
            className="ad-dangerBtn"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-disabled={loggingOut}
            title={loggingOut ? "Sedang logout..." : "Keluar"}
          >
            <FiLogOut /> {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ad-main">
        {/* TOPBAR */}
        <header className="ad-top ad-topWire">
          <div className="ad-topLeft">
            <div className="ad-wireTitle">{active}</div>
          </div>

          <div className="ad-topRight">
            <div className="ad-greet">
              <div className="ad-greetAvatar">A</div>
              <div className="ad-greetText">
                Hai <span className="ad-greetName">Admin Kemenkumham</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        {active === "Beranda" ? (
          <section className="ad-grid">
            <div className="ad-cards">
              {stats.map((s) => (
                <div key={s.title} className={`ad-card tone-${s.tone}`}>
                  <div className="ad-cardIcon">{s.icon}</div>
                  <div className="ad-cardBody">
                    <div className="ad-cardTitle">{s.title}</div>
                    <div className="ad-cardValue">{s.value}</div>
                    <div className="ad-cardHint">Update real-time</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ad-panels">
              <section className="ad-panel ad-panelChart">
                <div className="ad-panelHead">
                  <div>
                    <div className="ad-panelTitle">Statistik Posbankum</div>
                    <div className="ad-panelSub">
                      Ringkasan 30 hari terakhir
                    </div>
                  </div>
                  <div className="ad-pill">30 Hari</div>
                </div>

                <div className="ad-chartBox">
                  <div className="ad-chartGrid" />
                  <div className="ad-chartBars">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="ad-bar"
                        style={{ height: `${30 + ((i * 13) % 55)}%` }}
                      />
                    ))}
                  </div>
                </div>
              </section>

              <section className="ad-panel ad-panelActivity">
                <div className="ad-panelHead">
                  <div>
                    <div className="ad-panelTitle">Aktivitas Terbaru</div>
                    <div className="ad-panelSub">
                      Notifikasi & perubahan terbaru
                    </div>
                  </div>
                  <button className="ad-linkBtn" type="button">
                    Lihat semua
                  </button>
                </div>

                <div className="ad-activityList">
                  {activities.map((a, idx) => (
                    <div key={idx} className="ad-activityItem">
                      <div className={`ad-badge tone-${a.tone}`} />
                      <div className="ad-activityText">
                        <div className="ad-activityTitle">{a.title}</div>
                        <div className="ad-activityMeta">{a.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : active === "Data Posbankum" ? (
          <DataPosbankum />
        ) : active === "Kelola Posbankum" ? (
          <KelolaPosbankum />
        ) : active === "Verifikasi Data Posbankum" ? (
          <VerifikasiDataPosbankum />
        ) : (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
            }}
          >
            Halaman <b>{active}</b> belum dibuat.
          </div>
        )}
      </main>
    </div>
  );
}
