import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiLogOut,
  FiTrendingUp,
  FiCalendar,
  FiDownload,
  FiChevronDown,
  FiSearch,
  FiActivity,
  FiX,
  FiMapPin,
  FiAlertCircle,
} from "react-icons/fi";
import "./adminDashboard.css";
import DataPosbankum from "./DataPosbankum";
import ManajemenAkun from "./ManajemenAkun";
import VerifikasiDataPosbankum from "./VerifikasiDataPosbankum";
import LaporanKegiatan from "./LaporanKegiatan";
import KelolaBerita from "./KelolaBerita";
import posbankum from "../../assets/icon.png";
import burung5 from "../../assets/burung5.png";
import AdminProfile from "./AdminProfile";

function toDateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function relativeTimeID(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);

  if (sec < 60) return `${sec} detik lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Kemarin";
  if (day < 7) return `${day} hari lalu`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} minggu lalu`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} bulan lalu`;
  const yr = Math.floor(day / 365);
  return `${yr} tahun lalu`;
}

function pickToneFromStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("verif") || s.includes("setuju") || s.includes("approve"))
    return "green";
  if (s.includes("tolak") || s.includes("reject")) return "red";
  if (s.includes("menunggu") || s.includes("pending") || s.includes("wait"))
    return "orange";
  return "blue";
}

function periodLabel(rangeDays) {
  if (rangeDays === 7) return "dari minggu lalu";
  if (rangeDays === 30) return "dari bulan lalu";
  if (rangeDays === 90) return "dari 3 bulan lalu";
  return `dari ${rangeDays} hari sebelumnya`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [active, setActive] = useState("Beranda");
  const [showProfile, setShowProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [sessionUser, setSessionUser] = useState(null);
  const [adminName, setAdminName] = useState("Admin Kemenkumham");

  const [rangeDays, setRangeDays] = useState(30);
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeWrapRef = useRef(null);

  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState("");

  const [statsValue, setStatsValue] = useState({
    totalPosbankum: 0,
    waitingVerification: 0,
    monthKegiatan: 0,
  });

  const [topActive, setTopActive] = useState([]);
  const [activities, setActivities] = useState([]);

  const [, setPosNameByIdState] = useState(new Map());

  const chartPanelRef = useRef(null);
  const [hoverTip, setHoverTip] = useState(null);
  const TIP_W = 260;

  const showTip = (e, row) => {
    if (!chartPanelRef.current) return;
    const panelRect = chartPanelRef.current.getBoundingClientRect();
    const itemRect = e.currentTarget.getBoundingClientRect();

    let x = itemRect.left - panelRect.left + itemRect.width / 2;
    const y = itemRect.top - panelRect.top + 10;

    const pad = 14;
    const half = TIP_W / 2;
    x = Math.max(half + pad, Math.min(panelRect.width - half - pad, x));

    setHoverTip({ x, y, row });
  };

  const hideTip = () => setHoverTip(null);

  const [detailRows, setDetailRows] = useState([]);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const detailPageSize = 6;

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityAll, setActivityAll] = useState([]);
  const [activityTab, setActivityTab] = useState("all");
  const [activityQuery, setActivityQuery] = useState("");
  const activitySearchRef = useRef(null);

  const openActivityModal = () => {
    setActivityOpen(true);
  };

  const closeActivityModal = () => {
    setActivityOpen(false);
  };

  useEffect(() => {
    if (!activityOpen) return;
    const t = setTimeout(() => activitySearchRef.current?.focus?.(), 60);
    return () => clearTimeout(t);
  }, [activityOpen]);

  useEffect(() => {
    if (!activityOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [activityOpen]);

  useEffect(() => {
    if (!activityOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") closeActivityModal();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [activityOpen]);

  useEffect(() => {
    if (activityOpen) return;
    setActivityTab("all");
    setActivityQuery("");
  }, [activityOpen]);

  function pickActivityIcon(ev) {
    const src = ev?.source;
    if (src === "kegiatan") return <FiCalendar />;
    if (src === "kasus") return <FiUsers />;
    if (src === "data_posbankum") {
      if (ev?.tone === "green") return <FiCheckCircle />;
      if (ev?.tone === "orange") return <FiAlertCircle />;
      return <FiFileText />;
    }
    if (src === "berita") return <FiFileText />;
    if (src === "posbankum") return <FiUsers />;
    return <FiActivity />;
  }

  const activityFiltered = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    const tab = activityTab;

    return (activityAll || []).filter((it) => {
      const group = it?.group || "administratif";
      const okTab =
        tab === "all"
          ? true
          : tab === "kk"
            ? group === "kegiatan_kasus"
            : group === "administratif";

      if (!okTab) return false;

      if (!q) return true;
      const hay =
        `${it?.title || ""} ${it?.desc || ""} ${it?.actor || ""} ${it?.kind || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activityAll, activityQuery, activityTab]);

  async function fetchAllActivitiesForModal() {
    setActivityLoading(true);
    try {
      const { data: posList, error: posErr } = await supabase
        .from("posbankum")
        .select("id_posbankum,nama,updated_at")
        .limit(5000);

      if (posErr) throw posErr;

      const posNameById = new Map();
      (posList || []).forEach((p) =>
        posNameById.set(p.id_posbankum, p.nama || "Posbankum"),
      );

      setPosNameByIdState(posNameById);

      const LIMIT = 200;

      const [kegRes, dataRes, beritaRes, posUpdRes, lihatKasusRes] =
        await Promise.all([
          supabase
            .from("kegiatan")
            .select(
              "id_kegiatan,id_posbankum,judul,deskripsi,tgl_upload,status",
            )
            .order("tgl_upload", { ascending: false })
            .limit(LIMIT),

          supabase
            .from("data_posbankum")
            .select(
              "id_data,id_posbankum,kategori,nama_berkas,tgl_upload,tgl_verifikasi,status_verifikasi",
            )
            .order("tgl_upload", { ascending: false })
            .limit(LIMIT),

          supabase
            .from("berita")
            .select("id_berita,judul,isi,tgl_publish,id_user")
            .order("tgl_publish", { ascending: false })
            .limit(LIMIT),

          supabase
            .from("posbankum")
            .select("id_posbankum,nama,updated_at")
            .order("updated_at", { ascending: false })
            .limit(LIMIT),

          supabase
            .from("lihat_kasus")
            .select("id_posbankum,id_kasus,created_at")
            .order("created_at", { ascending: false })
            .limit(LIMIT),
        ]);

      if (kegRes.error) throw kegRes.error;
      if (dataRes.error) throw dataRes.error;
      if (beritaRes.error) throw beritaRes.error;
      if (posUpdRes.error) throw posUpdRes.error;
      if (lihatKasusRes.error) throw lihatKasusRes.error;

      const kasusIds = Array.from(
        new Set(
          (lihatKasusRes.data || []).map((r) => r.id_kasus).filter(Boolean),
        ),
      );

      let kasusMap = new Map();
      if (kasusIds.length > 0) {
        const { data: kasusData, error: kasusErr } = await supabase
          .from("kasus")
          .select("id_kasus,jenis_kasus,deskripsi_kasus,tgl_upload")
          .in("id_kasus", kasusIds.slice(0, 500));
        if (!kasusErr && Array.isArray(kasusData)) {
          kasusMap = new Map(
            kasusData.map((k) => [
              k.id_kasus,
              {
                jenis_kasus: k.jenis_kasus,
                deskripsi_kasus: k.deskripsi_kasus,
                tgl_upload: k.tgl_upload,
              },
            ]),
          );
        }
      }

      const ev = [];

      (kegRes.data || []).forEach((r) => {
        const nama = posNameById.get(r.id_posbankum) || "Posbankum";
        ev.push({
          key: `kegiatan:${r.id_kegiatan}`,
          source: "kegiatan",
          group: "kegiatan_kasus",
          title: "Pengajuan kegiatan baru",
          desc: r.judul || r.deskripsi || "",
          actor: `Posbankum ${nama}`,
          time: relativeTimeID(r.tgl_upload),
          kind: "Pengajuan",
          tone: "blue",
          at: r.tgl_upload,
        });
      });

      (dataRes.data || []).forEach((r) => {
        const nama = posNameById.get(r.id_posbankum) || "Posbankum";
        const at = r.tgl_verifikasi || r.tgl_upload;

        const s = String(r.status_verifikasi || "").toLowerCase();
        const isVerified =
          s.includes("verif") || s.includes("setuju") || s.includes("approve");

        const tone = pickToneFromStatus(r.status_verifikasi);
        const safeTone = tone === "red" ? "orange" : tone;

        ev.push({
          key: `data:${r.id_data}`,
          source: "data_posbankum",
          group: "administratif",
          title: isVerified
            ? "Data Posbankum diverifikasi"
            : "Data Posbankum masuk",
          desc: isVerified
            ? "Data Posbankum telah diverifikasi dan disetujui oleh admin"
            : `Pengajuan data Posbankum ${r.kategori || ""}`.trim(),
          actor: `Posbankum ${nama}`,
          time: relativeTimeID(at),
          kind: isVerified ? "Verifikasi" : "Pengajuan",
          tone: safeTone,
          at,
        });
      });

      (beritaRes.data || []).forEach((r) => {
        ev.push({
          key: `berita:${r.id_berita}`,
          source: "berita",
          group: "administratif",
          title: "Berita dipublikasikan",
          desc: r.judul || "",
          actor: "Admin",
          time: relativeTimeID(r.tgl_publish),
          kind: "Publikasi",
          tone: "purple",
          at: r.tgl_publish,
        });
      });

      (posUpdRes.data || []).forEach((r) => {
        ev.push({
          key: `posbankum:${r.id_posbankum}:${r.updated_at || ""}`,
          source: "posbankum",
          group: "administratif",
          title: "Perubahan data paralegal",
          desc: "Data paralegal diperbarui",
          actor: `Posbankum ${r.nama || "Posbankum"}`,
          time: relativeTimeID(r.updated_at),
          kind: "Perubahan Data",
          tone: "orange",
          at: r.updated_at,
        });
      });

      (lihatKasusRes.data || []).forEach((r) => {
        const nama = posNameById.get(r.id_posbankum) || "Posbankum";
        const k = kasusMap.get(r.id_kasus) || {};
        const jenis = k.jenis_kasus ? `Kasus: ${k.jenis_kasus}` : "Kasus baru";
        const desc = k.deskripsi_kasus || jenis;

        ev.push({
          key: `kasus:${r.id_posbankum}:${r.id_kasus}:${r.created_at || ""}`,
          source: "kasus",
          group: "kegiatan_kasus",
          title: "Kasus ditangani",
          desc,
          actor: `Posbankum ${nama}`,
          time: relativeTimeID(r.created_at),
          kind: "Kasus",
          tone: "blue",
          at: r.created_at,
        });
      });

      ev.sort(
        (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime(),
      );

      setActivityAll(ev.slice(0, 400));
    } catch (e) {
      console.error(e);
      setActivityAll([]);
    } finally {
      setActivityLoading(false);
    }
  }

  useEffect(() => {
    if (!activityOpen) return;
    if (!sessionUser) return;
    if (active !== "Beranda") return;
    fetchAllActivitiesForModal();
  }, [activityOpen, sessionUser, active]);

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

        setSessionUser(data.session.user);
      } finally {
        if (alive) setCheckingSession(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      setSessionUser(session.user);
    });

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!sessionUser?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (!alive) return;
      if (!error && data?.full_name) setAdminName(data.full_name);
    })();

    return () => {
      alive = false;
    };
  }, [sessionUser?.id]);

  useEffect(() => {
    function onDocClick(e) {
      if (!rangeOpen) return;
      if (!rangeWrapRef.current) return;
      if (!rangeWrapRef.current.contains(e.target)) setRangeOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setRangeOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [rangeOpen]);

  useEffect(() => {
    setDetailPage(1);
  }, [detailSearch]);

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
      { label: "Laporan Kegiatan", icon: <FiClock /> },
      {
        label: "Manajemen Akun",
        icon: (
          <span
            className="ad-navMaskIcon"
            style={{ "--mask-url": `url(${posbankum})` }}
            aria-hidden="true"
          />
        ),
      },
    ],
    [],
  );

  const statDefs = useMemo(
    () => [
      {
        key: "totalPosbankum",
        title: "Total Posbankum",
        icon: <FiUsers />,
        tone: "green",
      },
      {
        key: "waitingVerification",
        title: "Menunggu Verifikasi",
        icon: <FiClock />,
        tone: "orange",
      },
      {
        key: "monthKegiatan",
        title: "Kesiapan Bulan Ini",
        icon: <FiTrendingUp />,
        tone: "blue",
      },
    ],
    [],
  );

  async function countRows(table, applyFilters) {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (applyFilters) q = applyFilters(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  async function fetchDashboard() {
    setDashError("");
    setDashLoading(true);

    try {
      const { data: posList, error: posErr } = await supabase
        .from("posbankum")
        .select("id_posbankum,nama,updated_at")
        .limit(5000);

      if (posErr) throw posErr;

      const posNameById = new Map();
      (posList || []).forEach((p) =>
        posNameById.set(p.id_posbankum, p.nama || "Posbankum"),
      );
      setPosNameByIdState(posNameById);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [totalPosbankum, waitingVerification, monthKegiatan] =
        await Promise.all([
          countRows("posbankum"),
          countRows("data_posbankum", (q) =>
            q.or(
              "status_verifikasi.is.null,status_verifikasi.eq.menunggu,status_verifikasi.eq.pending,status_verifikasi.eq.menunggu_verifikasi",
            ),
          ),
          countRows("kegiatan", (q) =>
            q
              .gte("tgl_mulai", toDateStr(monthStart))
              .lt("tgl_mulai", toDateStr(monthEnd)),
          ),
        ]);

      setStatsValue({ totalPosbankum, waitingVerification, monthKegiatan });

      const start = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
      const prevStart = new Date(
        Date.now() - rangeDays * 2 * 24 * 60 * 60 * 1000,
      );
      const prevEnd = start;

      const [kegNowRes, kegPrevRes, kasusNowRes, kasusPrevRes, dokNowRes] =
        await Promise.all([
          supabase
            .from("kegiatan")
            .select("id_posbankum,tgl_upload")
            .gte("tgl_upload", start.toISOString())
            .range(0, 49999),
          supabase
            .from("kegiatan")
            .select("id_posbankum,tgl_upload")
            .gte("tgl_upload", prevStart.toISOString())
            .lt("tgl_upload", prevEnd.toISOString())
            .range(0, 49999),
          supabase
            .from("lihat_kasus")
            .select("id_posbankum,created_at")
            .gte("created_at", start.toISOString())
            .range(0, 49999),
          supabase
            .from("lihat_kasus")
            .select("id_posbankum,created_at")
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", prevEnd.toISOString())
            .range(0, 49999),
          supabase
            .from("data_posbankum")
            .select("id_posbankum,tgl_upload")
            .gte("tgl_upload", start.toISOString())
            .range(0, 49999),
        ]);

      if (kegNowRes.error) throw kegNowRes.error;
      if (kegPrevRes.error) throw kegPrevRes.error;
      if (kasusNowRes.error) throw kasusNowRes.error;
      if (kasusPrevRes.error) throw kasusPrevRes.error;
      if (dokNowRes.error) throw dokNowRes.error;

      const agg = new Map();
      (posList || []).forEach((p) => {
        if (p?.id_posbankum)
          agg.set(p.id_posbankum, { k: 0, ka: 0, pk: 0, pka: 0, d: 0 });
      });

      function ensure(id) {
        if (!agg.has(id)) agg.set(id, { k: 0, ka: 0, pk: 0, pka: 0, d: 0 });
        return agg.get(id);
      }

      (kegNowRes.data || []).forEach((r) => {
        const a = ensure(r.id_posbankum);
        a.k += 1;
      });
      (kegPrevRes.data || []).forEach((r) => {
        const a = ensure(r.id_posbankum);
        a.pk += 1;
      });
      (kasusNowRes.data || []).forEach((r) => {
        const a = ensure(r.id_posbankum);
        a.ka += 1;
      });
      (kasusPrevRes.data || []).forEach((r) => {
        const a = ensure(r.id_posbankum);
        a.pka += 1;
      });
      (dokNowRes.data || []).forEach((r) => {
        const a = ensure(r.id_posbankum);
        a.d += 1;
      });

      const rowsForChart = Array.from(agg.entries()).map(([id, v]) => {
        const total = v.k + v.ka;
        const prevTotal = v.pk + v.pka;
        const growthPct =
          prevTotal > 0
            ? Math.round(((total - prevTotal) / prevTotal) * 100)
            : total > 0
              ? 100
              : 0;

        return {
          id_posbankum: id,
          nama: posNameById.get(id) || "Posbankum",
          kegiatan: v.k,
          kasus: v.ka,
          total,
          growthPct,
        };
      });

      rowsForChart.sort((a, b) => b.total - a.total);
      const top = rowsForChart.slice(0, 6);
      const maxTotal = top.reduce((m, r) => Math.max(m, r.total), 0) || 1;

      const topWithBar = top.map((r) => {
        const ratio = r.total / maxTotal;
        const barPct = Math.round(38 + ratio * 57);
        return { ...r, barPct };
      });
      setTopActive(topWithBar);

      const [kegActRes, dataActRes, beritaRes, posUpdRes] = await Promise.all([
        supabase
          .from("kegiatan")
          .select("id_kegiatan,id_posbankum,judul,tgl_upload,status")
          .order("tgl_upload", { ascending: false })
          .limit(8),
        supabase
          .from("data_posbankum")
          .select(
            "id_data,id_posbankum,kategori,tgl_upload,tgl_verifikasi,status_verifikasi",
          )
          .order("tgl_upload", { ascending: false })
          .limit(8),
        supabase
          .from("berita")
          .select("id_berita,judul,tgl_publish,id_user")
          .order("tgl_publish", { ascending: false })
          .limit(8),
        supabase
          .from("posbankum")
          .select("id_posbankum,nama,updated_at")
          .order("updated_at", { ascending: false })
          .limit(8),
      ]);

      if (kegActRes.error) throw kegActRes.error;
      if (dataActRes.error) throw dataActRes.error;
      if (beritaRes.error) throw beritaRes.error;
      if (posUpdRes.error) throw posUpdRes.error;

      const ev = [];

      (kegActRes.data || []).forEach((r) => {
        const nama = posNameById.get(r.id_posbankum) || "Posbankum";
        ev.push({
          title: "Pengajuan kegiatan baru",
          actor: `Posbankum ${nama}`,
          time: relativeTimeID(r.tgl_upload),
          kind: "Pengajuan",
          tone: "blue",
          at: r.tgl_upload,
        });
      });

      (dataActRes.data || []).forEach((r) => {
        const nama = posNameById.get(r.id_posbankum) || "Posbankum";
        const at = r.tgl_verifikasi || r.tgl_upload;

        const s = String(r.status_verifikasi || "").toLowerCase();
        const isVerified =
          s.includes("verif") || s.includes("setuju") || s.includes("approve");

        const tone = pickToneFromStatus(r.status_verifikasi);
        ev.push({
          title: isVerified
            ? "Data Posbankum diverifikasi"
            : "Data Posbankum masuk",
          actor: `Posbankum ${nama}`,
          time: relativeTimeID(at),
          kind: isVerified ? "Verifikasi" : "Pengajuan",
          tone: tone === "red" ? "orange" : tone,
          at,
        });
      });

      (beritaRes.data || []).forEach((r) => {
        ev.push({
          title: "Berita dipublikasikan",
          actor: "Admin",
          time: relativeTimeID(r.tgl_publish),
          kind: "Publikasi",
          tone: "purple",
          at: r.tgl_publish,
        });
      });

      (posUpdRes.data || []).forEach((r) => {
        ev.push({
          title: "Perubahan data paralegal",
          actor: `Posbankum ${r.nama || "Posbankum"}`,
          time: relativeTimeID(r.updated_at),
          kind: "Perubahan Data",
          tone: "orange",
          at: r.updated_at,
        });
      });

      ev.sort(
        (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime(),
      );
      setActivities(ev.slice(0, 4));

      const rowsForDetail = Array.from(agg.entries()).map(([id, v]) => {
        const total = v.k + v.ka;
        return {
          id_posbankum: id,
          nama: posNameById.get(id) || "Posbankum",
          total,
          kegiatan: v.k,
          kasus: v.ka,
          dokumen: v.d,
          status: "Aktif",
        };
      });

      rowsForDetail.sort((a, b) => b.total - a.total);
      setDetailRows(rowsForDetail);
    } catch (e) {
      console.error(e);
      setDashError(e?.message || "Gagal memuat dashboard dari database.");
    } finally {
      setDashLoading(false);
    }
  }

  useEffect(() => {
    if (active !== "Beranda") return;
    if (!sessionUser) return;
    fetchDashboard();
  }, [active, sessionUser, rangeDays]);

  function handleExport() {
    const header = ["Posbankum", "Total", "Kegiatan", "Kasus", "Growth(%)"];
    const lines = [
      header.join(","),
      ...topActive.map((r) =>
        [
          `"${String(r.nama || "").replaceAll('"', '""')}"`,
          r.total,
          r.kegiatan,
          r.kasus,
          r.growthPct,
        ].join(","),
      ),
    ];
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `posbankum-paling-aktif-${rangeDays}hari.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const detailFiltered = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    if (!q) return detailRows;
    return detailRows.filter((r) =>
      String(r.nama || "")
        .toLowerCase()
        .includes(q),
    );
  }, [detailRows, detailSearch]);

  const detailPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(detailFiltered.length / detailPageSize));
  }, [detailFiltered.length]);

  const detailPageSafe = Math.min(Math.max(1, detailPage), detailPageCount);

  const detailPageRows = useMemo(() => {
    const startIdx = (detailPageSafe - 1) * detailPageSize;
    return detailFiltered.slice(startIdx, startIdx + detailPageSize);
  }, [detailFiltered, detailPageSafe]);

  if (checkingSession) {
    return (
      <div className="ad" style={{ padding: 24 }}>
        Memuat dashboard...
      </div>
    );
  }

  const totalActivityAll = activityAll.length;
  const totalActivityFiltered = activityFiltered.length;

  return (
    <div className="ad">
      <aside className="ad-side">
        <button
          className="ad-brand ad-brandButton"
          type="button"
          onClick={() => setShowProfile(true)}
        >
          <div className="ad-brandLogoWrap">
            <img src={burung5} alt="Logo SIBAPAK" className="ad-brandLogo" />
          </div>
          <div className="ad-brandText">
            <div className="ad-brandName">SIBAPAK</div>
            <div className="ad-brandSub">Portal Operator Kanwil</div>
          </div>
        </button>
        <div className="ad-brandDivider" aria-hidden="true" />

        <nav className="ad-nav">
          {menu.map((m) => (
            <button
              key={m.label}
              className={`ad-navItem ${active === m.label ? "is-active" : ""}`}
              onClick={() => {
                setShowProfile(false);
                setActive(m.label);
              }}
              type="button"
            >
              <span className="ad-navIcon">{m.icon}</span>
              <span className="ad-navLabel">{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="ad-main">
        <header className="ad-top ad-topWire is-berita">
          <div className="ad-topLeft">
            <div className="ad-pageIntro">
              <div className="ad-pageIntroTitle">Dashboard Operator Kanwil</div>
              <div className="ad-pageIntroSub">
                Kementerian Hukum Wilayah Riau
              </div>
            </div>
          </div>

          <div className="ad-topRight">
            <button
              className="ad-topLogoutBtn"
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-disabled={loggingOut}
            >
              <FiLogOut />
              {loggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </header>

        {showProfile ? (
          <AdminProfile
            sessionUser={sessionUser}
            adminName={adminName}
            onBack={() => setShowProfile(false)}
          />
        ) : active === "Beranda" ? (
          <section className="ad-grid">
            <div className="ad-cards">
              {statDefs.map((s) => (
                <div key={s.key} className={`ad-card tone-${s.tone}`}>
                  <div className="ad-cardIcon">{s.icon}</div>
                  <div className="ad-cardBody">
                    <div className="ad-cardTitle">{s.title}</div>
                    <div className="ad-cardValue">
                      {dashLoading ? (
                        <span className="ad-skel sk-num" />
                      ) : (
                        statsValue[s.key]
                      )}
                    </div>
                    <div className="ad-cardHint">Update real-time</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ad-panels">
              <section className="ad-panel ad-panelChart" ref={chartPanelRef}>
                <div className="ad-panelHead">
                  <div>
                    <div className="ad-panelTitle">Posbankum Paling Aktif</div>
                    <div className="ad-panelSub">
                      Total kegiatan & kasus ditangani
                    </div>
                  </div>

                  <div className="ad-headActions">
                    <div className="ad-dd" ref={rangeWrapRef}>
                      <button
                        className={`ad-filterBtn ${rangeOpen ? "is-open" : ""}`}
                        type="button"
                        onClick={() => setRangeOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={rangeOpen}
                      >
                        <FiCalendar />
                        <span>{rangeDays} Hari</span>
                        <FiChevronDown />
                      </button>

                      {rangeOpen ? (
                        <div className="ad-ddMenu" role="menu">
                          {[7, 30, 90].map((d) => (
                            <button
                              key={d}
                              className={`ad-ddItem ${rangeDays === d ? "is-active" : ""}`}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setRangeDays(d);
                                setRangeOpen(false);
                              }}
                            >
                              {d} Hari
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <button
                      className="ad-exportBtn"
                      type="button"
                      onClick={handleExport}
                      disabled={dashLoading}
                    >
                      <FiDownload /> Export
                    </button>
                  </div>
                </div>

                {dashError ? (
                  <div className="ad-errorBox">{dashError}</div>
                ) : null}

                {hoverTip && !dashLoading ? (
                  <div
                    className="ad-hoverTip"
                    style={{ left: hoverTip.x, top: hoverTip.y }}
                    role="tooltip"
                    aria-hidden="true"
                  >
                    <div className="ad-tipTitle">
                      Posbankum {hoverTip.row?.nama}
                    </div>

                    <div className="ad-tipGrid">
                      <div className="ad-tipLabel">Total:</div>
                      <div className="ad-tipVal">
                        {hoverTip.row?.total ?? 0}
                      </div>

                      <div className="ad-tipLabel">Kegiatan:</div>
                      <div className="ad-tipVal">
                        {hoverTip.row?.kegiatan ?? 0}
                      </div>

                      <div className="ad-tipLabel">Kasus:</div>
                      <div className="ad-tipVal">
                        {hoverTip.row?.kasus ?? 0}
                      </div>
                    </div>

                    <div
                      className={`ad-tipGrowth ${(hoverTip.row?.growthPct ?? 0) >= 0 ? "is-up" : "is-down"}`}
                    >
                      {(hoverTip.row?.growthPct ?? 0) >= 0 ? "+" : ""}
                      {hoverTip.row?.growthPct ?? 0}% {periodLabel(rangeDays)}
                    </div>
                  </div>
                ) : null}

                <div className="ad-activeBars">
                  {(dashLoading ? Array.from({ length: 6 }) : topActive).map(
                    (r, idx) => (
                      <div
                        key={r?.id_posbankum || idx}
                        className="ad-activeItem"
                        onMouseEnter={(e) => {
                          if (!dashLoading && r) showTip(e, r);
                        }}
                        onMouseLeave={hideTip}
                        onFocus={(e) => {
                          if (!dashLoading && r) showTip(e, r);
                        }}
                        onBlur={hideTip}
                        tabIndex={dashLoading ? -1 : 0}
                      >
                        <div className="ad-activeTop">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            r.total
                          )}
                        </div>

                        <div className="ad-barArea" aria-hidden="true">
                          <div
                            className="ad-pillBar"
                            style={{
                              height: dashLoading ? "88%" : `${r.barPct}%`,
                            }}
                          />
                        </div>

                        <div className="ad-activeName">
                          {dashLoading ? (
                            <span className="ad-skel sk-line" />
                          ) : (
                            r.nama
                          )}
                        </div>

                        <div className="ad-activeGrowth">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            <span
                              className={r.growthPct >= 0 ? "is-up" : "is-down"}
                            >
                              {r.growthPct >= 0 ? "+" : ""}
                              {r.growthPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section className="ad-panel ad-panelActivity">
                <div className="ad-panelHead">
                  <div>
                    <div className="ad-panelTitle">Aktivitas Terbaru</div>
                  </div>

                  <button
                    className="ad-linkBtn"
                    type="button"
                    onClick={openActivityModal}
                  >
                    Lihat semua
                  </button>
                </div>

                <div className="ad-activityList">
                  {(dashLoading ? Array.from({ length: 5 }) : activities).map(
                    (a, idx) => (
                      <div key={idx} className="ad-activityItem">
                        <div
                          className={`ad-stripe tone-${a?.tone || "blue"}`}
                          aria-hidden="true"
                        />
                        <div className="ad-activityText">
                          <div className="ad-activityTitle">
                            {dashLoading ? (
                              <span className="ad-skel sk-line" />
                            ) : (
                              a.title
                            )}
                          </div>

                          <div className="ad-activityMeta">
                            {dashLoading ? (
                              <>
                                <div className="ad-activityActor">
                                  <span
                                    className="ad-skel sk-line"
                                    style={{ width: 150 }}
                                  />
                                </div>
                                <div className="ad-activityTime">
                                  <span
                                    className="ad-skel sk-line"
                                    style={{ width: 110 }}
                                  />
                                </div>
                                <div className="ad-activityKind">
                                  <span
                                    className="ad-skel sk-line"
                                    style={{ width: 120 }}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="ad-activityActor">
                                  {a.actor}
                                </div>
                                <div className="ad-activityTime">{a.time}</div>
                                <div className="ad-activityKind">{a.kind}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            </div>

            <section className="ad-panel ad-detailPanel">
              <div className="ad-detailHead">
                <div>
                  <div className="ad-panelTitle">Detail Kegiatan Posbankum</div>
                  <div className="ad-panelSub">
                    Breakdown per jenis kegiatan
                  </div>
                </div>

                <div className="ad-searchWrap">
                  <FiSearch className="ad-searchIcon" />
                  <input
                    className="ad-searchInput"
                    placeholder="Cari Posbankum..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="ad-tableWrap">
                <table className="ad-table">
                  <colgroup>
                    <col style={{ width: "46%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>POSBANKUM</th>
                      <th className="is-center">TOTAL KEGIATAN</th>
                      <th className="is-center">KEGIATAN</th>
                      <th className="is-center">KASUS</th>
                      <th className="is-center">DOKUMEN</th>
                      <th className="is-center">STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(dashLoading
                      ? Array.from({ length: detailPageSize })
                      : detailPageRows
                    ).map((r, idx) => (
                      <tr key={r?.id_posbankum || idx}>
                        <td>
                          <div className="ad-posCell">
                            <span className="ad-posDot" />
                            <span className="ad-posName">
                              {dashLoading ? (
                                <span
                                  className="ad-skel sk-line"
                                  style={{ width: 260 }}
                                />
                              ) : (
                                `Posbankum ${r.nama}`
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="is-center">
                          {dashLoading ? (
                            <span
                              className="ad-skel sk-mini"
                              style={{ width: 46, height: 28 }}
                            />
                          ) : (
                            <span className="ad-pillBlue">{r.total}</span>
                          )}
                        </td>

                        <td className="is-center">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            r.kegiatan
                          )}
                        </td>

                        <td className="is-center">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            r.kasus
                          )}
                        </td>

                        <td className="is-center">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            r.dokumen
                          )}
                        </td>

                        <td className="is-center">
                          {dashLoading ? (
                            <span
                              className="ad-skel sk-mini"
                              style={{ width: 66, height: 28 }}
                            />
                          ) : (
                            <span className="ad-pillGreen">{r.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ad-pager">
                <button
                  className="ad-pagerBtn"
                  type="button"
                  onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                  disabled={detailPageSafe <= 1}
                >
                  Sebelumnya
                </button>

                <div className="ad-pagerInfo">
                  Halaman {detailPageSafe} dari {detailPageCount}
                </div>

                <button
                  className="ad-pagerBtn"
                  type="button"
                  onClick={() =>
                    setDetailPage((p) => Math.min(detailPageCount, p + 1))
                  }
                  disabled={detailPageSafe >= detailPageCount}
                >
                  Selanjutnya
                </button>
              </div>
            </section>
          </section>
        ) : active === "Kelola Berita" ? (
          <div className="ad-pagePad ad-pagePadBerita">
            <KelolaBerita
              currentUserId={sessionUser?.id || ""}
              currentUserName={adminName}
            />
          </div>
        ) : active === "Data Posbankum" ? (
          <div className="ad-pagePad">
            <DataPosbankum />
          </div>
        ) : active === "Manajemen Akun" ? (
          <div className="ad-pagePad">
            <ManajemenAkun />
          </div>
        ) : active === "Verifikasi Data Posbankum" ? (
          <div className="ad-pagePad">
            <VerifikasiDataPosbankum />
          </div>
        ) : active === "Laporan Kegiatan" ? (
          <div className="ad-pagePad">
            <LaporanKegiatan />
          </div>
        ) : (
          <div className="ad-panel" style={{ margin: 24 }}>
            Halaman <b>{active}</b> belum dibuat.
          </div>
        )}
      </main>

      {activityOpen ? (
        <div
          className="ad-modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Semua Aktivitas Terbaru"
        >
          <div className="ad-modalBackdrop" onClick={closeActivityModal} />

          <div className="ad-modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modalHead">
              <div className="ad-modalHeadIcon" aria-hidden="true">
                <FiActivity />
              </div>

              <div className="ad-modalHeadText">
                <div className="ad-modalTitle">Semua Aktivitas Terbaru</div>
                <div className="ad-modalSub">
                  {activityLoading
                    ? "Memuat aktivitas..."
                    : `${totalActivityAll} Aktivitas dari semua Posbankum`}
                </div>
              </div>

              <button
                className="ad-modalHeadIconBtn"
                type="button"
                onClick={closeActivityModal}
                aria-label="Tutup"
              >
                <FiX />
              </button>
            </div>

            <div className="ad-modalFilterRow">
              <div className="ad-modalTabs" role="tablist">
                <button
                  type="button"
                  className={`ad-modalTab ${activityTab === "all" ? "is-active" : ""}`}
                  onClick={() => setActivityTab("all")}
                  role="tab"
                  aria-selected={activityTab === "all"}
                >
                  Semua
                </button>

                <button
                  type="button"
                  className={`ad-modalTab ${activityTab === "kk" ? "is-active" : ""}`}
                  onClick={() => setActivityTab("kk")}
                  role="tab"
                  aria-selected={activityTab === "kk"}
                >
                  Kegiatan &amp; Kasus
                </button>

                <button
                  type="button"
                  className={`ad-modalTab ${activityTab === "admin" ? "is-active" : ""}`}
                  onClick={() => setActivityTab("admin")}
                  role="tab"
                  aria-selected={activityTab === "admin"}
                >
                  Administratif
                </button>
              </div>

              <div className="ad-modalSearch">
                <FiSearch className="ad-modalSearchIcon" />
                <input
                  ref={activitySearchRef}
                  className="ad-modalSearchInput"
                  placeholder="Cari judul atau lokasi..."
                  value={activityQuery}
                  onChange={(e) => setActivityQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="ad-modalList">
              {(activityLoading
                ? Array.from({ length: 6 })
                : activityFiltered
              ).map((it, idx) => {
                const tone = it?.tone || "blue";
                const badge = it?.kind || "Aktivitas";

                return (
                  <div
                    key={it?.key || idx}
                    className={`ad-modalItem tone-${tone}`}
                  >
                    <div
                      className={`ad-modalStripe tone-${tone}`}
                      aria-hidden="true"
                    />

                    <div className="ad-modalIconWrap" aria-hidden="true">
                      {activityLoading ? (
                        <span className="ad-skel sk-mini" />
                      ) : (
                        pickActivityIcon(it)
                      )}
                    </div>

                    <div className="ad-modalBody">
                      <div className="ad-modalItemTitle">
                        {activityLoading ? (
                          <span
                            className="ad-skel sk-line"
                            style={{ width: 240 }}
                          />
                        ) : (
                          it?.title
                        )}
                      </div>

                      <div className="ad-modalItemDesc">
                        {activityLoading ? (
                          <span
                            className="ad-skel sk-line"
                            style={{ width: 360 }}
                          />
                        ) : (
                          it?.desc || ""
                        )}
                      </div>

                      <div className="ad-modalMeta">
                        <div className="ad-modalMetaChip">
                          <FiMapPin />{" "}
                          {activityLoading ? (
                            <span
                              className="ad-skel sk-line"
                              style={{ width: 140 }}
                            />
                          ) : (
                            it?.actor || "-"
                          )}
                        </div>

                        <div className="ad-modalMetaChip">
                          <FiClock />{" "}
                          {activityLoading ? (
                            <span
                              className="ad-skel sk-line"
                              style={{ width: 90 }}
                            />
                          ) : (
                            it?.time || ""
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`ad-modalBadge tone-${tone}`}>
                      {activityLoading ? "..." : badge}
                    </div>
                  </div>
                );
              })}

              {!activityLoading && totalActivityFiltered === 0 ? (
                <div className="ad-modalEmpty">
                  Tidak ada aktivitas yang cocok dengan filter/pencarian.
                </div>
              ) : null}
            </div>

            <div className="ad-modalFoot">
              <div className="ad-modalCount">
                Menampilkan <b>{totalActivityFiltered}</b> dari{" "}
                <b>{totalActivityAll}</b> total aktivitas
              </div>

              <button
                className="ad-modalCloseBtn"
                type="button"
                onClick={closeActivityModal}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
