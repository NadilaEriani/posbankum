import { useMemo, useState } from "react";
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiSettings,
  FiLogOut,
  FiBell,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";
import "./adminDashboard.css";

export default function AdminDashboard() {
  const [active, setActive] = useState("Beranda");

  const menu = useMemo(
    () => [
      { label: "Beranda", icon: <FiHome /> },
      { label: "Kelola Berita", icon: <FiFileText /> },
      { label: "Data Posbakum", icon: <FiUsers /> },
      { label: "Verifikasi Data Posbakum", icon: <FiCheckCircle /> },
      { label: "Riwayat Pengajuan Kegiatan", icon: <FiClock /> },
      { label: "Kelola Posbakum", icon: <FiSettings /> },
    ],
    []
  );

  const stats = useMemo(
    () => [
      {
        title: "Total Posbakum",
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
    []
  );

  const activities = useMemo(
    () => [
      {
        title: "Pengajuan kegiatan baru",
        meta: "Posbakum Sukajadi • 10 menit lalu",
        tone: "yellow",
      },
      {
        title: "Data Posbakum diverifikasi",
        meta: "Posbakum Marpoyan • 1 jam lalu",
        tone: "green",
      },
      {
        title: "Berita dipublikasikan",
        meta: "Admin • 3 jam lalu",
        tone: "blue",
      },
      {
        title: "Perubahan data paralegal",
        meta: "Posbakum Tenayan • kemarin",
        tone: "green",
      },
    ],
    []
  );

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
          <button className="ad-dangerBtn" type="button">
            <FiLogOut /> Keluar
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ad-main">
        {/* TOPBAR */}
        <header className="ad-top">
          <div className="ad-topLeft">
            <div className="ad-pageTitle">Dashboard</div>
            <div className="ad-breadcrumb">{active}</div>
          </div>

          <div className="ad-topRight">
            <div className="ad-search">
              <FiSearch className="ad-searchIcon" />
              <input className="ad-searchInput" placeholder="Cari data..." />
            </div>

            <button
              className="ad-iconBtn"
              type="button"
              aria-label="Notifikasi"
            >
              <FiBell />
              <span className="ad-dot" />
            </button>

            <div className="ad-user">
              <div className="ad-userAvatar">A</div>
              <div className="ad-userText">
                <div className="ad-userName">Admin Kemenkumham</div>
                <div className="ad-userRole">Administrator</div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT GRID */}
        <section className="ad-grid">
          {/* STAT CARDS */}
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

          {/* CHART + ACTIVITY */}
          <div className="ad-panels">
            <section className="ad-panel ad-panelChart">
              <div className="ad-panelHead">
                <div>
                  <div className="ad-panelTitle">Statistik Posbakum</div>
                  <div className="ad-panelSub">Ringkasan 30 hari terakhir</div>
                </div>
                <div className="ad-pill">30 Hari</div>
              </div>

              {/* Placeholder chart */}
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
      </main>
    </div>
  );
}
