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
  FiX,
  FiMapPin,
  FiExternalLink,
  FiPhone,
  FiAlertCircle,
  FiUserPlus,
  FiUser,
} from "react-icons/fi";
import { TbFileCheck } from "react-icons/tb";
import { BsCheck2Circle } from "react-icons/bs";
import { HiOutlineNewspaper } from "react-icons/hi2";
import "./adminDashboard.css";
import DataPosbankum from "./DataPosbankum";
import ManajemenAkun from "./ManajemenAkun";
import VerifikasiDataPosbankum from "./VerifikasiDataPosbankum";
import LaporanKegiatan from "./LaporanKegiatan";
import KelolaBerita from "./KelolaBerita";
import posbankum from "../../assets/icon.png";
import logo from "../../assets/logo.png";
import AdminProfile from "./AdminProfile";

function toDateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stripPosbankumPrefix(name) {
  const raw = String(name || "Posbankum").trim();
  return raw.replace(/^posbankum\s+/i, "") || raw;
}

function formatPosbankumName(name) {
  const cleanName = stripPosbankumPrefix(name);
  return `Posbankum ${cleanName}`.trim();
}

function formatDateID(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function relativeTimeID(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));

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

function periodLabel(rangeDays) {
  if (rangeDays === 7) return "dari minggu lalu";
  if (rangeDays === 30) return "dari bulan lalu";
  if (rangeDays === 90) return "dari 3 bulan lalu";
  return `dari ${rangeDays} hari sebelumnya`;
}

function pickToneFromStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("verif") || s.includes("setuju") || s.includes("approve")) {
    return "green";
  }
  if (s.includes("tolak") || s.includes("reject")) return "orange";
  if (s.includes("menunggu") || s.includes("pending") || s.includes("wait")) {
    return "orange";
  }
  return "blue";
}

function normalizeWhatsAppNumber(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return "";

  let cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = `62${cleaned.slice(1)}`;
  if (!cleaned.startsWith("62") && cleaned.length >= 8)
    cleaned = `62${cleaned}`;

  return cleaned.replace(/\D/g, "");
}

