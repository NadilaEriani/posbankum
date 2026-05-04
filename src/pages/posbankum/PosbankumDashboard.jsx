import { ImStack } from "react-icons/im";
import { CiCalendar } from "react-icons/ci";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHome,
  FiFileText,
  FiLogOut,
  FiBell,
  FiCheckCircle,
  FiUsers,
  FiChevronRight,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiX,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiFilter,
  FiAlertCircle,
  FiBellOff,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import "./posbankumDashboard.css";
import DeleteConfirmModal from "../../components/ui/DeleteConfirmModal";
import KelolaPosbankum from "./KelolaPosbankum";
import KelolaKegiatan from "./KelolaKegiatan";
import LaporanPelayanan from "./LaporanPelayanan";
import SemuaKasus from "./SemuaKasus";
import posbankum from "../../assets/icon.png";
import logo from "../../assets/logo.png";
import PosbankumProfile from "./PosbankumProfile";

function startOfMonthISO() {
  const d = new Date();
  const s = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
  return s.toISOString();
}

function startOfNextMonthISO() {
  const d = new Date();
  const s = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0);
  return s.toISOString();
}

function fmtDateID(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function clampText(s, n) {
  const t = String(s || "");
  if (t.length <= n) return t;
  return t.slice(0, n) + "...";
}

function safeParseCatatan(catatan) {
  const raw = String(catatan || "").trim();
  if (!raw) return { lokasi: "", peserta: "" };

  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      const lokasi = obj.lokasi || obj.location || obj.tempat || "";
      const peserta =
        obj.peserta || obj.jumlah_peserta || obj.participant || "";
      return { lokasi: String(lokasi || ""), peserta: String(peserta || "") };
    }
  } catch {}

  return { lokasi: raw, peserta: "" };
}

function normalizeCaseCategory(jenis) {
  const raw = String(jenis || "").trim();
  if (!raw) return "Kasus";

  const lower = raw.toLowerCase();

  if (lower.includes("waris")) return "Hukum Waris";
  if (
    lower.includes("cerai") ||
    lower.includes("perceraian") ||
    lower.includes("hak asuh") ||
    lower.includes("keluarga")
  ) {
    return "Hukum Keluarga";
  }
  if (
    lower.includes("tanah") ||
    lower.includes("batas tanah") ||
    lower.includes("pertanahan")
  ) {
    return "Pertanahan";
  }
  if (
    lower.includes("pidana") ||
    lower.includes("pencurian") ||
    lower.includes("penganiayaan") ||
    lower.includes("narkoba")
  ) {
    return "Hukum Pidana";
  }
  if (
    lower.includes("ketenagakerjaan") ||
    lower.includes("hubungan kerja") ||
    lower.includes("phk")
  ) {
    return "Ketenagakerjaan";
  }

  return raw;
}

function normalizeCaseStatusByKasus(tglSelesai) {
  return tglSelesai ? "Selesai" : "Dalam Proses";
}

function normalizeCaseStatusByPengaduan(status) {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (s === "selesai") return "Selesai";
  return "Dalam Proses";
}

function normalizeKabupatenLabel(nama) {
  const raw = String(nama || "").trim();
  if (!raw) return "";
  return raw.replace(/^(kota|kabupaten)\s+/i, "").trim();
}

function cleanHeaderAddress(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  return raw
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/,\s*$/g, "")
    .trim();
}

function normalizeNotificationCategory(v) {
  const raw = String(v || "")
    .trim()
    .toLowerCase();
  if (["pengaduan", "kegiatan", "dokumen", "sistem"].includes(raw)) {
    return raw;
  }
  return "sistem";
}

function normalizeNotificationPriority(v) {
  const raw = String(v || "")
    .trim()
    .toLowerCase();
  if (["tinggi", "sedang", "rendah"].includes(raw)) return raw;
  return "sedang";
}

function normalizeNotificationRow(item) {
  return {
    ...item,
    kategori: normalizeNotificationCategory(item?.kategori),
    prioritas: normalizeNotificationPriority(item?.prioritas),
    is_read: !!item?.is_read,
  };
}

function formatNotificationRelative(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";

  const diffMs = Date.now() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Baru saja";
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari yang lalu`;

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatNotificationDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";

  const tanggal = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const waktu = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${tanggal} Pukul ${waktu} WIB`;
}