function getWhatsAppUrl(phone, posName) {
  const waNumber = normalizeWhatsAppNumber(phone);
  if (!waNumber) return "";

  const message = `Halo, saya ingin menghubungi paralegal ${posName || "Posbankum"}.`;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

function getMapsUrl(detail) {
  const lat = Number(String(detail?.latitude ?? "").replace(",", "."));
  const lng = Number(String(detail?.longitude ?? "").replace(",", "."));

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const alamat = String(detail?.alamat || detail?.nama || "").trim();
  return alamat
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}`
    : "https://www.google.com/maps";
}

function buildPreferredHomeActivities(list) {
  const preferredTitles = [
    "Pengajuan kegiatan baru",
    "Data Posbankum diverifikasi",
    "Berita dipublikasikan",
    "Perubahan data paralegal",
  ];

  const chosen = [];
  const used = new Set();

  preferredTitles.forEach((title) => {
    const match = list.find(
      (item) => item.title === title && !used.has(item.key),
    );
    if (match) {
      used.add(match.key);
      chosen.push(match);
    }
  });

  list.forEach((item) => {
    if (chosen.length >= 4) return;
    if (used.has(item.key)) return;
    used.add(item.key);
    chosen.push(item);
  });

  return chosen.slice(0, 4);
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
  const [activityAll, setActivityAll] = useState([]);
  const [detailRows, setDetailRows] = useState([]);

  const [detailSearch, setDetailSearch] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const detailPageSize = 6;

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityTab, setActivityTab] = useState("all");

  const [selectedPosDetail, setSelectedPosDetail] = useState(null);

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
        icon: <PosbankumAssetIcon className="ad-cardAssetIcon" />,
        tone: "blue",
      },
      {
        key: "waitingVerification",
        title: "Menunggu Verifikasi",
        icon: <FiClock />,
        tone: "orange",
      },
      {
        key: "monthKegiatan",
        title: "Kegiatan Bulan Ini",
        icon: <FiTrendingUp />,
        tone: "green",
      },
    ],
    [],
  );

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

  const openActivityModal = () => setActivityOpen(true);
  const closeActivityModal = () => setActivityOpen(false);
  const closeDetailModal = () => setSelectedPosDetail(null);

  function PosbankumAssetIcon({ className = "ad-assetIcon" }) {
    return (
      <img src={posbankum} alt="" className={className} aria-hidden="true" />
    );
  }

  function pickActivityIcon(ev) {
    const title = String(ev?.title || "").toLowerCase();
    const src = String(ev?.source || "").toLowerCase();

    if (title.includes("pengajuan kegiatan") || src === "kegiatan") {
      return <TbFileCheck />;
    }
    if (title.includes("diverifikasi") || src === "data_posbankum") {
      return <BsCheck2Circle />;
    }
    if (title.includes("berita") || src === "berita") {
      return <HiOutlineNewspaper />;
    }
    if (title.includes("paralegal") || src === "paralegal") {
      return <FiUserPlus />;
    }
    return <TbFileCheck />;
  }

  async function countRows(table, applyFilters) {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (applyFilters) q = applyFilters(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  async function fetchActivitiesData(posList) {
    const posById = new Map();
    (posList || []).forEach((p) => posById.set(p.id_posbankum, p));

    const LIMIT = 200;
    const [
      kegiatanRes,
      dataPosRes,
      beritaRes,
      paralegalRes,
      lihatKasusRes,
      kasusRes,
    ] = await Promise.all([
      supabase
        .from("kegiatan")
        .select("id_kegiatan,id_posbankum,judul,deskripsi,tgl_upload,status")
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
        .select("id_berita,judul,isi,tgl_publish")
        .order("tgl_publish", { ascending: false })
        .limit(LIMIT),
      supabase
        .from("paralegal_members")
        .select(
          "id_paralegal,id_posbankum,nama_paralegal,updated_at,created_at",
        )
        .order("updated_at", { ascending: false })
        .limit(LIMIT),
      supabase
        .from("lihat_kasus")
        .select("id_posbankum,id_kasus,created_at")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabase
        .from("kasus")
        .select("id_kasus,jenis_kasus,deskripsi_kasus")
        .limit(LIMIT),
    ]);

    if (kegiatanRes.error) throw kegiatanRes.error;
    if (dataPosRes.error) throw dataPosRes.error;
    if (beritaRes.error) throw beritaRes.error;
    if (paralegalRes.error) throw paralegalRes.error;
    if (lihatKasusRes.error) throw lihatKasusRes.error;
    if (kasusRes.error) throw kasusRes.error;

    const kasusMap = new Map(
      (kasusRes.data || []).map((k) => [
        k.id_kasus,
        {
          jenis_kasus: k.jenis_kasus,
          deskripsi_kasus: k.deskripsi_kasus,
        },
      ]),
    );

    const events = [];

    (kegiatanRes.data || []).forEach((item) => {
      const pos = posById.get(item.id_posbankum);
      const posName = pos?.nama || "Posbankum";
      const at = item.tgl_upload;
      events.push({
        key: `kegiatan:${item.id_kegiatan}`,
        source: "kegiatan",
        group: "kegiatan_kasus",
        title: "Pengajuan kegiatan baru",
        desc:
          item.judul || item.deskripsi || "Pengajuan kegiatan dari Posbankum",
        actor: posName,
        actorLabel: posName,
        dateLabel: formatDateID(at),
        time: relativeTimeID(at),
        kind: "Pengajuan",
        tone: "blue",
        at,
      });
    });

    (dataPosRes.data || []).forEach((item) => {
      const pos = posById.get(item.id_posbankum);
      const posName = pos?.nama || "Posbankum";
      const at = item.tgl_verifikasi || item.tgl_upload;
      const status = String(item.status_verifikasi || "").toLowerCase();
      const verified =
        status.includes("verif") ||
        status.includes("setuju") ||
        status.includes("approve");

      if (!verified) return;

      events.push({
        key: `data:${item.id_data}`,
        source: "data_posbankum",
        group: "administratif",
        title: "Data Posbankum diverifikasi",
        desc: `Data ${item.kategori || "Posbankum"} sudah diverifikasi admin`,
        actor: posName,
        actorLabel: posName,
        dateLabel: formatDateID(at),
        time: relativeTimeID(at),
        kind: "Verifikasi",
        tone: pickToneFromStatus(item.status_verifikasi),
        at,
      });
    });

    (beritaRes.data || []).forEach((item) => {
      const at = item.tgl_publish;
      events.push({
        key: `berita:${item.id_berita}`,
        source: "berita",
        group: "administratif",
        title: "Berita dipublikasikan",
        desc: item.judul || item.isi || "Berita Posbankum telah dipublikasikan",
        actor: "Admin",
        actorLabel: "Admin",
        dateLabel: formatDateID(at),
        time: relativeTimeID(at),
        kind: "Publikasi",
        tone: "blue",
        at,
      });
    });

    const latestParalegalByPos = new Map();
    (paralegalRes.data || []).forEach((item) => {
      if (!item?.id_posbankum || latestParalegalByPos.has(item.id_posbankum))
        return;
      latestParalegalByPos.set(item.id_posbankum, item);
    });
    Array.from(latestParalegalByPos.values()).forEach((item) => {
      const pos = posById.get(item.id_posbankum);
      const posName = pos?.nama || "Posbankum";
      const at = item.updated_at || item.created_at;
      events.push({
        key: `paralegal:${item.id_paralegal}`,
        source: "paralegal",
        group: "administratif",
        title: "Perubahan data paralegal",
        desc: `Update informasi paralegal ${item.nama_paralegal || "Posbankum"}`,
        actor: posName,
        actorLabel: posName,
        dateLabel: formatDateID(at),
        time: relativeTimeID(at),
        kind: "Perubahan Data",
        tone: "orange",
        at,
      });
    });

    (lihatKasusRes.data || []).forEach((item) => {
      const pos = posById.get(item.id_posbankum);
      const posName = pos?.nama || "Posbankum";
      const kasus = kasusMap.get(item.id_kasus) || {};
      const at = item.created_at;
      events.push({
        key: `kasus:${item.id_posbankum}:${item.id_kasus}:${item.created_at || ""}`,
        source: "kasus",
        group: "kegiatan_kasus",
        title: kasus.jenis_kasus
          ? `Penanganan ${kasus.jenis_kasus}`
          : "Kasus ditangani",
        desc: kasus.deskripsi_kasus || "Kasus baru sedang diproses Posbankum",
        actor: posName,
        actorLabel: posName,
        dateLabel: formatDateID(at),
        time: relativeTimeID(at),
        kind: "Kegiatan",
        tone: "blue",
        at,
      });
    });

    events.sort(
      (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime(),
    );
    return events;
  }

  async function fetchDashboard() {
    setDashError("");
    setDashLoading(true);

    try {
      const { data: posList, error: posErr } = await supabase
        .from("posbankum")
        .select(
          "id_posbankum,nama,alamat,nomor_tlp,nama_paralegal,latitude,longitude,updated_at",
        )
        .order("nama", { ascending: true })
        .limit(5000);

      if (posErr) throw posErr;

      const { data: paralegalList, error: paralegalErr } = await supabase
        .from("paralegal_members")
        .select(
          "id_posbankum,nama_paralegal,nomor_telepon,is_primary,updated_at,created_at",
        )
        .order("created_at", { ascending: true })
        .limit(5000);

      if (paralegalErr) throw paralegalErr;

      const paralegalByPosId = new Map();
      (paralegalList || []).forEach((item) => {
        if (!item?.id_posbankum || paralegalByPosId.has(item.id_posbankum))
          return;
        paralegalByPosId.set(item.id_posbankum, item);
      });

      const posById = new Map();
      (posList || []).forEach((p) => {
        posById.set(p.id_posbankum, {
          ...p,
          nama_pendek: stripPosbankumPrefix(p.nama),
        });
      });

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

      const rows = Array.from(agg.entries()).map(([id, v]) => {
        const total = v.k + v.ka;
        const prevTotal = v.pk + v.pka;
        const growthPct =
          prevTotal > 0
            ? Math.round(((total - prevTotal) / prevTotal) * 100)
            : total > 0
              ? 100
              : 0;

        const pos = posById.get(id) || {};
        const paralegal = paralegalByPosId.get(id) || {};
        return {
          id_posbankum: id,
          nama: formatPosbankumName(pos.nama),
          namaPendek: pos.nama_pendek || stripPosbankumPrefix(pos.nama),
          alamat: pos.alamat || "-",
          nomor_tlp: pos.nomor_tlp || "-",
          nama_paralegal: paralegal.nama_paralegal || "-",
          nomor_paralegal: paralegal.nomor_telepon || pos.nomor_tlp || "",
          latitude: pos.latitude,
          longitude: pos.longitude,
          kegiatan: v.k,
          kasus: v.ka,
          dokumen: v.d,
          total,
          growthPct,
          status: "Aktif",
        };
      });

      rows.sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama));

      const top = rows.slice(0, 6);
      const maxTotal =
        top.reduce((max, item) => Math.max(max, item.total), 0) || 1;
      const topWithBar = top.map((item) => ({
        ...item,
        barPct: Math.max(36, Math.round((item.total / maxTotal) * 100)),
      }));

      setTopActive(topWithBar);
      setDetailRows(rows);

      const allActivities = await fetchActivitiesData(posList || []);
      setActivityAll(allActivities);
      setActivities(buildPreferredHomeActivities(allActivities));
    } catch (e) {
      console.error(e);
      setDashError(e?.message || "Gagal memuat dashboard dari database.");
      setTopActive([]);
      setDetailRows([]);
      setActivities([]);
      setActivityAll([]);
    } finally {
      setDashLoading(false);
    }
  }

  async function fetchAllActivitiesForModal() {
    setActivityLoading(true);
    try {
      const { data: posList, error: posErr } = await supabase
        .from("posbankum")
        .select("id_posbankum,nama")
        .order("nama", { ascending: true })
        .limit(5000);
      if (posErr) throw posErr;
      const events = await fetchActivitiesData(posList || []);
      setActivityAll(events);
    } catch (error) {
      console.error(error);
      setActivityAll([]);
    } finally {
      setActivityLoading(false);
    }
  }

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
      if (!rangeOpen || !rangeWrapRef.current) return;
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

  useEffect(() => {
    if (active !== "Beranda" || !sessionUser) return;
    fetchDashboard();
  }, [active, sessionUser, rangeDays]);

  useEffect(() => {
    if (!sessionUser || active !== "Beranda") return;

    const channel = supabase
      .channel(`admin-dashboard-${sessionUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posbankum" },
        () => fetchDashboard(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kegiatan" },
        () => fetchDashboard(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_posbankum" },
        () => fetchDashboard(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lihat_kasus" },
        () => fetchDashboard(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "berita" },
        () => fetchDashboard(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "paralegal_members" },
        () => fetchDashboard(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUser, active, rangeDays]);

  useEffect(() => {
    if (!activityOpen || !sessionUser || active !== "Beranda") return;
    fetchAllActivitiesForModal();
  }, [activityOpen, sessionUser, active]);

  useEffect(() => {
    if (!activityOpen && !selectedPosDetail) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [activityOpen, selectedPosDetail]);

  useEffect(() => {
    if (!activityOpen && !selectedPosDetail) return;
    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      if (selectedPosDetail) {
        closeDetailModal();
        return;
      }
      if (activityOpen) closeActivityModal();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [activityOpen, selectedPosDetail]);

  const activityFiltered = useMemo(() => {
    if (activityTab === "all") return activityAll;
    if (activityTab === "kk") {
      return activityAll.filter((item) => item.group === "kegiatan_kasus");
    }
    return activityAll.filter((item) => item.group === "administratif");
  }, [activityAll, activityTab]);

  const detailFiltered = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    if (!q) return detailRows;
    return detailRows.filter((row) =>
      String(row.nama || "")
        .toLowerCase()
        .includes(q),
    );
  }, [detailRows, detailSearch]);

  const detailPageCount = useMemo(
    () => Math.max(1, Math.ceil(detailFiltered.length / detailPageSize)),
    [detailFiltered.length],
  );

  const detailPageSafe = Math.min(Math.max(1, detailPage), detailPageCount);

  const detailPageRows = useMemo(() => {
    const startIdx = (detailPageSafe - 1) * detailPageSize;
    return detailFiltered.slice(startIdx, startIdx + detailPageSize);
  }, [detailFiltered, detailPageSafe]);

  function handleExport() {
    const header = ["Posbankum", "Total", "Kegiatan", "Kasus", "Growth(%)"];
    const lines = [
      header.join(","),
      ...topActive.map((row) =>
        [
          `"${String(row.nama || "").replaceAll('"', '""')}"`,
          row.total,
          row.kegiatan,
          row.kasus,
          row.growthPct,
        ].join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `posbankum-paling-aktif-${rangeDays}hari.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalActivityAll = activityAll.length;
  const totalActivityFiltered = activityFiltered.length;

  if (checkingSession) {
    return (
      <div className="ad" style={{ padding: 24 }}>
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="ad">
      <aside className="ad-side">
        <button
          className="ad-brand ad-brandButton"
          type="button"
          onClick={() => setShowProfile(true)}
        >
          <div className="ad-brandLogoWrap">
            <img src={logo} alt="Logo SIBAPAK" className="ad-brandLogo" />
          </div>
          <div className="ad-brandText">
            <div className="ad-brandName">SIBAPAK</div>
            <div className="ad-brandSub">Posbankum Kemenkum Riau</div>
          </div>
        </button>
        <div className="ad-brandDivider" aria-hidden="true" />

        <nav className="ad-nav">
          {menu.map((item) => (
            <button
              key={item.label}
              className={`ad-navItem ${active === item.label ? "is-active" : ""}`}
              onClick={() => {
                setShowProfile(false);
                setActive(item.label);
              }}
              type="button"
            >
              <span className="ad-navIcon">{item.icon}</span>
              <span className="ad-navLabel">{item.label}</span>
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
            <div className="ad-wireTitle">Dashboard</div>

            <div className="ad-cards">
              {statDefs.map((item) => (
                <div key={item.key} className={`ad-card tone-${item.tone}`}>
                  <div className="ad-cardIcon">{item.icon}</div>
                  <div className="ad-cardBody">
                    <div className="ad-cardTitle">{item.title}</div>
                    <div className="ad-cardValue">
                      {dashLoading ? (
                        <span className="ad-skel sk-num" />
                      ) : (
                        statsValue[item.key]
                      )}
                    </div>
                    <div className="ad-cardHint">Update real-time</div>
                  </div>
                </div>
              ))}
            </div>

            {dashError ? <div className="ad-errorBox">{dashError}</div> : null}

            <div className="ad-panels">
              <section className="ad-panel ad-panelChart">
                <div className="ad-panelHead">
                  <div>
                    <div className="ad-panelTitle">Posbankum Paling Aktif</div>
                    <div className="ad-panelSub">
                      Total Kegiatan &amp; Kasus Diselesaikan
                    </div>
                  </div>

                  <div className="ad-headActions">
                    <div className="ad-dd" ref={rangeWrapRef}>
                      <button
                        className={`ad-filterBtn ${rangeOpen ? "is-open" : ""}`}
                        type="button"
                        onClick={() => setRangeOpen((prev) => !prev)}
                        aria-haspopup="menu"
                        aria-expanded={rangeOpen}
                      >
                        <FiCalendar />
                        <span>{rangeDays} Hari</span>
                        <FiChevronDown />
                      </button>

                      {rangeOpen ? (
                        <div className="ad-ddMenu" role="menu">
                          {[7, 30, 90].map((day) => (
                            <button
                              key={day}
                              className={`ad-ddItem ${rangeDays === day ? "is-active" : ""}`}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setRangeDays(day);
                                setRangeOpen(false);
                              }}
                            >
                              {day} Hari
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

                <div className="ad-activeBars">
                  {(dashLoading ? Array.from({ length: 6 }) : topActive).map(
                    (row, idx) => (
                      <button
                        key={row?.id_posbankum || idx}
                        className="ad-activeItem"
                        type="button"
                        onClick={() =>
                          !dashLoading && row && setSelectedPosDetail(row)
                        }
                        disabled={dashLoading || !row}
                      >
                        <div className="ad-activeTop">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            row.total
                          )}
                        </div>

                        <div className="ad-barArea" aria-hidden="true">
                          <div
                            className="ad-pillBar"
                            style={{
                              height: dashLoading ? "88%" : `${row.barPct}%`,
                            }}
                          />
                        </div>

                        <div className="ad-activeName">
                          {dashLoading ? (
                            <span className="ad-skel sk-line" />
                          ) : (
                            row.namaPendek
                          )}
                        </div>

                        <div className="ad-activeGrowth">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            <span
                              className={
                                row.growthPct >= 0 ? "is-up" : "is-down"
                              }
                            >
                              {row.growthPct >= 0 ? "+" : ""}
                              {row.growthPct}%
                            </span>
                          )}
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </section>

              <section className="ad-panel ad-panelActivity">
                <div className="ad-panelHead ad-panelHeadActivity">
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
                  {(dashLoading ? Array.from({ length: 4 }) : activities).map(
                    (item, idx) => (
                      <div key={item?.key || idx} className="ad-activityItem">
                        <div
                          className={`ad-activityIconWrap tone-${item?.tone || "blue"}`}
                        >
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            pickActivityIcon(item)
                          )}
                        </div>

                        <div className="ad-activityText">
                          <div className="ad-activityTitle">
                            {dashLoading ? (
                              <span className="ad-skel sk-line" />
                            ) : (
                              item.title
                            )}
                          </div>
                          <div className="ad-activityMetaInline">
                            {dashLoading ? (
                              <span
                                className="ad-skel sk-line"
                                style={{ width: 140 }}
                              />
                            ) : (
                              item.actorLabel
                            )}
                          </div>
                          <div className="ad-activityTime">
                            {dashLoading ? (
                              <span className="ad-skel sk-mini" />
                            ) : (
                              item.time
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
                    <col className="ad-colPosbankum" />
                    <col className="ad-colTotal" />
                    <col className="ad-colKegiatan" />
                    <col className="ad-colKasus" />
                    <col className="ad-colDokumen" />
                    <col className="ad-colStatus" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th align="left">POSBANKUM</th>
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
                    ).map((row, idx) => (
                      <tr
                        key={row?.id_posbankum || idx}
                        className={!dashLoading ? "ad-tableRowClickable" : ""}
                        onClick={() =>
                          !dashLoading && row && setSelectedPosDetail(row)
                        }
                        onKeyDown={(e) => {
                          if (
                            !dashLoading &&
                            row &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            setSelectedPosDetail(row);
                          }
                        }}
                        tabIndex={dashLoading ? -1 : 0}
                      >
                        <td>
                          <div className="ad-posCell">
                            <span className="ad-posName">
                              {dashLoading ? (
                                <span className="ad-skel sk-line" />
                              ) : (
                                row.nama
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="is-center">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            <span className="ad-totalNum">{row.total}</span>
                          )}
                        </td>
                        <td className="is-center">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            row.kegiatan
                          )}
                        </td>
                        <td className="is-center">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            row.kasus
                          )}
                        </td>
                        <td className="is-center">
                          {dashLoading ? (
                            <span className="ad-skel sk-mini" />
                          ) : (
                            row.dokumen
                          )}
                        </td>
                        <td className="is-center">
                          {dashLoading ? (
                            <span
                              className="ad-skel sk-mini"
                              style={{ width: 60, height: 28 }}
                            />
                          ) : (
                            <span className="ad-pillGreen">{row.status}</span>
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
                  onClick={() => setDetailPage((prev) => Math.max(1, prev - 1))}
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
                    setDetailPage((prev) => Math.min(detailPageCount, prev + 1))
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
        <footer className="ad-footer">
          <div className="ad-footerText">
            © 2026 Kementerian Hukum Riau. All rights reserved.
          </div>

          <div className="ad-footerText">
            Dikembangkan oleh Politeknik Caltex Riau
          </div>
        </footer>
      </main>

      {selectedPosDetail ? (
        <div
          className="ad-modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Detail Posbankum"
        >
          <div className="ad-modalBackdrop" onClick={closeDetailModal} />

          <div
            className="ad-detailModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ad-detailModalHead">
              <div className="ad-detailModalHeadText">
                <div className="ad-detailModalTitle">
                  {selectedPosDetail.nama}
                </div>
                <div className="ad-detailModalSub">
                  Detail informasi dan statistik
                </div>
              </div>

              <button
                className="ad-detailModalCloseBtn"
                type="button"
                onClick={closeDetailModal}
                aria-label="Tutup"
              >
                <FiX />
              </button>
            </div>

            <div className="ad-detailModalBody">
              <div className="ad-detailStatGrid">
                <div className="ad-detailStatCard tone-blue">
                  <div className="ad-detailStatIcon">
                    <FiFileText />
                  </div>
                  <div className="ad-detailStatValue">
                    {selectedPosDetail.total}
                  </div>
                  <div className="ad-detailStatLabel">Total</div>
                </div>

                <div className="ad-detailStatCard tone-orange">
                  <div className="ad-detailStatIcon">
                    <FiCheckCircle />
                  </div>
                  <div className="ad-detailStatValue">
                    {selectedPosDetail.kegiatan}
                  </div>
                  <div className="ad-detailStatLabel">Kegiatan</div>
                </div>

                <div className="ad-detailStatCard tone-green">
                  <div className="ad-detailStatIcon">
                    <FiAlertCircle />
                  </div>
                  <div className="ad-detailStatValue">
                    {selectedPosDetail.kasus}
                  </div>
                  <div className="ad-detailStatLabel">Kasus</div>
                </div>

                <div className="ad-detailStatCard tone-blueAlt">
                  <div className="ad-detailStatIcon">
                    <TbFileCheck />
                  </div>
                  <div className="ad-detailStatValue">
                    {selectedPosDetail.dokumen}
                  </div>
                  <div className="ad-detailStatLabel">Dokumen</div>
                </div>
              </div>

              <div className="ad-detailInfoCard">
                <div className="ad-detailInfoTitle">Informasi Kontak</div>

                <div className="ad-detailInfoList">
                  <div className="ad-detailInfoItem">
                    <div className="ad-detailInfoIcon is-blue">
                      <FiMapPin />
                    </div>
                    <div>
                      <div className="ad-detailInfoLabel">Alamat</div>
                      <div className="ad-detailInfoValue">
                        {selectedPosDetail.alamat || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="ad-detailInfoItem">
                    <div className="ad-detailInfoIcon is-green">
                      <FiPhone />
                    </div>
                    <div>
                      <div className="ad-detailInfoLabel">Telepon</div>
                      <div className="ad-detailInfoValue">
                        {selectedPosDetail.nomor_tlp || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="ad-detailInfoItem">
                    <div className="ad-detailInfoIcon is-user">
                      <FiUser />
                    </div>
                    <div>
                      <div className="ad-detailInfoLabel">Kepala Posbankum</div>
                      <div className="ad-detailInfoValue">
                        {selectedPosDetail.nama_paralegal || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ad-detailActionRow">
                <button
                  type="button"
                  className="ad-detailActionBtn is-green"
                  onClick={() => {
                    const url = getWhatsAppUrl(
                      selectedPosDetail.nomor_paralegal ||
                        selectedPosDetail.nomor_tlp,
                      selectedPosDetail.nama,
                    );

                    if (!url) {
                      alert("Nomor WhatsApp paralegal belum tersedia.");
                      return;
                    }

                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <FiPhone /> Hubungi Sekarang
                </button>

                <button
                  type="button"
                  className="ad-detailActionBtn is-navy"
                  onClick={() => {
                    const url = getMapsUrl(selectedPosDetail);
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <FiExternalLink /> Lihat di Peta
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
              <div className="ad-modalHeadText">
                <div className="ad-modalTitle">Semua Aktivitas Terbaru</div>
                <div className="ad-modalSub">
                  {activityLoading
                    ? "Memuat aktivitas..."
                    : `${totalActivityAll} Aktivitas dari sistem`}
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
                  Administrasi
                </button>
              </div>
            </div>

            <div className="ad-modalList">
              {(activityLoading
                ? Array.from({ length: 5 })
                : activityFiltered
              ).map((item, idx) => {
                const tone = item?.tone || "blue";
                const badge = item?.kind || "Aktivitas";
                return (
                  <div
                    key={item?.key || idx}
                    className={`ad-modalItem tone-${tone}`}
                  >
                    <div
                      className={`ad-modalIconWrap tone-${tone}`}
                      aria-hidden="true"
                    >
                      {activityLoading ? (
                        <span className="ad-skel sk-mini" />
                      ) : (
                        pickActivityIcon(item)
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
                          item?.title
                        )}
                      </div>

                      <div className="ad-modalItemDesc">
                        {activityLoading ? (
                          <span
                            className="ad-skel sk-line"
                            style={{ width: 320 }}
                          />
                        ) : (
                          item?.desc || ""
                        )}
                      </div>

                      <div className="ad-modalMeta">
                        <div className="ad-modalMetaChip">
                          <FiMapPin />
                          {activityLoading ? (
                            <span
                              className="ad-skel sk-line"
                              style={{ width: 120 }}
                            />
                          ) : (
                            item?.actorLabel || "-"
                          )}
                        </div>
                        <div className="ad-modalMetaChip">
                          <FiCalendar />
                          {activityLoading ? (
                            <span
                              className="ad-skel sk-line"
                              style={{ width: 90 }}
                            />
                          ) : (
                            item?.dateLabel || "-"
                          )}
                        </div>
                        <div className="ad-modalMetaChip">
                          <FiClock />
                          {activityLoading ? (
                            <span
                              className="ad-skel sk-line"
                              style={{ width: 90 }}
                            />
                          ) : (
                            item?.time || ""
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
                  Tidak ada aktivitas pada kategori ini.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