function getNotificationTypeLabel(v) {
  const value = normalizeNotificationCategory(v);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getNotificationPriorityLabel(v) {
  const value = normalizeNotificationPriority(v);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function PosbankumDashboard() {
  const navigate = useNavigate();

  const [active, setActive] = useState("Beranda");
  const [showProfile, setShowProfile] = useState(false);
  const [mustCompleteProfile, setMustCompleteProfile] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [profile, setProfile] = useState(null);
  const [roleErr, setRoleErr] = useState("");

  const [pbInfo, setPbInfo] = useState({
    nama: "",
    alamat: "",
    email_akun: "",
    nomor_tlp: "",
    nama_paralegal: "",
    kabupaten: "",
    kecamatan: "",
    jml_paralegal: 0,
  });

  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifErr, setNotifErr] = useState("");
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifDeleteState, setNotifDeleteState] = useState({
    open: false,
    mode: "single",
    id: null,
  });
  const [notifications, setNotifications] = useState([]);
  const [notifReadFilter, setNotifReadFilter] = useState("semua");
  const [notifTypeFilter, setNotifTypeFilter] = useState("semua");
  const [notifSelectedId, setNotifSelectedId] = useState(null);

  const [statKasusBulanIni, setStatKasusBulanIni] = useState(0);
  const [statKegiatanSelesai, setStatKegiatanSelesai] = useState(0);
  const [statParalegalAktif, setStatParalegalAktif] = useState(0);

  const [kasusTerbaru, setKasusTerbaru] = useState([]);
  const [loadingKasus, setLoadingKasus] = useState(false);
  const [kasusErr, setKasusErr] = useState("");

  const [kegiatanTerbaru, setKegiatanTerbaru] = useState([]);
  const [loadingKegiatan, setLoadingKegiatan] = useState(false);
  const [kegiatanErr, setKegiatanErr] = useState("");

  const menu = useMemo(
    () => [
      { label: "Beranda", icon: <FiHome /> },
      { label: "Semua Kasus", icon: <ImStack /> },
      {
        label: "Kelola Posbankum",
        icon: (
          <span
            className="ad-navMaskIcon"
            style={{ "--mask-url": `url(${posbankum})` }}
            aria-hidden="true"
          />
        ),
      },
      {
        label: "Kelola Kegiatan",
        icon: <CiCalendar style={{ fontSize: 20, strokeWidth: 1 }} />,
      },
      { label: "Laporan Pelayanan", icon: <FiFileText /> },
    ],
    [],
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: ses } = await supabase.auth.getSession();
        if (!alive) return;

        if (!ses?.session) {
          navigate("/", { replace: true });
          return;
        }

        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) {
          navigate("/", { replace: true });
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("id, role, full_name, id_posbankum")
          .eq("id", uid)
          .maybeSingle();

        if (profErr) throw profErr;

        if (!prof) {
          setRoleErr(
            "Akun ini belum memiliki profil. Hubungi admin untuk mengaktifkan role.",
          );
          return;
        }

        if (prof.role !== "posbankum") {
          if (prof.role === "admin") {
            navigate("/admin", { replace: true });
            return;
          }
          setRoleErr("Forbidden: halaman ini hanya untuk role posbankum.");
          return;
        }

        setProfile({ ...prof, email: u?.user?.email || "" });

        if (prof?.id_posbankum) {
          await Promise.all([
            loadPosbankumHeader(prof.id_posbankum),
            loadNotif(prof.id_posbankum),
            loadStats(prof.id_posbankum),
            loadKasusTerbaru(),
            loadKegiatanTerbaru(prof.id_posbankum),
            checkProfileGate(prof.id_posbankum),
          ]);
        } else {
          setRoleErr("Profil posbankum belum memiliki id_posbankum.");
          return;
        }
      } catch (e) {
        console.error(e);
        setRoleErr(e?.message || "Gagal memeriksa role/session.");
      } finally {
        if (alive) setChecking(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_ev, session) => {
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
    } catch (e) {
      console.error(e);
      alert("Logout gagal. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  };

  async function loadPosbankumHeader(id_posbankum) {
    try {
      const { data: pb, error } = await supabase
        .from("posbankum")
        .select(
          "id_posbankum, nama, alamat, email_akun, nomor_tlp, nama_paralegal, id_kabupaten, id_kecamatan, jml_paralegal",
        )
        .eq("id_posbankum", id_posbankum)
        .maybeSingle();

      if (error) throw error;

      let kabupaten = "";
      let kecamatan = "";

      if (pb?.id_kabupaten) {
        const { data: kb } = await supabase
          .from("kabupaten")
          .select("nama")
          .eq("id_kabupaten", pb.id_kabupaten)
          .maybeSingle();
        kabupaten = kb?.nama || "";
      }

      if (pb?.id_kecamatan) {
        const { data: kc } = await supabase
          .from("kecamatan")
          .select("nama")
          .eq("id_kecamatan", pb.id_kecamatan)
          .maybeSingle();
        kecamatan = kc?.nama || "";
      }

      setPbInfo({
        nama: pb?.nama || "",
        alamat: pb?.alamat || "",
        email_akun: pb?.email_akun || "",
        nomor_tlp: pb?.nomor_tlp || "",
        nama_paralegal: pb?.nama_paralegal || "",
        kabupaten,
        kecamatan,
        jml_paralegal: Number(pb?.jml_paralegal || 0),
      });

      setStatParalegalAktif(Number(pb?.jml_paralegal || 0));
    } catch (e) {
      console.warn("loadPosbankumHeader:", e?.message);
    }
  }

  async function checkProfileGate(id_posbankum) {
    try {
      const { data: pb, error } = await supabase
        .from("posbankum")
        .select(
          "nama, email_akun, nomor_tlp, alamat, kode_pos, id_kabupaten, id_kecamatan, nama_paralegal",
        )
        .eq("id_posbankum", id_posbankum)
        .maybeSingle();

      if (error) throw error;

      let hasParalegal = !!String(pb?.nama_paralegal || "").trim();
      const members = await supabase
        .from("paralegal_members")
        .select("id_paralegal, nama_paralegal, nomor_telepon")
        .eq("id_posbankum", id_posbankum)
        .limit(10);

      if (!members.error) {
        hasParalegal = (members.data || []).some(
          (item) => item?.nama_paralegal && item?.nomor_telepon,
        );
      }

      const complete =
        [
          pb?.nama,
          pb?.email_akun,
          pb?.nomor_tlp,
          pb?.alamat,
          pb?.kode_pos,
          pb?.id_kabupaten,
          pb?.id_kecamatan,
        ].every((item) => String(item || "").trim()) && hasParalegal;

      setMustCompleteProfile(!complete);
      if (!complete) setShowProfile(true);
    } catch {
      setMustCompleteProfile(false);
    }
  }

  async function loadNotif(id_posbankum, options = {}) {
    const { preserveSelection = true } = options;

    if (!id_posbankum) {
      setNotifications([]);
      setNotifCount(0);
      setNotifSelectedId(null);
      return;
    }

    setNotifLoading(true);
    setNotifErr("");

    try {
      const { data, error } = await supabase
        .from("notifikasi")
        .select(
          "id_notifikasi, id_posbankum, judul, pesan, kategori, prioritas, is_read, created_at, read_at, ref_table, ref_id",
        )
        .eq("id_posbankum", id_posbankum)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(normalizeNotificationRow);

      setNotifications(mapped);
      setNotifCount(mapped.filter((item) => !item.is_read).length);

      setNotifSelectedId((prev) => {
        if (!mapped.length) return null;
        if (
          preserveSelection &&
          prev &&
          mapped.some((item) => item.id_notifikasi === prev)
        ) {
          return prev;
        }
        return null;
      });
    } catch (e) {
      console.warn("loadNotif:", e?.message);
      setNotifications([]);
      setNotifCount(0);
      setNotifErr(e?.message || "Gagal memuat notifikasi.");
      if (!preserveSelection) setNotifSelectedId(null);
    } finally {
      setNotifLoading(false);
    }
  }

  async function updateNotificationRead(id_notifikasi, nextRead) {
    if (!id_notifikasi || notifBusy) return;
    setNotifBusy(true);

    try {
      const payload = {
        is_read: nextRead,
        read_at: nextRead ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("notifikasi")
        .update(payload)
        .eq("id_notifikasi", id_notifikasi);

      if (error) throw error;

      setNotifications((prev) => {
        const next = prev.map((item) =>
          item.id_notifikasi === id_notifikasi
            ? { ...item, is_read: nextRead, read_at: payload.read_at }
            : item,
        );
        setNotifCount(next.filter((item) => !item.is_read).length);
        return next;
      });
      setNotifDeleteState({ open: false, mode: "single", id: null });
    } catch (e) {
      alert(e?.message || "Gagal memperbarui status notifikasi.");
    } finally {
      setNotifBusy(false);
    }
  }

  async function deleteNotification(id_notifikasi) {
    if (!id_notifikasi || notifBusy) return;
    setNotifDeleteState({ open: true, mode: "single", id: id_notifikasi });
  }

  async function confirmDeleteNotification() {
    const id_notifikasi = notifDeleteState.id;
    if (!id_notifikasi || notifBusy) return;
    setNotifBusy(true);

    try {
      const { error } = await supabase
        .from("notifikasi")
        .delete()
        .eq("id_notifikasi", id_notifikasi);

      if (error) throw error;

      setNotifications((prev) => {
        const next = prev.filter(
          (item) => item.id_notifikasi !== id_notifikasi,
        );
        setNotifCount(next.filter((item) => !item.is_read).length);
        setNotifSelectedId((selected) =>
          selected === id_notifikasi ? null : selected,
        );
        return next;
      });
      setNotifDeleteState({ open: false, mode: "single", id: null });
    } catch (e) {
      alert(e?.message || "Gagal menghapus notifikasi.");
    } finally {
      setNotifBusy(false);
    }
  }

  async function markAllNotificationsAsRead() {
    if (
      !profile?.id_posbankum ||
      notifBusy ||
      !notifications.some((item) => !item.is_read)
    )
      return;
    setNotifBusy(true);

    try {
      const { error } = await supabase
        .from("notifikasi")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id_posbankum", profile.id_posbankum)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
          read_at: new Date().toISOString(),
        })),
      );
      setNotifCount(0);
    } catch (e) {
      alert(e?.message || "Gagal menandai semua notifikasi.");
    } finally {
      setNotifBusy(false);
    }
  }

  async function deleteAllNotifications() {
    if (!profile?.id_posbankum || notifBusy || !notifications.length) return;
    setNotifDeleteState({ open: true, mode: "all", id: null });
  }

  async function confirmDeleteAllNotifications() {
    if (!profile?.id_posbankum || notifBusy || !notifications.length) return;
    setNotifBusy(true);

    try {
      const { error } = await supabase
        .from("notifikasi")
        .delete()
        .eq("id_posbankum", profile.id_posbankum);

      if (error) throw error;

      setNotifications([]);
      setNotifCount(0);
      setNotifSelectedId(null);
      setNotifDeleteState({ open: false, mode: "all", id: null });
    } catch (e) {
      alert(e?.message || "Gagal menghapus semua notifikasi.");
    } finally {
      setNotifBusy(false);
    }
  }

  async function handleSelectNotification(item) {
    if (!item?.id_notifikasi) return;
    setNotifSelectedId(item.id_notifikasi);

    if (!item.is_read) {
      await updateNotificationRead(item.id_notifikasi, true);
    }
  }

  async function loadStats(id_posbankum) {
    try {
      // Kasus Ditangani = pengaduan status selesai bulan ini
      const { data: kasusRows, error: eKasus } = await supabase
        .from("pengaduan")
        .select("status, created_at")
        .eq("id_posbankum", id_posbankum)
        .gte("created_at", startOfMonthISO())
        .lt("created_at", startOfNextMonthISO());

      if (!eKasus) {
        const totalSelesai = (kasusRows || []).filter(
          (x) =>
            String(x?.status || "")
              .trim()
              .toLowerCase() === "selesai",
        ).length;
        setStatKasusBulanIni(totalSelesai);
      }

      // Kegiatan Selesai = kegiatan status diterima
      const { data: kegRows, error: eKeg } = await supabase
        .from("kegiatan")
        .select("status")
        .eq("id_posbankum", id_posbankum);

      if (!eKeg) {
        const totalDiterima = (kegRows || []).filter(
          (x) =>
            String(x?.status || "")
              .trim()
              .toLowerCase() === "diterima",
        ).length;
        setStatKegiatanSelesai(totalDiterima);
      }
    } catch (e) {
      console.warn("loadStats:", e?.message);
    }
  }

  async function loadKasusTerbaru() {
    setLoadingKasus(true);
    setKasusErr("");

    try {
      const { data: lk, error: lkErr } = await supabase
        .from("lihat_kasus")
        .select("created_at, id_posbankum, id_kasus")
        .order("created_at", { ascending: false })
        .limit(4);

      if (lkErr) throw lkErr;

      if (lk && lk.length) {
        const posIds = [
          ...new Set(lk.map((x) => x.id_posbankum).filter(Boolean)),
        ];
        const kasusIds = [
          ...new Set(lk.map((x) => x.id_kasus).filter(Boolean)),
        ];

        const [{ data: pbs, error: pbErr }, { data: kss, error: ksErr }] =
          await Promise.all([
            posIds.length
              ? supabase
                  .from("posbankum")
                  .select("id_posbankum, nama")
                  .in("id_posbankum", posIds)
              : Promise.resolve({ data: [], error: null }),
            kasusIds.length
              ? supabase
                  .from("kasus")
                  .select("id_kasus, jenis_kasus, deskripsi_kasus, tgl_selesai")
                  .in("id_kasus", kasusIds)
              : Promise.resolve({ data: [], error: null }),
          ]);

        if (pbErr) throw pbErr;
        if (ksErr) throw ksErr;

        const pbMap = new Map((pbs || []).map((x) => [x.id_posbankum, x]));
        const kMap = new Map((kss || []).map((x) => [x.id_kasus, x]));

        const mapped = lk
          .map((row) => {
            const kasus = kMap.get(row.id_kasus) || {};
            const pos = pbMap.get(row.id_posbankum) || {};

            if (!row.id_kasus || !row.id_posbankum) return null;

            const selesai = !!kasus.tgl_selesai;
            const kategori = normalizeCaseCategory(kasus.jenis_kasus);

            return {
              id: `${row.id_kasus}-${row.id_posbankum}-${row.created_at}`,
              judul: kasus.jenis_kasus || "Kasus",
              kategori,
              deskripsi: kasus.deskripsi_kasus || "",
              posbankum: pos.nama || "Posbankum",
              status: normalizeCaseStatusByKasus(kasus.tgl_selesai),
              selesai,
            };
          })
          .filter(Boolean);

        if (mapped.length) {
          setKasusTerbaru(mapped);
          return;
        }
      }

      const { data: pengaduanRows, error: pengaduanErr } = await supabase
        .from("pengaduan")
        .select(
          "id_pengaduan, id_posbankum, judul_pengaduan, jenis_masalah, kronologi, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(4);

      if (pengaduanErr) throw pengaduanErr;

      if (!pengaduanRows || !pengaduanRows.length) {
        setKasusTerbaru([]);
        return;
      }

      const posIdsPengaduan = [
        ...new Set(pengaduanRows.map((x) => x.id_posbankum).filter(Boolean)),
      ];

      const { data: pbs2, error: pbErr2 } = posIdsPengaduan.length
        ? await supabase
            .from("posbankum")
            .select("id_posbankum, nama")
            .in("id_posbankum", posIdsPengaduan)
        : { data: [], error: null };

      if (pbErr2) throw pbErr2;

      const pbMap2 = new Map((pbs2 || []).map((x) => [x.id_posbankum, x]));

      const mappedFallback = pengaduanRows.map((row) => {
        const pos = pbMap2.get(row.id_posbankum) || {};
        const selesai = String(row.status || "").toLowerCase() === "selesai";

        return {
          id: row.id_pengaduan,
          judul: row.judul_pengaduan || row.jenis_masalah || "Kasus",
          kategori: normalizeCaseCategory(row.jenis_masalah),
          deskripsi: row.kronologi || "",
          posbankum: pos.nama || "Posbankum",
          status: normalizeCaseStatusByPengaduan(row.status),
          selesai,
        };
      });

      setKasusTerbaru(mappedFallback);
    } catch (e) {
      console.error("loadKasusTerbaru:", e);
      setKasusTerbaru([]);
      setKasusErr(e?.message || "Gagal memuat kasus terbaru.");
    } finally {
      setLoadingKasus(false);
    }
  }

  async function loadKegiatanTerbaru(id_posbankum) {
    setLoadingKegiatan(true);
    setKegiatanErr("");

    try {
      const { data, error } = await supabase
        .from("kegiatan")
        .select(
          "id_kegiatan, judul, status, tgl_upload, tgl_mulai, tgl_selesai, catatan",
        )
        .eq("id_posbankum", id_posbankum)
        .order("tgl_upload", { ascending: false })
        .limit(4);

      if (error) throw error;

      const mapped = (data || []).map((x) => {
        const meta = safeParseCatatan(x.catatan);
        const tanggal = x.tgl_mulai || x.tgl_upload || null;
        const selesai =
          String(x.status || "")
            .trim()
            .toLowerCase() === "diterima";
        return {
          id: x.id_kegiatan,
          judul: x.judul || "Kegiatan",
          tanggal,
          lokasi: meta.lokasi,
          peserta: meta.peserta,
          status: selesai ? "Selesai" : x.status || "Dalam Proses",
          selesai,
        };
      });

      setKegiatanTerbaru(mapped);
    } catch (e) {
      setKegiatanTerbaru([]);
      setKegiatanErr(e?.message || "Gagal memuat kegiatan terbaru.");
    } finally {
      setLoadingKegiatan(false);
    }
  }

  useEffect(() => {
    const id_posbankum = profile?.id_posbankum;
    if (!id_posbankum) return undefined;

    const channel = supabase
      .channel(`notifikasi-posbankum-${id_posbankum}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifikasi",
          filter: `id_posbankum=eq.${id_posbankum}`,
        },
        (payload) => {
          setNotifErr("");

          if (payload.eventType === "INSERT") {
            const nextItem = normalizeNotificationRow(payload.new);
            setNotifications((prev) => {
              const withoutDuplicate = prev.filter(
                (item) => item.id_notifikasi !== nextItem.id_notifikasi,
              );
              const next = [nextItem, ...withoutDuplicate].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at),
              );
              setNotifCount(next.filter((item) => !item.is_read).length);
              return next;
            });
            return;
          }

          if (payload.eventType === "UPDATE") {
            const nextItem = normalizeNotificationRow(payload.new);
            setNotifications((prev) => {
              const exists = prev.some(
                (item) => item.id_notifikasi === nextItem.id_notifikasi,
              );
              const next = exists
                ? prev.map((item) =>
                    item.id_notifikasi === nextItem.id_notifikasi
                      ? nextItem
                      : item,
                  )
                : [nextItem, ...prev];
              const sorted = next.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at),
              );
              setNotifCount(sorted.filter((item) => !item.is_read).length);
              return sorted;
            });
            return;
          }

          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id_notifikasi;
            if (!deletedId) return;

            setNotifications((prev) => {
              const next = prev.filter(
                (item) => item.id_notifikasi !== deletedId,
              );
              setNotifCount(next.filter((item) => !item.is_read).length);
              return next;
            });

            setNotifSelectedId((selected) =>
              selected === deletedId ? null : selected,
            );
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          loadNotif(id_posbankum);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id_posbankum]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchRead =
        notifReadFilter === "semua"
          ? true
          : notifReadFilter === "belum"
            ? !item.is_read
            : item.is_read;

      const matchType =
        notifTypeFilter === "semua" ? true : item.kategori === notifTypeFilter;

      return matchRead && matchType;
    });
  }, [notifications, notifReadFilter, notifTypeFilter]);

  const selectedNotification = useMemo(() => {
    if (!notifSelectedId) return null;
    return (
      notifications.find((item) => item.id_notifikasi === notifSelectedId) ||
      null
    );
  }, [notifications, notifSelectedId]);

  const notifSummaryText = useMemo(() => {
    if (!notifications.length) return "Belum ada notifikasi";
    if (!notifCount) return "Semua notifikasi sudah dibaca";
    return `${notifCount} notifikasi belum dibaca`;
  }, [notifications.length, notifCount]);

  const hasUnreadNotifications = useMemo(
    () => notifications.some((item) => !item.is_read),
    [notifications],
  );

  const headerTitle = useMemo(() => {
    const n = (pbInfo.nama || "").trim();
    return n ? `Posbankum ${n}` : "Posbankum";
  }, [pbInfo.nama]);

  const headerSub = useMemo(() => {
    return cleanHeaderAddress(pbInfo.alamat);
  }, [pbInfo.alamat]);

  if (checking) {
    return (
      <div className="pb2Root" style={{ padding: 24 }}>
        Memuat dashboard posbankum...
      </div>
    );
  }

  if (roleErr) {
    return (
      <div className="pb2Root" style={{ padding: 24 }}>
        <div className="pb2ErrorBox">
          <b>Gagal membuka dashboard</b>
          <div style={{ marginTop: 8 }}>{roleErr}</div>
          <div style={{ marginTop: 12 }}>
            <button
              className="pb2Btn"
              onClick={() => navigate("/", { replace: true })}
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb2Root">
      <aside className="pb2Side">
        <button
          className="pb2Brand pb2BrandButton"
          type="button"
          onClick={() => setShowProfile(true)}
        >
          <div className="pb2BrandLogoWrap">
            <img src={logo} alt="Logo SIBAPAK" className="pb2BrandLogo" />
          </div>
          <div className="pb2BrandText">
            <div className="pb2BrandName">SIBAPAK</div>
            <div className="pb2BrandSub">Posbankum Kemenkum Riau</div>
          </div>
        </button>

        <div className="pb2BrandDivider" aria-hidden="true" />

        <nav className="pb2Nav">
          {menu.map((m) => (
            <button
              key={m.label}
              className={`pb2NavItem ${active === m.label ? "is-active" : ""}`}
              onClick={() => {
                if (mustCompleteProfile) {
                  setShowProfile(true);
                  return;
                }
                setShowProfile(false);
                setActive(m.label);
              }}
              type="button"
            >
              <span className="pb2NavIcon">{m.icon}</span>
              <span className="pb2NavLabel">{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="pb2Main">
        <header className="pb2Top">
          <div className="pb2TopLeft">
            <div className="pb2TopTitle">{headerTitle}</div>
            <div className="pb2TopSub">{headerSub}</div>
          </div>

          <div className="pb2TopRight">
            <button
              className="pb2Bell"
              type="button"
              title="Notifikasi"
              onClick={() => {
                setNotifOpen(true);
                if (profile?.id_posbankum) loadNotif(profile.id_posbankum);
              }}
            >
              <FiBell />
              {notifCount > 0 ? (
                <span className="pb2BellBadge">{notifCount}</span>
              ) : null}
            </button>
            <div className="pb2TopRight">
              <button
                className="pb2TopLogoutBtn"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title={loggingOut ? "Sedang logout..." : "Keluar"}
              >
                <FiLogOut />
                {loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          </div>
        </header>

        {showProfile ? (
          <PosbankumProfile
            profile={profile}
            forceCompletion={mustCompleteProfile}
            onBack={() => setShowProfile(false)}
            onSaved={(nextInfo) => {
              setPbInfo((prev) => ({ ...prev, ...nextInfo }));
              setStatParalegalAktif(Number(nextInfo?.jml_paralegal || 0));
              setMustCompleteProfile(false);
            }}
            onCompletenessChange={(complete) => {
              setMustCompleteProfile(!complete);
              if (!complete) setShowProfile(true);
            }}
          />
        ) : active === "Beranda" ? (
          <section className="pb2Content">
            <div className="pb2Stats">
              <div className="pb2StatCard">
                <div className="pb2StatIcon blue">
                  <FiFileText />
                </div>
                <div className="pb2StatBody">
                  <div className="pb2StatLabel">Kasus Ditangani</div>
                  <div className="pb2StatValue">{statKasusBulanIni}</div>
                  <div className="pb2StatHint">Bulan ini</div>
                </div>
              </div>

              <div className="pb2StatCard">
                <div className="pb2StatIcon green">
                  <FiCheckCircle />
                </div>
                <div className="pb2StatBody">
                  <div className="pb2StatLabel">Kegiatan Selesai</div>
                  <div className="pb2StatValue">{statKegiatanSelesai}</div>
                  <div className="pb2StatHint">Total kegiatan</div>
                </div>
              </div>

              <div className="pb2StatCard">
                <div className="pb2StatIcon orange">
                  <FiUsers />
                </div>
                <div className="pb2StatBody">
                  <div className="pb2StatLabel">Paralegal Aktif</div>
                  <div className="pb2StatValue">{statParalegalAktif}</div>
                  <div className="pb2StatHint">Terdaftar</div>
                </div>
              </div>
            </div>

            <div className="pb2Panel">
              <div className="pb2PanelHead">
                <div>
                  <div className="pb2PanelTitle">
                    Kasus Terbaru dari Seluruh Posbankum Riau
                  </div>
                  <div className="pb2PanelSub">
                    Sharing kasus untuk pembelajaran bersama
                  </div>
                </div>
              </div>

              {kasusErr ? <div className="pb2InlineErr">{kasusErr}</div> : null}

              <div className="pb2CaseGrid">
                {loadingKasus ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div className="pb2CaseCard skel" key={i}>
                      <div className="pb2SkBox" />
                      <div className="pb2SkLine w70" />
                      <div className="pb2SkLine w95" />
                      <div className="pb2SkLine w80" />
                    </div>
                  ))
                ) : kasusTerbaru.length ? (
                  kasusTerbaru.map((k) => (
                    <div className="pb2CaseCard" key={k.id}>
                      <div
                        className={`pb2CaseIcon ${k.selesai ? "green" : "orange"}`}
                      >
                        <FiFileText />
                      </div>

                      <div className="pb2CaseBody">
                        <div className="pb2CaseTitle">{k.judul}</div>
                        <div className="pb2CaseDesc">
                          {clampText(k.deskripsi, 160)}
                        </div>

                        <div className="pb2CasePills">
                          <span className="pb2Pill softBlue">{k.kategori}</span>
                          <span className="pb2Pill softBlue">
                            {k.posbankum}
                          </span>
                          <span
                            className={`pb2Pill ${k.selesai ? "softGreen" : "softOrange"}`}
                          >
                            {k.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pb2Empty">Belum ada kasus.</div>
                )}
              </div>

              <button
                className="pb2Link"
                type="button"
                onClick={() => setActive("Semua Kasus")}
              >
                Lihat semua kasus <FiChevronRight />
              </button>
            </div>

            <div className="pb2Panel">
              <div className="pb2PanelHead row">
                <div>
                  <div className="pb2PanelTitle">Kegiatan Terbaru</div>
                  <div className="pb2PanelSub">
                    Aktivitas Posbankum bulan ini
                  </div>
                </div>

                <button
                  className="pb2LinkBtn"
                  type="button"
                  onClick={() => setActive("Kelola Kegiatan")}
                >
                  Kelola kegiatan
                </button>
              </div>

              {kegiatanErr ? (
                <div className="pb2InlineErr">{kegiatanErr}</div>
              ) : null}

              <div className="pb2KegiatanList">
                {loadingKegiatan ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div className="pb2KegiatanItem skel" key={i}>
                      <div className="pb2SkBox sm" />
                      <div className="pb2SkLine w80" />
                      <div className="pb2SkLine w60" />
                    </div>
                  ))
                ) : kegiatanTerbaru.length ? (
                  kegiatanTerbaru.map((x) => (
                    <div className="pb2KegiatanItem" key={x.id}>
                      <div className="pb2KegiatanIcon">
                        <FiCheckCircle />
                      </div>

                      <div className="pb2KegiatanBody">
                        <div className="pb2KegiatanTitle">{x.judul}</div>

                        <div className="pb2KegiatanMeta">
                          {x.tanggal ? (
                            <span className="pb2MetaChip">
                              <FiCalendar /> {fmtDateID(x.tanggal)}
                            </span>
                          ) : null}

                          {x.lokasi ? (
                            <span className="pb2MetaChip">
                              <FiMapPin /> {x.lokasi}
                            </span>
                          ) : null}

                          {x.peserta ? (
                            <span className="pb2MetaChip">
                              {x.peserta} peserta
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={`pb2Status ${x.selesai ? "ok" : "prog"}`}
                      >
                        {x.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="pb2Empty">Belum ada kegiatan.</div>
                )}
              </div>
            </div>
          </section>
        ) : active === "Kelola Posbankum" ? (
          <KelolaPosbankum profile={profile} />
        ) : active === "Kelola Kegiatan" ? (
          <KelolaKegiatan profile={profile} />
        ) : active === "Laporan Pelayanan" ? (
          <LaporanPelayanan profile={profile} />
        ) : active === "Semua Kasus" ? (
          <SemuaKasus profile={profile} />
        ) : (
          <div className="pb2Soon">
            Halaman <b>{active}</b> belum dibuat
          </div>
        )}

        {notifOpen ? (
          <div
            className="pb2NotifOverlay"
            role="dialog"
            aria-modal="true"
            aria-label="Notifikasi"
            onClick={(e) => {
              if (e.target === e.currentTarget) setNotifOpen(false);
            }}
          >
            <div
              className={`pb2NotifModal ${selectedNotification ? "has-detail" : ""}`}
            >
              <div className="pb2NotifHead">
                <div className="pb2NotifHeadLeft">
                  <div className="pb2NotifHeadIcon">
                    <FiBell />
                  </div>
                  <div>
                    <div className="pb2NotifTitle">Notifikasi</div>
                    <div className="pb2NotifSub">{notifSummaryText}</div>
                  </div>
                </div>

                <div className="pb2NotifHeadActions">
                  {hasUnreadNotifications ? (
                    <button
                      className="pb2NotifGhostBtn is-top"
                      type="button"
                      onClick={markAllNotificationsAsRead}
                      disabled={notifBusy}
                    >
                      <FiCheckCircle /> Tandai Semua Dibaca
                    </button>
                  ) : null}

                  <button
                    className="pb2NotifCloseTop"
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Tutup notifikasi"
                  >
                    <FiX />
                  </button>
                </div>
              </div>

              <div className="pb2NotifToolbar">
                <div className="pb2NotifToolbarGroup">
                  <span className="pb2NotifFilterLabel">
                    <FiFilter /> Filter:
                  </span>
                  <div className="pb2NotifChips">
                    {[
                      { key: "semua", label: "Semua" },
                      { key: "belum", label: "Belum Dibaca" },
                      { key: "sudah", label: "Sudah Dibaca" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`pb2NotifChip ${notifReadFilter === item.key ? "is-active" : ""}`}
                        onClick={() => setNotifReadFilter(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pb2NotifToolbarDivider" aria-hidden="true" />

                <div className="pb2NotifToolbarGroup right">
                  <div className="pb2NotifChips">
                    {[
                      { key: "semua", label: "Semua" },
                      { key: "pengaduan", label: "Pengaduan" },
                      { key: "kegiatan", label: "Kegiatan" },
                      { key: "dokumen", label: "Dokumen" },
                      { key: "sistem", label: "Sistem" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`pb2NotifChip ${notifTypeFilter === item.key ? "is-active" : ""}`}
                        onClick={() => setNotifTypeFilter(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <button
                    className="pb2NotifDangerSoft"
                    type="button"
                    onClick={deleteAllNotifications}
                    disabled={notifBusy || !notifications.length}
                  >
                    <FiTrash2 /> Hapus Semua
                  </button>
                </div>
              </div>

              <div className="pb2NotifBody">
                <div className="pb2NotifListWrap">
                  {notifLoading ? (
                    <div className="pb2NotifEmptyWrap">
                      Memuat notifikasi...
                    </div>
                  ) : notifErr ? (
                    <div className="pb2NotifEmptyWrap">{notifErr}</div>
                  ) : filteredNotifications.length ? (
                    <div className="pb2NotifList">
                      {filteredNotifications.map((item) => {
                        const isSelected =
                          selectedNotification?.id_notifikasi ===
                          item.id_notifikasi;

                        return (
                          <div
                            key={item.id_notifikasi}
                            className={`pb2NotifCard ${!item.is_read ? "is-unread" : ""} ${isSelected ? "is-selected" : ""}`}
                            onClick={() => handleSelectNotification(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectNotification(item);
                              }
                            }}
                          >
                            <div
                              className={`pb2NotifTypeIcon ${item.kategori}`}
                            >
                              {item.kategori === "pengaduan" ? (
                                <FiAlertCircle />
                              ) : item.kategori === "kegiatan" ? (
                                <CiCalendar />
                              ) : item.kategori === "dokumen" ? (
                                <FiFileText />
                              ) : (
                                <FiBell />
                              )}
                            </div>

                            <div className="pb2NotifCardBody">
                              <div className="pb2NotifCardTop">
                                <div className="pb2NotifCardTitle">
                                  {item.judul}
                                </div>
                                <span
                                  className={`pb2NotifPriority ${item.prioritas}`}
                                >
                                  {getNotificationPriorityLabel(item.prioritas)}
                                </span>
                              </div>

                              <div className="pb2NotifCardMessage">
                                {item.pesan}
                              </div>

                              <div className="pb2NotifMetaRow">
                                <span className="pb2NotifMetaTime">
                                  <FiClock />{" "}
                                  {formatNotificationRelative(item.created_at)}
                                </span>
                                <span className="pb2NotifMetaType">
                                  {getNotificationTypeLabel(item.kategori)}
                                </span>
                              </div>
                            </div>

                            <div className="pb2NotifCardActions">
                              <button
                                className="pb2NotifRoundAction"
                                type="button"
                                title={
                                  item.is_read
                                    ? "Tandai belum dibaca"
                                    : "Tandai sudah dibaca"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateNotificationRead(
                                    item.id_notifikasi,
                                    !item.is_read,
                                  );
                                }}
                                disabled={notifBusy}
                              >
                                {item.is_read ? <FiEyeOff /> : <FiEye />}
                              </button>

                              {!selectedNotification ? (
                                <button
                                  className="pb2NotifRoundAction danger"
                                  type="button"
                                  title="Hapus notifikasi"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(item.id_notifikasi);
                                  }}
                                  disabled={notifBusy}
                                >
                                  <FiTrash2 />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pb2NotifEmptyWrap">
                      <div className="pb2NotifEmptyIcon">
                        <FiBellOff />
                      </div>
                      <div className="pb2NotifEmptyTitle">
                        Tidak Ada Notifikasi
                      </div>
                    </div>
                  )}
                </div>

                {selectedNotification ? (
                  <aside className="pb2NotifDetail">
                    <div className="pb2NotifDetailHead">
                      <div className="pb2NotifDetailTitle">
                        Detail Notifikasi
                      </div>
                      <button
                        className="pb2NotifCloseSide"
                        type="button"
                        onClick={() => setNotifSelectedId(null)}
                        aria-label="Tutup detail"
                      >
                        <FiX />
                      </button>
                    </div>

                    <div className="pb2NotifDetailHero">
                      <div
                        className={`pb2NotifTypeIcon ${selectedNotification.kategori}`}
                      >
                        {selectedNotification.kategori === "pengaduan" ? (
                          <FiAlertCircle />
                        ) : selectedNotification.kategori === "kegiatan" ? (
                          <CiCalendar />
                        ) : selectedNotification.kategori === "dokumen" ? (
                          <FiFileText />
                        ) : (
                          <FiBell />
                        )}
                      </div>

                      <div className="pb2NotifDetailHeroBody">
                        <div className="pb2NotifDetailHeroTitle">
                          {selectedNotification.judul}
                        </div>
                        <div className="pb2NotifDetailHeroBadges">
                          <span
                            className={`pb2NotifPriority ${selectedNotification.prioritas}`}
                          >
                            {getNotificationPriorityLabel(
                              selectedNotification.prioritas,
                            )}
                          </span>
                          <span className="pb2NotifMetaType">
                            {getNotificationTypeLabel(
                              selectedNotification.kategori,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pb2NotifDetailMessage">
                      {selectedNotification.pesan}
                    </div>

                    <div className="pb2NotifDetailInfo time">
                      <div className="pb2NotifDetailInfoTitle">
                        <FiClock /> Waktu
                      </div>
                      <div className="pb2NotifDetailInfoText">
                        {formatNotificationDateTime(
                          selectedNotification.created_at,
                        )}
                      </div>
                      <div className="pb2NotifDetailInfoHint">
                        {formatNotificationRelative(
                          selectedNotification.created_at,
                        )}
                      </div>
                    </div>

                    <div className="pb2NotifDetailInfo read">
                      <div className="pb2NotifDetailInfoTitle is-read">
                        <FiCheckCircle /> Sudah Dibaca
                      </div>
                    </div>

                    <div className="pb2NotifDetailBtns">
                      <button
                        className="pb2NotifPrimaryBtn warning"
                        type="button"
                        onClick={() =>
                          updateNotificationRead(
                            selectedNotification.id_notifikasi,
                            false,
                          )
                        }
                        disabled={notifBusy}
                      >
                        <FiEyeOff /> Tandai Belum Dibaca
                      </button>

                      <button
                        className="pb2NotifPrimaryBtn danger"
                        type="button"
                        onClick={() =>
                          deleteNotification(selectedNotification.id_notifikasi)
                        }
                        disabled={notifBusy}
                      >
                        <FiTrash2 /> Hapus Notifikasi
                      </button>
                    </div>
                  </aside>
                ) : null}
              </div>

              <div className="pb2NotifFooter">
                <div className="pb2NotifFooterText">
                  Menampilkan {filteredNotifications.length} dari{" "}
                  {notifications.length} notifikasi
                </div>

                <button
                  className="pb2NotifFooterBtn"
                  type="button"
                  onClick={() => setNotifOpen(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <DeleteConfirmModal
          open={notifDeleteState.open}
          title={
            notifDeleteState.mode === "all"
              ? "Hapus Semua Notifikasi?"
              : "Hapus Notifikasi?"
          }
          subtitle="Tindakan ini tidak dapat dibatalkan"
          description={
            notifDeleteState.mode === "all"
              ? "Apakah Anda yakin ingin menghapus semua notifikasi? Semua data notifikasi akan dihapus permanen."
              : "Apakah Anda yakin ingin menghapus notifikasi ini? Data notifikasi akan dihapus permanen."
          }
          confirmLabel={
            notifDeleteState.mode === "all" ? "Ya, Hapus Semua" : "Ya, Hapus"
          }
          cancelLabel="Batal"
          loading={notifBusy}
          onCancel={() => {
            if (!notifBusy) {
              setNotifDeleteState({ open: false, mode: "single", id: null });
            }
          }}
          onConfirm={
            notifDeleteState.mode === "all"
              ? confirmDeleteAllNotifications
              : confirmDeleteNotification
          }
        />
      </main>
    </div>
  );
}
