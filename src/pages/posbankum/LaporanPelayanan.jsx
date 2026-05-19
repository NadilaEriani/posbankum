import { AiOutlineBarChart } from "react-icons/ai";
import { FaRegUserCircle } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import SuccessToast from "../../components/ui/SuccessToast";
import DeleteConfirmModal from "../../components/ui/DeleteConfirmModal";
import ReminderModal from "../../components/ui/ReminderModal";
import {
  FiFileText,
  FiCreditCard,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiTrendingUp,
  FiCalendar,
  FiPlus,
  FiRotateCcw,
  FiBarChart2,
  FiSearch,
  FiFilter,
  FiEye,
  FiTrash2,
  FiPrinter,
  FiX,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiUsers,
  FiSend,
  FiPaperclip,
  FiChevronDown,
  FiInfo,
} from "react-icons/fi";
import posbankumIcon from "../../assets/icon.png";
import "./laporanPelayanan.css";

const STORAGE_BUCKET = "pengaduan-lampiran";

const MOBILE_SUPABASE_URL = import.meta.env.VITE_MOBILE_SUPABASE_URL;
const MOBILE_SUPABASE_ANON_KEY = import.meta.env.VITE_MOBILE_SUPABASE_ANON_KEY;
const MOBILE_SYNC_URL = import.meta.env.VITE_MOBILE_SYNC_URL;
const MOBILE_SYNC_TOKEN = import.meta.env.VITE_MOBILE_SYNC_TOKEN;
const MOBILE_SYSTEM_MASYARAKAT_ID =
  import.meta.env.VITE_MOBILE_SYSTEM_MASYARAKAT_ID ||
  import.meta.env.VITE_MOBILE_DEFAULT_MASYARAKAT_ID;

const mobileSupabase =
  MOBILE_SUPABASE_URL && MOBILE_SUPABASE_ANON_KEY
    ? createClient(MOBILE_SUPABASE_URL, MOBILE_SUPABASE_ANON_KEY)
    : null;

const MOBILE_PENGADUAN_SELECT = `
  id,
  kategori_masalah,
  kronologi,
  lokasi_kejadian,
  status,
  prioritas,
  paralegal_id,
  tgl_lapor,
  tgl_selesai,
  tgl_kejadian,
  waktu_kejadian,
  global_case_id,
  source_system,
  website_kasus_id,
  website_posbankum_id,
  synced_at,
  judul_laporan,
  nama_lurah,
  catatan_paralegal,
  nama_paralegal_ditugaskan,
  no_hp_paralegal,
  nama_pelapor,
  nik_pelapor,
  no_hp_pelapor
`;

const MOBILE_PROGRESS_SELECT = `
  id,
  pengaduan_id,
  deskripsi_progres,
  tanggal_progres,
  foto_dokumentasi,
  created_at
`;

function getParalegalLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeParalegalOption(item, index = 0) {
  return {
    id: item?.id_paralegal || item?.id || `paralegal-${index}`,
    nama: item?.nama_paralegal || item?.nama || "",
    hp: item?.nomor_telepon || item?.hp || "",
    is_primary: index === 0 ? true : !!item?.is_primary,
  };
}

function buildParalegalLookup(options) {
  const byId = new Map();
  const byName = new Map();

  (options || []).forEach((item) => {
    if (item?.id) byId.set(item.id, item);
    if (item?.nama) byName.set(getParalegalLookupKey(item.nama), item);
  });

  return { byId, byName };
}

function resolveParalegal(row, extra, paralegalLookup) {
  const byId = paralegalLookup?.byId || new Map();
  const byName = paralegalLookup?.byName || new Map();
  const fromId = row?.id_paralegal ? byId.get(row.id_paralegal) : null;
  const fromName = extra?.paralegal_nama
    ? byName.get(getParalegalLookupKey(extra.paralegal_nama))
    : null;
  const selected = fromId || fromName || null;

  return {
    id: selected?.id || row?.id_paralegal || extra?.id_paralegal || "",
    nama: selected?.nama || extra?.paralegal_nama || "",
    hp: selected?.hp || extra?.paralegal_hp || "",
  };
}

const EMPTY_FORM_DATA = {
  nama_pelapor: "",
  nik: "",
  nomor_telepon: "",
  email: "",
  nama_lurah: "",
  kelurahan: "",
  jenis_masalah: "",
  prioritas: "",
  judul_pengaduan: "",
  kronologi: "",
  tanggal_kejadian: "",
  waktu_kejadian: "",
  lokasi_kejadian: "",
  id_paralegal: "",
  paralegal_nama: "",
  paralegal_hp: "",
  catatan_internal: "",
  lampiran: [],
};

const ALLOWED_UPLOAD_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const ALLOWED_UPLOAD_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_NIK_LENGTH = 16;
const MAX_PHONE_LENGTH = 15;
const MAX_TITLE_LENGTH = 100;

const EMPTY_REMINDER_MODAL = {
  open: false,
  title: "Pengingat",
  subtitle: "Periksa kembali informasi berikut",
  description: "",
  buttonLabel: "Mengerti",
};

function toTitleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstFilled(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const cleaned = String(value).trim();
    if (cleaned && cleaned !== "-") return cleaned;
  }

  return "";
}

function stripPosbankumPrefix(value) {
  return String(value || "")
    .replace(/^posbankum\s+/i, "")
    .trim();
}

function buildPosbankumInfoLabel({
  posbankumName = "",
  kelurahanName = "",
  kecamatanName = "",
} = {}) {
  const cleanPosbankumName = stripPosbankumPrefix(posbankumName);
  const cleanKelurahanName = stripPosbankumPrefix(kelurahanName);
  const cleanKecamatanName = stripPosbankumPrefix(kecamatanName);
  const namaWilayah = cleanPosbankumName || cleanKelurahanName;

  return (
    [namaWilayah, cleanKecamatanName]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ") || "-"
  );
}

function normalizeLookupText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^posbankum\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSamePosbankumName(a, b) {
  const first = normalizeLookupText(a);
  const second = normalizeLookupText(b);

  return Boolean(first && second && first === second);
}

function normalizePriority(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (raw.includes("tinggi") || raw === "high") return "tinggi";
  if (raw.includes("rendah") || raw === "low") return "rendah";
  return "sedang";
}

function buildPbktNumberFromMobile(row) {
  const rawId = String(row?.id || "").trim();
  const reportDate = row?.tgl_lapor || row?.tgl_kejadian || row?.created_at;
  const parsedDate = reportDate ? new Date(reportDate) : null;
  const year =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? String(parsedDate.getFullYear())
      : new Date().getFullYear().toString();

  const pgnMatch = rawId.match(/^PGN[-/]?(\d{4})[-/]?(.+)$/i);
  if (pgnMatch) {
    return `PBKT/${pgnMatch[1]}/${pgnMatch[2]}`;
  }

  const digits = rawId.replace(/\D/g, "");
  const suffix = digits ? digits.slice(-5) : rawId.slice(-5).toUpperCase();

  return `PBKT/${year}/${suffix || "MOBILE"}`;
}

function formatDateID(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeID(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimelineSortValue(item) {
  const raw = item?.sort_at || item?.tanggal || item?.created_at;
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return 0;

  return date.getTime();
}

function normalizeMobileStatus(value, tglSelesai) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (tglSelesai) return "selesai";

  if (
    raw === "selesai" ||
    raw === "done" ||
    raw === "completed" ||
    raw === "complete"
  ) {
    return "selesai";
  }

  return "diproses";
}

function resolveReportStatus(rowStatus, mobileReport) {
  if (mobileReport) {
    return normalizeMobileStatus(mobileReport.status, mobileReport.tgl_selesai);
  }

  return rowStatus || "diproses";
}

function buildMobileProgressTitle(progress) {
  const text = String(progress?.deskripsi_progres || "").toLowerCase();

  if (text.includes("selesai")) return "Pelayanan Selesai";
  if (text.includes("mediasi")) return "Mediasi Dilakukan";
  if (text.includes("investigasi")) return "Investigasi Berjalan";
  if (text.includes("verifikasi")) return "Verifikasi Berjalan";

  return "Progress Pelayanan";
}

function buildMobileProgressSortDate(progress) {
  if (progress?.tanggal_progres && progress?.created_at) {
    const timePart = String(progress.created_at).split("T")[1];

    if (timePart) {
      return `${progress.tanggal_progres}T${timePart}`;
    }
  }

  return progress?.tanggal_progres || progress?.created_at || null;
}

function mapMobileProgressToTimeline(
  progress,
  mobileReport,
  resolvedParalegal,
) {
  const tanggal = buildMobileProgressSortDate(progress);

  return {
    id_timeline: `mobile-${progress.id}`,
    id_pengaduan: mobileReport?.website_pengaduan_id || "",
    title: buildMobileProgressTitle(progress),
    deskripsi: progress.deskripsi_progres || "-",
    tanggal,
    created_at: progress.created_at || tanggal,
    created_by_name:
      mobileReport?.nama_paralegal_ditugaskan ||
      resolvedParalegal?.nama ||
      "Paralegal",
    source: "mobile",
    sort_at: tanggal || progress.created_at || progress.tanggal_progres,
    foto_dokumentasi: progress.foto_dokumentasi || "",
  };
}

function getDaysDiff(dateStr) {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const now = new Date("2026-02-25T00:00:00");
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
}

function getPriorityLabel(v) {
  if (v === "tinggi") return "Tinggi";
  if (v === "sedang") return "Sedang";
  return "Rendah";
}

function getStatusLabel(v) {
  return v === "selesai" ? "Selesai" : "Diproses";
}

function buildStats(reports) {
  const total = reports.length;
  const aktif = reports.filter((x) => x.status === "diproses").length;
  const selesai = reports.filter((x) => x.status === "selesai").length;
  const tinggi = reports.filter((x) => x.prioritas === "tinggi").length;
  const tingkatSelesai = total ? Math.round((selesai / total) * 100) : 0;
  const avgHari = total
    ? Math.round(
        reports.reduce((sum, x) => sum + getDaysDiff(x.tanggal_kejadian), 0) /
          total,
      )
    : 0;

  return {
    total,
    aktif,
    selesai,
    tinggi,
    tingkatSelesai,
    avgHari,
  };
}

function parseCatatanAdmin(raw) {
  if (!raw) return {};

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Gagal parse catatan_admin:", error, raw);
      return {};
    }
  }

  return {};
}

function buildCatatanAdmin(formData, profile) {
  return JSON.stringify({
    nik: formData.nik || "",
    nama_lurah: formData.nama_lurah || "",
    prioritas: formData.prioritas || "sedang",
    id_paralegal: formData.id_paralegal || "",
    paralegal_nama: formData.paralegal_nama || "",
    paralegal_hp: formData.paralegal_hp || "",
    catatan_internal: formData.catatan_internal || "",
    updates: [
      {
        title: "Laporan Diterima",
        date: formatDateID(new Date().toISOString()),
        time: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        desc: "Laporan berhasil dibuat dan masuk ke antrian pemeriksaan awal.",
        by: profile?.full_name || "Admin Posbankum",
      },
    ],
  });
}

function mapDbToUi(
  row,
  lampiran = [],
  timeline = [],
  paralegalLookup = {},
  mobileReport = null,
  posbankumRow = null,
) {
  const extra = parseCatatanAdmin(row.catatan_admin);
  const resolvedParalegal = resolveParalegal(row, extra, paralegalLookup);

  const fallbackUpdates = [
    {
      title: row.status === "selesai" ? "Laporan Selesai" : "Laporan Diterima",
      date: formatDateID(row.created_at || row.tanggal_kejadian),
      time: row.waktu_kejadian || "-",
      desc: extra.catatan_internal || "Laporan telah masuk ke sistem.",
      by: resolvedParalegal.nama || "Admin Posbankum",
    },
  ];

  const mappedTimeline = (timeline || [])
    .map((item) => ({
      title: item.title || "Update",
      date: item.date_text || formatDateID(item.tanggal || item.created_at),
      time: item.time_text || formatTimeID(item.tanggal || item.created_at),
      desc: item.deskripsi || "-",
      by: item.created_by_name || item.by || "Admin Posbankum",
      source: item.source || "website",
      foto_dokumentasi: item.foto_dokumentasi || "",
      sort_at: item.sort_at || item.tanggal || item.created_at,
    }))
    .sort((a, b) => getTimelineSortValue(a) - getTimelineSortValue(b));

  return {
    id_pengaduan: row.id_pengaduan,
    id_paralegal: resolvedParalegal.id || mobileReport?.paralegal_id || "",
    nomor_pengaduan:
      row.nomor_pengaduan || buildPbktNumberFromMobile(mobileReport),
    nama_pelapor: firstFilled(row.nama_pelapor, mobileReport?.nama_pelapor),
    nik: firstFilled(extra.nik, mobileReport?.nik_pelapor),
    nomor_telepon: firstFilled(row.nomor_telepon, mobileReport?.no_hp_pelapor),
    email: row.email || "",
    nama_lurah: firstFilled(extra.nama_lurah, mobileReport?.nama_lurah),
    jenis_masalah: firstFilled(
      row.jenis_masalah,
      mobileReport?.kategori_masalah,
    ),
    judul_pengaduan: firstFilled(
      row.judul_pengaduan,
      mobileReport?.judul_laporan,
      mobileReport?.kategori_masalah,
    ),
    kronologi: firstFilled(row.kronologi, mobileReport?.kronologi),
    tanggal_kejadian: firstFilled(
      row.tanggal_kejadian,
      mobileReport?.tgl_kejadian,
      mobileReport?.tgl_lapor,
    ),
    waktu_kejadian: firstFilled(
      row.waktu_kejadian,
      mobileReport?.waktu_kejadian,
    ),
    lokasi_kejadian: firstFilled(
      row.lokasi_kejadian,
      mobileReport?.lokasi_kejadian,
    ),
    provinsi: row.provinsi || "",
    kabupaten_kota: row.kabupaten_kota || "",
    kecamatan: row.kecamatan || "",
    posbankum_nama: firstFilled(posbankumRow?.nama),
    posbankum_kelurahan: firstFilled(posbankumRow?.kelurahan),
    posbankum_kecamatan: firstFilled(
      posbankumRow?.kecamatan_nama,
      row.kecamatan,
    ),
    posbankum_info: buildPosbankumInfoLabel({
      posbankumName: posbankumRow?.nama,
      kelurahanName: posbankumRow?.kelurahan,
      kecamatanName: firstFilled(posbankumRow?.kecamatan_nama, row.kecamatan),
    }),
    status: resolveReportStatus(row.status, mobileReport),
    prioritas: extra.prioritas || normalizePriority(mobileReport?.prioritas),
    created_at: firstFilled(
      row.created_at,
      mobileReport?.tgl_lapor,
      mobileReport?.synced_at,
    ),
    paralegal_nama: firstFilled(
      resolvedParalegal.nama,
      mobileReport?.nama_paralegal_ditugaskan,
      "Paralegal",
    ),
    paralegal_hp: firstFilled(
      resolvedParalegal.hp,
      mobileReport?.no_hp_paralegal,
    ),
    catatan_internal: firstFilled(
      extra.catatan_internal,
      mobileReport?.catatan_paralegal,
    ),
    lampiran,
    is_mobile_only: false,
    source_data: mobileReport ? "website_mobile" : "website",
    mobile_pengaduan_id: mobileReport?.id || "",
    global_case_id: mobileReport?.global_case_id || "",
    website_kasus_id: mobileReport?.website_kasus_id || "",
    updates: mappedTimeline.length
      ? mappedTimeline
      : Array.isArray(extra.updates) && extra.updates.length
        ? extra.updates
        : fallbackUpdates,
  };
}

function buildMobileFallbackTimeline(row, paralegalName) {
  return [
    {
      title: row?.tgl_selesai ? "Pelayanan Selesai" : "Laporan Diterima",
      date: formatDateID(row?.tgl_lapor || row?.tgl_kejadian),
      time: formatTimeID(row?.tgl_lapor || row?.created_at),
      desc: firstFilled(
        row?.catatan_paralegal,
        row?.kronologi,
        "Laporan dari mobile telah masuk ke sistem.",
      ),
      by: firstFilled(
        row?.nama_paralegal_ditugaskan,
        paralegalName,
        "Paralegal",
      ),
      source: "mobile",
      sort_at: row?.tgl_lapor || row?.tgl_kejadian || row?.created_at,
    },
  ];
}

function mapMobileReportToUi(
  row,
  progressRows = [],
  relatedKasus = null,
  posbankumRow = null,
) {
  const paralegalName = firstFilled(
    row?.nama_paralegal_ditugaskan,
    "Paralegal",
  );
  const paralegalHp = firstFilled(row?.no_hp_paralegal);

  const mappedTimeline = (progressRows || [])
    .map((progress) =>
      mapMobileProgressToTimeline(progress, row, {
        nama: paralegalName,
        hp: paralegalHp,
      }),
    )
    .sort((a, b) => getTimelineSortValue(a) - getTimelineSortValue(b))
    .map((item) => ({
      title: item.title || "Progress Pelayanan",
      date: formatDateID(item.tanggal || item.created_at),
      time: formatTimeID(item.tanggal || item.created_at),
      desc: item.deskripsi || "-",
      by: item.created_by_name || paralegalName,
      source: "mobile",
      foto_dokumentasi: item.foto_dokumentasi || "",
      sort_at: item.sort_at || item.tanggal || item.created_at,
    }));

  return {
    id_pengaduan: `mobile-${row.id}`,
    id_paralegal: row.paralegal_id || "",
    nomor_pengaduan: buildPbktNumberFromMobile(row),
    nama_pelapor: firstFilled(row.nama_pelapor, "Pelapor Belum Diisi"),
    nik: firstFilled(row.nik_pelapor),
    nomor_telepon: firstFilled(row.no_hp_pelapor),
    email: "",
    nama_lurah: firstFilled(row.nama_lurah),
    jenis_masalah: firstFilled(row.kategori_masalah, "Lainnya"),
    judul_pengaduan: firstFilled(
      row.judul_laporan,
      row.kategori_masalah,
      "Laporan Mobile",
    ),
    kronologi: firstFilled(
      row.kronologi,
      row.catatan_paralegal,
      "Belum ada kronologi.",
    ),
    tanggal_kejadian: firstFilled(row.tgl_kejadian, row.tgl_lapor),
    waktu_kejadian: firstFilled(row.waktu_kejadian),
    lokasi_kejadian: firstFilled(row.lokasi_kejadian),
    provinsi: "",
    kabupaten_kota: "",
    kecamatan: firstFilled(posbankumRow?.kecamatan_nama),
    posbankum_nama: firstFilled(posbankumRow?.nama),
    posbankum_kelurahan: firstFilled(posbankumRow?.kelurahan),
    posbankum_kecamatan: firstFilled(posbankumRow?.kecamatan_nama),
    posbankum_info: buildPosbankumInfoLabel({
      posbankumName: posbankumRow?.nama,
      kelurahanName: posbankumRow?.kelurahan,
      kecamatanName: posbankumRow?.kecamatan_nama,
    }),
    status: normalizeMobileStatus(row.status, row.tgl_selesai),
    prioritas: normalizePriority(row.prioritas),
    created_at: firstFilled(row.tgl_lapor, row.synced_at),
    paralegal_nama: paralegalName,
    paralegal_hp: paralegalHp,
    catatan_internal: firstFilled(row.catatan_paralegal),
    lampiran: [],
    updates: [
      ...buildMobileFallbackTimeline(row, paralegalName),
      ...mappedTimeline,
    ].sort((a, b) => getTimelineSortValue(a) - getTimelineSortValue(b)),
    is_mobile_only: true,
    source_data: "mobile",
    mobile_pengaduan_id: row.id,
    global_case_id: row.global_case_id || relatedKasus?.global_case_id || "",
    website_kasus_id: row.website_kasus_id || relatedKasus?.id_kasus || "",
  };
}

function buildKasusLookup(kasusRows = []) {
  const byGlobalCaseId = new Map();
  const byWebsiteKasusId = new Map();
  const byMobilePengaduanId = new Map();

  for (const row of kasusRows || []) {
    if (row.global_case_id) byGlobalCaseId.set(row.global_case_id, row);
    if (row.id_kasus) byWebsiteKasusId.set(row.id_kasus, row);
    if (row.mobile_pengaduan_id)
      byMobilePengaduanId.set(row.mobile_pengaduan_id, row);
  }

  return { byGlobalCaseId, byWebsiteKasusId, byMobilePengaduanId };
}

function resolveRelatedKasusFromMobile(row, lookup) {
  return (
    lookup.byGlobalCaseId.get(row.global_case_id) ||
    lookup.byWebsiteKasusId.get(row.website_kasus_id) ||
    lookup.byMobilePengaduanId.get(row.id) ||
    null
  );
}

function buildMobileOnlyReports({
  mobileRows = [],
  mobileProgressMap = new Map(),
  kasusRows = [],
  linkedMobileIds = new Set(),
  posbankumRow = null,
} = {}) {
  const lookup = buildKasusLookup(kasusRows);
  const reports = [];

  for (const row of mobileRows || []) {
    if (!row?.id || linkedMobileIds.has(row.id)) continue;

    const relatedKasus = resolveRelatedKasusFromMobile(row, lookup);

    if (relatedKasus?.website_pengaduan_id) continue;

    reports.push(
      mapMobileReportToUi(
        row,
        mobileProgressMap.get(row.id) || [],
        relatedKasus,
        posbankumRow,
      ),
    );
  }

  return reports;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getErrorText(error) {
  return [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ");
}

function isDuplicateNomorPengaduanError(error) {
  const rawMessage = getErrorText(error).toLowerCase();

  return (
    error?.code === "23505" ||
    rawMessage.includes("uq_pengaduan_nomor_per_posbankum") ||
    rawMessage.includes("duplicate key value")
  );
}

function isIgnorableMobileSyncError(error) {
  const rawMessage = getErrorText(error).toLowerCase();

  return (
    rawMessage.includes("masyarakat_id") ||
    rawMessage.includes("vite_mobile_system_masyarakat_id") ||
    rawMessage.includes("sinkron mobile belum aktif") ||
    rawMessage.includes("vite_mobile_sync_url") ||
    rawMessage.includes("vite_mobile_supabase_url") ||
    rawMessage.includes("vite_mobile_supabase_anon_key")
  );
}

function renderRequiredLabel(text) {
  return (
    <>
      {text} <span className="lpRequiredMark">*</span>
    </>
  );
}

async function generateNomorPengaduan(id_posbankum) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PBKT/${year}/${month}/`;
  const nomorRegex = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);

  const { data, error } = await supabase
    .from("pengaduan")
    .select("nomor_pengaduan")
    .eq("id_posbankum", id_posbankum)
    .like("nomor_pengaduan", `${prefix}%`);

  if (error) throw error;

  const nomorTerakhir = (data || []).reduce((maksimum, item) => {
    const match = String(item?.nomor_pengaduan || "").match(nomorRegex);
    if (!match) return maksimum;

    const nilai = Number.parseInt(match[1], 10);
    if (!Number.isFinite(nilai)) return maksimum;

    return Math.max(maksimum, nilai);
  }, 0);

  return `${prefix}${String(nomorTerakhir + 1).padStart(3, "0")}`;
}

async function insertPengaduanWithRetry(basePayload, maxAttempts = 5) {
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const nomor_pengaduan = await generateNomorPengaduan(
      basePayload.id_posbankum,
    );

    const { data, error } = await supabase
      .from("pengaduan")
      .insert({
        ...basePayload,
        nomor_pengaduan,
      })
      .select("id_pengaduan, created_at, nomor_pengaduan")
      .single();

    if (!error) {
      return data;
    }

    if (!isDuplicateNomorPengaduanError(error)) {
      throw error;
    }

    lastError = error;
  }

  throw (
    lastError ||
    new Error(
      "Nomor laporan bentrok dengan data yang sudah ada. Silakan coba simpan kembali.",
    )
  );
}

function addRowsToMap(map, rows = []) {
  for (const row of rows || []) {
    if (row?.id) {
      map.set(row.id, row);
    }
  }
}

async function getMobilePengaduanRowsForReports({
  profile,
  kasusRows = [],
  posbankumRow = null,
}) {
  if (!mobileSupabase) return [];

  const rowsMap = new Map();
  const selectColumns = MOBILE_PENGADUAN_SELECT;
  const kasusLookup = buildKasusLookup(kasusRows);

  if (profile?.id_posbankum) {
    const { data, error } = await mobileSupabase
      .from("pengaduan")
      .select(selectColumns)
      .eq("website_posbankum_id", profile.id_posbankum);

    if (!error) {
      addRowsToMap(rowsMap, data || []);
    } else {
      console.warn(
        "Gagal membaca pengaduan mobile berdasarkan posbankum:",
        error,
      );
    }
  }

  const globalCaseIds = Array.from(
    new Set(
      (kasusRows || []).map((item) => item.global_case_id).filter(Boolean),
    ),
  );

  const websiteKasusIds = Array.from(
    new Set((kasusRows || []).map((item) => item.id_kasus).filter(Boolean)),
  );

  const mobilePengaduanIds = Array.from(
    new Set(
      (kasusRows || []).map((item) => item.mobile_pengaduan_id).filter(Boolean),
    ),
  );

  const relationFilters = [
    ...globalCaseIds.map((id) => `global_case_id.eq.${id}`),
    ...websiteKasusIds.map((id) => `website_kasus_id.eq.${id}`),
    ...mobilePengaduanIds.map((id) => `id.eq.${id}`),
  ];

  if (relationFilters.length) {
    const { data, error } = await mobileSupabase
      .from("pengaduan")
      .select(selectColumns)
      .or(relationFilters.join(","));

    if (!error) {
      addRowsToMap(rowsMap, data || []);
    } else {
      console.warn(
        "Gagal membaca pengaduan mobile berdasarkan relasi kasus:",
        error,
      );
    }
  }

  const { data: allMobileRows, error: allMobileRowsError } =
    await mobileSupabase
      .from("pengaduan")
      .select(selectColumns)
      .order("tgl_lapor", { ascending: false })
      .limit(300);

  if (allMobileRowsError) {
    console.warn("Gagal membaca seluruh pengaduan mobile:", allMobileRowsError);
    return Array.from(rowsMap.values());
  }

  const mobileParalegalIds = Array.from(
    new Set(
      (allMobileRows || []).map((item) => item.paralegal_id).filter(Boolean),
    ),
  );

  let mobileParalegalMap = new Map();

  if (mobileParalegalIds.length) {
    const { data: mobileParalegalRows, error: mobileParalegalError } =
      await mobileSupabase
        .from("paralegal")
        .select("id, nama_posbankum, no_hp")
        .in("id", mobileParalegalIds);

    if (!mobileParalegalError) {
      mobileParalegalMap = new Map(
        (mobileParalegalRows || []).map((item) => [item.id, item]),
      );
    } else {
      console.warn("Gagal membaca paralegal mobile:", mobileParalegalError);
    }
  }

  for (const row of allMobileRows || []) {
    if (!row?.id || rowsMap.has(row.id)) continue;

    const relatedKasus = resolveRelatedKasusFromMobile(row, kasusLookup);
    const mobileParalegal = mobileParalegalMap.get(row.paralegal_id);
    const belongsToCurrentPosbankum = Boolean(
      row.website_posbankum_id === profile?.id_posbankum ||
      relatedKasus?.id_posbankum === profile?.id_posbankum ||
      isSamePosbankumName(mobileParalegal?.nama_posbankum, posbankumRow?.nama),
    );

    if (belongsToCurrentPosbankum) {
      rowsMap.set(row.id, {
        ...row,
        nama_paralegal_ditugaskan: firstFilled(
          row.nama_paralegal_ditugaskan,
          mobileParalegal?.nama_posbankum,
        ),
        no_hp_paralegal: firstFilled(
          row.no_hp_paralegal,
          mobileParalegal?.no_hp,
        ),
      });
    }
  }

  return Array.from(rowsMap.values());
}

function buildMobileReportMap(kasusRows = [], mobileRows = []) {
  const kasusByGlobalCaseId = new Map();
  const kasusByWebsiteKasusId = new Map();
  const kasusByMobilePengaduanId = new Map();

  for (const row of kasusRows || []) {
    if (row.global_case_id) kasusByGlobalCaseId.set(row.global_case_id, row);
    if (row.id_kasus) kasusByWebsiteKasusId.set(row.id_kasus, row);
    if (row.mobile_pengaduan_id) {
      kasusByMobilePengaduanId.set(row.mobile_pengaduan_id, row);
    }
  }

  const mobileReportMap = new Map();

  for (const row of mobileRows || []) {
    const relatedKasus =
      kasusByGlobalCaseId.get(row.global_case_id) ||
      kasusByWebsiteKasusId.get(row.website_kasus_id) ||
      kasusByMobilePengaduanId.get(row.id) ||
      null;

    if (!relatedKasus?.website_pengaduan_id) continue;

    mobileReportMap.set(relatedKasus.website_pengaduan_id, {
      ...row,
      website_pengaduan_id: relatedKasus.website_pengaduan_id,
      website_kasus_id: row.website_kasus_id || relatedKasus.id_kasus,
      global_case_id: row.global_case_id || relatedKasus.global_case_id,
    });
  }

  return mobileReportMap;
}

async function getMobileProgressMap(mobileRows = []) {
  if (!mobileSupabase) return new Map();

  const mobilePengaduanIds = Array.from(
    new Set((mobileRows || []).map((item) => item.id).filter(Boolean)),
  );

  if (!mobilePengaduanIds.length) return new Map();

  const { data, error } = await mobileSupabase
    .from("progres_kasus")
    .select(MOBILE_PROGRESS_SELECT)
    .in("pengaduan_id", mobilePengaduanIds)
    .order("tanggal_progres", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const progressMap = new Map();

  for (const progress of data || []) {
    if (!progressMap.has(progress.pengaduan_id)) {
      progressMap.set(progress.pengaduan_id, []);
    }

    progressMap.get(progress.pengaduan_id).push(progress);
  }

  return progressMap;
}

async function loadMobileTimelineData({
  profile,
  kasusRows = [],
  posbankumRow = null,
}) {
  if (!mobileSupabase) {
    return {
      mobileRows: [],
      mobileReportMap: new Map(),
      mobileProgressMap: new Map(),
    };
  }

  const mobileRows = await getMobilePengaduanRowsForReports({
    profile,
    kasusRows,
    posbankumRow,
  });

  const mobileReportMap = buildMobileReportMap(kasusRows, mobileRows);
  const mobileProgressMap = await getMobileProgressMap(mobileRows);

  return { mobileRows, mobileReportMap, mobileProgressMap };
}

async function syncWebsiteReportToMobile({
  kasusRow,
  pengaduanRow,
  formData,
  profile,
}) {
  const payload = {
    global_case_id: kasusRow.global_case_id,
    website_kasus_id: kasusRow.id_kasus,
    website_pengaduan_id: pengaduanRow.id_pengaduan,
    website_posbankum_id: profile.id_posbankum,
    source_system: "website",
    kategori_masalah: formData.jenis_masalah,
    kronologi: formData.kronologi,
    lokasi_kejadian: formData.lokasi_kejadian,
    lampiran_urls: [],
    status: "Pending",
    prioritas: formData.prioritas || "sedang",
    paralegal_id: null,
    tgl_lapor: pengaduanRow.created_at || new Date().toISOString(),
    tgl_selesai: null,
    tgl_kejadian: formData.tanggal_kejadian || null,
    waktu_kejadian: formData.waktu_kejadian || null,
    nama_pelapor: formData.nama_pelapor || "",
    nik_pelapor: formData.nik || "",
    no_hp_pelapor: formData.nomor_telepon || "",
    nama_lurah: formData.nama_lurah || "",
    catatan_paralegal: formData.catatan_internal || "",
    nama_paralegal_ditugaskan: formData.paralegal_nama || "",
    no_hp_paralegal: formData.paralegal_hp || "",
  };

  if (MOBILE_SYNC_URL) {
    const response = await fetch(MOBILE_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(MOBILE_SYNC_TOKEN
          ? {
              "x-sync-token": MOBILE_SYNC_TOKEN,
              Authorization: `Bearer ${MOBILE_SYNC_TOKEN}`,
            }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          "Gagal mengirim data laporan pelayanan ke Supabase mobile.",
      );
    }

    return result;
  }

  if (!mobileSupabase) {
    throw new Error(
      "Sinkron mobile belum aktif. Isi VITE_MOBILE_SYNC_URL atau VITE_MOBILE_SUPABASE_URL dan VITE_MOBILE_SUPABASE_ANON_KEY.",
    );
  }

  if (!MOBILE_SYSTEM_MASYARAKAT_ID) {
    throw new Error(
      "Sinkron website ke mobile gagal karena tabel mobile.pengaduan masih mewajibkan masyarakat_id. Isi VITE_MOBILE_SYSTEM_MASYARAKAT_ID atau ubah mobile agar masyarakat_id boleh null.",
    );
  }

  const { data: existingRow, error: existingError } = await mobileSupabase
    .from("pengaduan")
    .select("id, global_case_id")
    .eq("global_case_id", kasusRow.global_case_id)
    .maybeSingle();

  if (existingError) throw existingError;

  const mobileId =
    existingRow?.id ||
    `WEB-${String(kasusRow.global_case_id || crypto.randomUUID())
      .replace(/-/g, "")
      .toUpperCase()}`;

  const mobileRow = {
    id: mobileId,
    masyarakat_id: MOBILE_SYSTEM_MASYARAKAT_ID,
    kategori_masalah: payload.kategori_masalah,
    kronologi: payload.kronologi,
    lokasi_kejadian: payload.lokasi_kejadian,
    lampiran_urls: payload.lampiran_urls,
    status: payload.status,
    prioritas: payload.prioritas,
    paralegal_id: payload.paralegal_id,
    tgl_lapor: payload.tgl_lapor,
    tgl_selesai: payload.tgl_selesai,
    tgl_kejadian: payload.tgl_kejadian,
    waktu_kejadian: payload.waktu_kejadian,
    global_case_id: payload.global_case_id,
    source_system: payload.source_system,
    website_kasus_id: payload.website_kasus_id,
    website_posbankum_id: payload.website_posbankum_id,
    synced_at: new Date().toISOString(),
    judul_laporan: formData.judul_pengaduan || formData.jenis_masalah,
    nama_lurah: payload.nama_lurah,
    catatan_paralegal: payload.catatan_paralegal,
    nama_paralegal_ditugaskan: payload.nama_paralegal_ditugaskan,
    no_hp_paralegal: payload.no_hp_paralegal,
    nama_pelapor: payload.nama_pelapor,
    nik_pelapor: payload.nik_pelapor,
    no_hp_pelapor: payload.no_hp_pelapor,
  };

  const { error: upsertError } = await mobileSupabase
    .from("pengaduan")
    .upsert(mobileRow, { onConflict: "global_case_id" });

  if (upsertError) throw upsertError;

  return { id: mobileId, global_case_id: kasusRow.global_case_id };
}

function sanitizeFileName(name) {
  return String(name || "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function digitsOnly(value, maxLength = Infinity) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

function normalizeText(value, maxLength = Infinity) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeOptionalEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAllowedFileType(file) {
  const mimeType = String(file?.type || "").toLowerCase();
  const fileName = String(file?.name || "").toLowerCase();

  return (
    ALLOWED_UPLOAD_TYPES.includes(mimeType) ||
    ALLOWED_UPLOAD_EXTENSIONS.some((ext) => fileName.endsWith(ext))
  );
}

function getSanitizedFormData(formData) {
  return {
    ...formData,
    nama_pelapor: normalizeText(formData.nama_pelapor, 120),
    nik: digitsOnly(formData.nik, MAX_NIK_LENGTH),
    nomor_telepon: digitsOnly(formData.nomor_telepon, MAX_PHONE_LENGTH),
    email: normalizeOptionalEmail(formData.email),
    nama_lurah: normalizeText(formData.nama_lurah, 120),
    kelurahan: normalizeText(formData.kelurahan, 120),
    jenis_masalah: normalizeText(formData.jenis_masalah, 80),
    prioritas: normalizeText(formData.prioritas, 20),
    judul_pengaduan: normalizeText(formData.judul_pengaduan, MAX_TITLE_LENGTH),
    kronologi: normalizeText(formData.kronologi, 3000),
    tanggal_kejadian: String(formData.tanggal_kejadian || "").trim(),
    waktu_kejadian: String(formData.waktu_kejadian || "").trim(),
    lokasi_kejadian: normalizeText(formData.lokasi_kejadian, 200),
    id_paralegal: String(formData.id_paralegal || "").trim(),
    paralegal_nama: normalizeText(formData.paralegal_nama, 120),
    paralegal_hp: digitsOnly(formData.paralegal_hp, MAX_PHONE_LENGTH),
    catatan_internal: normalizeText(formData.catatan_internal, 1500),
    lampiran: Array.isArray(formData.lampiran) ? formData.lampiran : [],
  };
}

function validateFormData(formData, paralegalOptions = []) {
  const cleaned = getSanitizedFormData(formData);
  const requiredFields = [
    cleaned.nama_pelapor,
    cleaned.nik,
    cleaned.nomor_telepon,
    cleaned.nama_lurah,
    cleaned.jenis_masalah,
    cleaned.prioritas,
    cleaned.judul_pengaduan,
    cleaned.kronologi,
    cleaned.tanggal_kejadian,
    cleaned.waktu_kejadian,
    cleaned.lokasi_kejadian,
    cleaned.id_paralegal,
    cleaned.paralegal_nama,
  ];

  if (!paralegalOptions.length) {
    return "Belum ada data paralegal pada Profil Posbankum. Tambahkan paralegal terlebih dahulu melalui menu Profil Posbankum.";
  }

  if (requiredFields.some((value) => !value)) {
    return "Lengkapi semua field wajib.";
  }

  if (cleaned.nik.length !== MAX_NIK_LENGTH) {
    return "NIK harus terdiri dari 16 digit angka.";
  }

  if (
    cleaned.nomor_telepon.length < 10 ||
    cleaned.nomor_telepon.length > MAX_PHONE_LENGTH
  ) {
    return "Nomor telepon harus terdiri dari 10 sampai 15 digit angka.";
  }

  if (!isValidEmail(cleaned.email)) {
    return "Format email tidak valid.";
  }

  if (cleaned.judul_pengaduan.length < 8) {
    return "Judul laporan minimal 8 karakter.";
  }

  if (cleaned.kronologi.length < 20) {
    return "Kronologi minimal 20 karakter agar laporan lebih jelas.";
  }

  if (cleaned.tanggal_kejadian > new Date().toISOString().split("T")[0]) {
    return "Tanggal kejadian tidak boleh melebihi hari ini.";
  }

  const selectedParalegal = paralegalOptions.find(
    (item) => item.id === cleaned.id_paralegal,
  );

  if (!selectedParalegal) {
    return "Paralegal yang dipilih tidak valid atau sudah dihapus dari Profil Posbankum.";
  }

  if (selectedParalegal.nama !== cleaned.paralegal_nama) {
    return "Nama paralegal tidak sesuai dengan data pilihan terbaru.";
  }

  if (
    cleaned.paralegal_hp &&
    digitsOnly(selectedParalegal.hp, MAX_PHONE_LENGTH) !== cleaned.paralegal_hp
  ) {
    return "Nomor HP paralegal tidak sesuai dengan data pilihan terbaru.";
  }

  for (const file of cleaned.lampiran) {
    if (!isAllowedFileType(file.file)) {
      return `File ${file.nama_file} tidak didukung. Hanya PNG, JPG, JPEG, dan PDF yang diperbolehkan.`;
    }

    if ((file.size_bytes || 0) > MAX_FILE_SIZE_BYTES) {
      return `Ukuran file ${file.nama_file} melebihi batas 5MB.`;
    }
  }

  return "";
}

export default function KelolaPengaduan({ profile }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState("aktif");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("semua");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [reminderModal, setReminderModal] = useState(EMPTY_REMINDER_MODAL);
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [paralegalOptions, setParalegalOptions] = useState([]);
  const [currentPosbankum, setCurrentPosbankum] = useState(null);

  const closeReminderModal = () => {
    setReminderModal(EMPTY_REMINDER_MODAL);
  };

  const openReminderModal = ({
    title = "Pengingat",
    subtitle = "Periksa kembali informasi berikut",
    description = "",
    buttonLabel = "Mengerti",
  }) => {
    setReminderModal({
      open: true,
      title,
      subtitle,
      description,
      buttonLabel,
    });
  };

  async function loadParalegalOptions() {
    if (!profile?.id_posbankum) {
      setParalegalOptions([]);
      return [];
    }

    const { data, error } = await supabase
      .from("paralegal_members")
      .select(
        "id_paralegal, nama_paralegal, nomor_telepon, is_primary, created_at",
      )
      .eq("id_posbankum", profile.id_posbankum)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const options = (data || [])
      .map((item, index) => normalizeParalegalOption(item, index))
      .filter((item) => item.id && item.nama && item.hp);

    setParalegalOptions(options);
    return options;
  }

  async function loadReports() {
    if (!profile?.id_posbankum) {
      setReports([]);
      setParalegalOptions([]);
      setCurrentPosbankum(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const loadedParalegals = await loadParalegalOptions();
      const paralegalLookup = buildParalegalLookup(loadedParalegals);

      const { data: currentPosbankumRow, error: currentPosbankumError } =
        await supabase
          .from("posbankum")
          .select(
            `
            id_posbankum,
            id_kecamatan,
            nama,
            nomor_tlp,
            alamat,
            nama_paralegal,
            email_akun,
            kelurahan
          `,
          )
          .eq("id_posbankum", profile.id_posbankum)
          .maybeSingle();

      if (currentPosbankumError) throw currentPosbankumError;

      let currentPosbankum = currentPosbankumRow || null;

      if (currentPosbankumRow?.id_kecamatan) {
        const { data: currentKecamatanRow, error: currentKecamatanError } =
          await supabase
            .from("kecamatan")
            .select("id_kecamatan, nama")
            .eq("id_kecamatan", currentPosbankumRow.id_kecamatan)
            .maybeSingle();

        if (currentKecamatanError) throw currentKecamatanError;

        currentPosbankum = {
          ...currentPosbankumRow,
          kecamatan_nama: currentKecamatanRow?.nama || "",
        };
      }

      setCurrentPosbankum(currentPosbankum);

      const { data: pengaduanRows, error: pengaduanError } = await supabase
        .from("pengaduan")
        .select(
          `
          id_pengaduan,
          id_posbankum,
          nomor_pengaduan,
          nama_pelapor,
          nomor_telepon,
          email,
          jenis_masalah,
          judul_pengaduan,
          kronologi,
          tanggal_kejadian,
          waktu_kejadian,
          lokasi_kejadian,
          provinsi,
          kabupaten_kota,
          kecamatan,
          id_kabupaten,
          id_kecamatan,
          status,
          id_paralegal,
          catatan_admin,
          created_by,
          created_at,
          updated_at
        `,
        )
        .eq("id_posbankum", profile.id_posbankum)
        .order("created_at", { ascending: false });

      if (pengaduanError) throw pengaduanError;

      const ids = (pengaduanRows || []).map((x) => x.id_pengaduan);

      let lampiranRows = [];
      let timelineRows = [];
      let relatedKasusRows = [];

      const { data: kasusData, error: kasusError } = await supabase
        .from("kasus")
        .select(
          `
          id_kasus,
          id_posbankum,
          global_case_id,
          mobile_pengaduan_id,
          website_pengaduan_id,
          status,
          prioritas,
          tgl_upload,
          tgl_selesai,
          last_synced_at
        `,
        )
        .eq("id_posbankum", profile.id_posbankum);

      if (kasusError) throw kasusError;
      relatedKasusRows = kasusData || [];

      if (ids.length) {
        const { data: timelineData, error: timelineError } = await supabase
          .from("pengaduan_timeline")
          .select(
            `
            id_timeline,
            id_pengaduan,
            title,
            deskripsi,
            tanggal,
            created_by,
            created_at
          `,
          )
          .in("id_pengaduan", ids)
          .order("tanggal", { ascending: true });

        if (timelineError) throw timelineError;
        timelineRows = timelineData || [];
      }

      const timelineUserIds = Array.from(
        new Set((timelineRows || []).map((x) => x.created_by).filter(Boolean)),
      );

      let timelineProfileMap = new Map();
      if (timelineUserIds.length) {
        const { data: timelineProfiles, error: timelineProfilesError } =
          await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", timelineUserIds);

        if (timelineProfilesError) throw timelineProfilesError;

        timelineProfileMap = new Map(
          (timelineProfiles || []).map((x) => [x.id, x.full_name]),
        );
      }

      const timelineMap = new Map();
      for (const item of timelineRows) {
        const normalized = {
          ...item,
          created_by_name:
            timelineProfileMap.get(item.created_by) || "Admin Posbankum",
          source: "website",
          sort_at: item.tanggal || item.created_at,
        };

        if (!timelineMap.has(item.id_pengaduan)) {
          timelineMap.set(item.id_pengaduan, []);
        }
        timelineMap.get(item.id_pengaduan).push(normalized);
      }

      let mobileRows = [];
      let mobileOnlyReports = [];
      let mobileReportMap = new Map();

      try {
        const mobileTimelineData = await loadMobileTimelineData({
          profile,
          kasusRows: relatedKasusRows,
          posbankumRow: currentPosbankum,
        });

        mobileRows = mobileTimelineData.mobileRows || [];
        mobileReportMap = mobileTimelineData.mobileReportMap;
        const mobileProgressMap = mobileTimelineData.mobileProgressMap;
        const linkedMobileIds = new Set(
          Array.from(mobileReportMap.values())
            .map((item) => item.id)
            .filter(Boolean),
        );
        const pengaduanRowMap = new Map(
          (pengaduanRows || []).map((row) => [row.id_pengaduan, row]),
        );

        for (const [idPengaduan, mobileReport] of mobileReportMap.entries()) {
          const row = pengaduanRowMap.get(idPengaduan);
          if (!row) continue;

          const extra = parseCatatanAdmin(row.catatan_admin);
          const resolvedParalegal = resolveParalegal(
            row,
            extra,
            paralegalLookup,
          );

          const mobileProgressRows =
            mobileProgressMap.get(mobileReport.id) || [];

          if (!mobileProgressRows.length) continue;

          if (!timelineMap.has(idPengaduan)) {
            timelineMap.set(idPengaduan, []);
          }

          const mappedMobileTimeline = mobileProgressRows.map((progress) =>
            mapMobileProgressToTimeline(
              progress,
              mobileReport,
              resolvedParalegal,
            ),
          );

          timelineMap.get(idPengaduan).push(...mappedMobileTimeline);
        }

        for (const [, items] of timelineMap.entries()) {
          items.sort(
            (a, b) => getTimelineSortValue(a) - getTimelineSortValue(b),
          );
        }

        mobileOnlyReports = buildMobileOnlyReports({
          mobileRows,
          mobileProgressMap,
          kasusRows: relatedKasusRows,
          linkedMobileIds,
          posbankumRow: currentPosbankum,
        });
      } catch (mobileTimelineError) {
        console.warn("Timeline mobile belum bisa dimuat:", mobileTimelineError);
      }

      if (ids.length) {
        const { data: lampiranData, error: lampiranError } = await supabase
          .from("pengaduan_lampiran")
          .select(
            `
            id_lampiran,
            id_pengaduan,
            nama_file,
            path_file,
            mime_type,
            size_bytes,
            created_at
          `,
          )
          .in("id_pengaduan", ids)
          .order("created_at", { ascending: true });

        if (lampiranError) throw lampiranError;
        lampiranRows = lampiranData || [];
      }

      const lampiranMap = new Map();
      for (const item of lampiranRows) {
        if (!lampiranMap.has(item.id_pengaduan)) {
          lampiranMap.set(item.id_pengaduan, []);
        }
        lampiranMap.get(item.id_pengaduan).push(item);
      }

      const mapped = (pengaduanRows || []).map((row) =>
        mapDbToUi(
          row,
          lampiranMap.get(row.id_pengaduan) || [],
          timelineMap.get(row.id_pengaduan) || [],
          paralegalLookup,
          mobileReportMap.get(row.id_pengaduan) || null,
          currentPosbankum,
        ),
      );

      const finalReports = [...mapped, ...mobileOnlyReports].sort(
        (a, b) =>
          getTimelineSortValue({ sort_at: b.created_at }) -
          getTimelineSortValue({ sort_at: a.created_at }),
      );

      setReports(finalReports);
    } catch (err) {
      console.error("loadReports error:", err);
      setErrorMessage(err.message || "Gagal memuat data laporan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile?.id_posbankum) {
      loadReports();
    } else {
      setReports([]);
      setParalegalOptions([]);
      setCurrentPosbankum(null);
      setLoading(false);
    }
  }, [profile?.id_posbankum]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.id_paralegal) return prev;

      const selected = paralegalOptions.find(
        (item) => item.id === prev.id_paralegal,
      );

      if (!selected) {
        return {
          ...prev,
          id_paralegal: "",
          paralegal_nama: "",
          paralegal_hp: "",
        };
      }

      if (
        prev.paralegal_nama === selected.nama &&
        prev.paralegal_hp === selected.hp
      ) {
        return prev;
      }

      return {
        ...prev,
        paralegal_nama: selected.nama,
        paralegal_hp: selected.hp,
      };
    });
  }, [paralegalOptions]);

  const stats = useMemo(() => buildStats(reports), [reports]);

  const activeReports = useMemo(
    () => reports.filter((x) => x.status === "diproses"),
    [reports],
  );

  const completedReports = useMemo(
    () => reports.filter((x) => x.status === "selesai"),
    [reports],
  );

  const filteredReports = useMemo(() => {
    const source = tab === "riwayat" ? completedReports : activeReports;

    return source.filter((item) => {
      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        item.nama_pelapor.toLowerCase().includes(keyword) ||
        item.nik.toLowerCase().includes(keyword) ||
        item.nomor_pengaduan.toLowerCase().includes(keyword) ||
        item.judul_pengaduan.toLowerCase().includes(keyword);

      const matchesPriority =
        priorityFilter === "semua" || item.prioritas === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tab, activeReports, completedReports, search, priorityFilter]);

  const jenisStats = useMemo(() => {
    const jenisList = [
      "Pidana",
      "Perdata",
      "Ketenagakerjaan",
      "Keluarga",
      "Pertanahan",
      "Konsumen",
    ];

    return jenisList.map((jenis) => {
      const count = reports.filter((x) => x.jenis_masalah === jenis).length;
      const percentage = reports.length
        ? Math.round((count / reports.length) * 100)
        : 0;
      return { jenis, count, percentage };
    });
  }, [reports]);

  const priorityStats = useMemo(() => {
    const priorities = ["tinggi", "sedang", "rendah"];
    return priorities.map((priority) => {
      const count = reports.filter((x) => x.prioritas === priority).length;
      const percentage = reports.length
        ? Math.round((count / reports.length) * 100)
        : 0;
      return { priority, count, percentage };
    });
  }, [reports]);

  const handleOpenDetail = (report) => {
    setSelectedReport(report);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedReport(null);
    setShowPreview(false);
    setPreviewFile(null);
  };

  const isImageFile = (file) => {
    const mime = String(file?.mime_type || "").toLowerCase();
    const name = String(file?.nama_file || "").toLowerCase();

    return (
      mime.startsWith("image/") ||
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".webp") ||
      name.endsWith(".gif") ||
      name.endsWith(".bmp")
    );
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
  };

  const handleOpenLampiran = async (file) => {
    try {
      if (!file?.path_file) {
        openReminderModal({
          title: "Lampiran tidak ditemukan",
          subtitle: "File tidak dapat dibuka",
          description: "File lampiran tidak ditemukan.",
        });
        return;
      }

      setPreviewLoading(true);

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(file.path_file, 3600);

      if (error) throw error;

      const signedUrl = data?.signedUrl;
      if (!signedUrl) {
        throw new Error("URL file tidak berhasil dibuat.");
      }

      if (isImageFile(file)) {
        setPreviewFile({
          ...file,
          signedUrl,
        });
        setShowPreview(true);
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("handleOpenLampiran error:", err);
      openReminderModal({
        title: "Lampiran gagal dibuka",
        subtitle: "Terjadi kendala saat membuka file",
        description: err.message || "Gagal membuka lampiran.",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id_pengaduan) => {
    setDeleteTargetId(id_pengaduan);
  };

  const confirmDelete = async () => {
    const id_pengaduan = deleteTargetId;
    if (!id_pengaduan || deleting) return;
    setDeleting(true);

    try {
      const { data: relatedKasusRows, error: relatedKasusError } =
        await supabase
          .from("kasus")
          .select("id_kasus, global_case_id")
          .eq("website_pengaduan_id", id_pengaduan);

      if (relatedKasusError) throw relatedKasusError;

      const relatedKasusIds = (relatedKasusRows || [])
        .map((item) => item.id_kasus)
        .filter(Boolean);
      const relatedGlobalCaseIds = (relatedKasusRows || [])
        .map((item) => item.global_case_id)
        .filter(Boolean);

      const { data: lampiranRows, error: lampiranError } = await supabase
        .from("pengaduan_lampiran")
        .select("id_lampiran, path_file")
        .eq("id_pengaduan", id_pengaduan);

      if (lampiranError) throw lampiranError;

      const paths = (lampiranRows || [])
        .map((x) => x.path_file)
        .filter(Boolean);

      if (paths.length) {
        const { error: storageDeleteError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(paths);

        if (storageDeleteError) throw storageDeleteError;
      }

      if (relatedGlobalCaseIds.length) {
        const { error: kasusProgressDeleteError } = await supabase
          .from("kasus_progress")
          .delete()
          .in("global_case_id", relatedGlobalCaseIds);

        if (kasusProgressDeleteError) throw kasusProgressDeleteError;
      }

      if (relatedKasusIds.length) {
        const { error: lihatKasusDeleteError } = await supabase
          .from("lihat_kasus")
          .delete()
          .in("id_kasus", relatedKasusIds);

        if (lihatKasusDeleteError) throw lihatKasusDeleteError;
      }

      const { error: timelineDeleteError } = await supabase
        .from("pengaduan_timeline")
        .delete()
        .eq("id_pengaduan", id_pengaduan);

      if (timelineDeleteError) throw timelineDeleteError;

      const { error: lampiranDeleteError } = await supabase
        .from("pengaduan_lampiran")
        .delete()
        .eq("id_pengaduan", id_pengaduan);

      if (lampiranDeleteError) throw lampiranDeleteError;

      if (relatedKasusIds.length) {
        const { error: kasusDeleteError } = await supabase
          .from("kasus")
          .delete()
          .in("id_kasus", relatedKasusIds);

        if (kasusDeleteError) throw kasusDeleteError;
      }

      const { error: pengaduanDeleteError } = await supabase
        .from("pengaduan")
        .delete()
        .eq("id_pengaduan", id_pengaduan);

      if (pengaduanDeleteError) throw pengaduanDeleteError;

      await loadReports();
      setDeleteTargetId(null);
      setSuccessMessage("Laporan berhasil dihapus.");
    } catch (err) {
      console.error("handleDelete error:", err);
      openReminderModal({
        title: "Laporan gagal dihapus",
        subtitle: "Terjadi kendala saat menghapus data",
        description: err.message || "Gagal menghapus laporan.",
      });
    } finally {
      setDeleting(false);
    }
  };
  const handlePrint = () => {
    if (!selectedReport) return;

    const printWindow = window.open("", "_blank", "width=1000,height=900");
    if (!printWindow) {
      openReminderModal({
        title: "Popup browser diblokir",
        subtitle: "Preview print tidak bisa dibuka",
        description: "Popup diblokir browser. Izinkan popup untuk print.",
      });
      return;
    }

    const safeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const showValue = (value, fallback = "-") => {
      const text = firstFilled(value, fallback);
      return safeHtml(text || fallback);
    };

    const showParagraph = (value, fallback = "-") =>
      showValue(value, fallback).replace(/\n/g, "<br />");

    const formatFileSize = (bytes) => {
      const size = Number(bytes || 0);
      if (!Number.isFinite(size) || size <= 0) return "";
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const statusLabel = getStatusLabel(selectedReport.status);
    const priorityLabel = getPriorityLabel(selectedReport.prioritas);
    const statusBadgeClass =
      selectedReport.status === "selesai" ? "badge-green" : "badge-blue";
    const priorityBadgeClass =
      selectedReport.prioritas === "tinggi" ? "badge-red" : "badge-blue";
    const catatanParalegal = firstFilled(
      selectedReport.catatan_internal,
      selectedReport.catatan_paralegal,
      selectedReport.updates?.[0]?.desc,
    );

    const lampiranHtml = (selectedReport.lampiran || []).length
      ? (selectedReport.lampiran || [])
          .map((file, index) => {
            const sizeText = formatFileSize(file.size_bytes);
            return `
              <div class="print-attachment-item">
                <div>
                  <div class="print-attachment-name">${index + 1}. ${showValue(file.nama_file, "Lampiran")}</div>
                  <div class="print-attachment-meta">
                    ${[showValue(file.mime_type, ""), safeHtml(sizeText)].filter(Boolean).join(" • ") || "File lampiran"}
                  </div>
                </div>
              </div>
            `;
          })
          .join("")
      : `<div class="print-empty">Tidak ada lampiran.</div>`;

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Print Laporan Pelayanan</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #374151;
              margin: 0;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-page {
              width: 100%;
              background: #ffffff;
            }

            .print-shell {
              width: 100%;
              max-width: 780px;
              margin: 0 auto;
              padding: 22px 26px 28px;
              background: #ffffff;
            }

            .print-topline {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              padding-bottom: 12px;
              border-bottom: 1px solid #e5e7eb;
              margin-bottom: 18px;
              font-size: 10px;
              color: #4b5563;
            }

            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 18px;
              margin-bottom: 20px;
            }

            .print-title {
              font-size: 22px;
              line-height: 1.2;
              font-weight: 800;
              color: #111827;
              margin-bottom: 5px;
            }

            .print-sub {
              font-size: 13px;
              font-weight: 700;
              color: #4b5563;
            }

            .print-badges {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              justify-content: flex-end;
            }

            .print-badge {
              display: inline-flex;
              align-items: center;
              padding: 7px 12px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 800;
              white-space: nowrap;
            }

            .badge-blue {
              background: #d1e1fd;
              color: #0f3f93;
            }

            .badge-red {
              background: #fee2e2;
              color: #dc2626;
            }

            .badge-green {
              background: #dcfce7;
              color: #15803d;
            }

            .print-section {
              margin-top: 18px;
              page-break-inside: avoid;
            }

            .print-section-title {
              font-size: 15px;
              font-weight: 800;
              color: #111827;
              padding-bottom: 8px;
              border-bottom: 2px solid #1454c4;
              margin-bottom: 12px;
            }

            .print-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 16px;
            }

            .print-info {
              margin-bottom: 12px;
            }

            .print-label {
              font-size: 11px;
              color: #64748b;
              margin-bottom: 5px;
              font-weight: 700;
            }

            .print-value {
              font-size: 13px;
              line-height: 1.55;
              font-weight: 800;
              color: #111827;
            }

            .print-text {
              font-size: 12.5px;
              line-height: 1.75;
              color: #374151;
            }

            .print-box {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 12px 13px;
              background: #ffffff;
            }

            .print-soft-box {
              border: 1px solid #dbeafe;
              border-radius: 12px;
              padding: 12px 13px;
              background: #ffffff;
            }

            .print-category {
              display: inline-block;
              padding: 5px 9px;
              border-radius: 8px;
              background: #d1e1fd;
              color: #0f3f93;
              font-size: 11px;
              font-weight: 800;
            }

            .print-note {
              border-left: 4px solid #ea580c;
              background: rgba(234, 88, 12, 0.08);
              border-radius: 12px;
              padding: 11px 13px;
              margin-top: 12px;
              page-break-inside: avoid;
            }

            .print-note-title {
              color: #c2410c;
              font-weight: 800;
              font-size: 12px;
              margin-bottom: 5px;
            }

            .print-note-text {
              color: #9a3412;
              font-size: 12px;
              line-height: 1.65;
            }

            .print-summary {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
              margin-top: 12px;
            }

            .print-summary .print-box {
              border-color: #d1e1fd;
            }

            .print-attachment-item {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 10px 12px;
              margin-bottom: 8px;
              page-break-inside: avoid;
            }

            .print-attachment-name {
              font-size: 12.5px;
              font-weight: 800;
              color: #111827;
            }

            .print-attachment-meta {
              margin-top: 4px;
              font-size: 11px;
              color: #64748b;
            }

            .print-empty {
              border: 1px dashed #d1d5db;
              border-radius: 10px;
              padding: 11px 12px;
              color: #64748b;
              font-size: 12px;
              background: #f9fafb;
            }

            .print-timeline {
              position: relative;
              padding-left: 0;
            }

            .print-timeline-item {
              display: grid;
              grid-template-columns: 30px 1fr;
              gap: 10px;
              margin-bottom: 12px;
              page-break-inside: avoid;
            }

            .print-timeline-dot {
              width: 24px;
              height: 24px;
              border-radius: 999px;
              background: #d1e1fd;
              color: #0f3f93;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              margin-top: 12px;
            }

            .print-timeline-content {
              border: 1px solid #d1d5db;
              border-radius: 14px;
              padding: 12px 14px;
              background: #ffffff;
            }

            .print-timeline-title-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 7px;
            }

            .print-timeline-title {
              font-size: 14px;
              font-weight: 800;
              color: #111827;
            }

            .print-timeline-date {
              font-size: 12px;
              font-weight: 800;
              color: #4b5563;
              white-space: nowrap;
            }

            .print-timeline-desc {
              font-size: 12.5px;
              line-height: 1.65;
              margin-bottom: 9px;
              color: #374151;
            }

            .print-timeline-meta {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              font-size: 11.5px;
              color: #4b5563;
              font-weight: 700;
            }

            .print-timeline-doc {
              margin-top: 8px;
              font-size: 11px;
              color: #4b5563;
              word-break: break-word;
            }

            .print-footer {
              margin-top: 22px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              gap: 12px;
              font-size: 10px;
              color: #64748b;
            }

            @media print {
              body {
                background: #ffffff;
              }

              .print-shell {
                max-width: none;
                padding: 0;
              }

              .print-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <div class="print-shell">
              <div class="print-topline">
                <div>${safeHtml(new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }))}</div>
                <div>Laporan Pelayanan Posbankum</div>
              </div>

              <div class="print-header">
                <div>
                  <div class="print-title">Detail Laporan Pelayanan</div>
                  <div class="print-sub">${showValue(selectedReport.nomor_pengaduan)}</div>
                </div>
                <div class="print-badges">
                  <span class="print-badge ${statusBadgeClass}">Status: ${safeHtml(statusLabel)}</span>
                  <span class="print-badge ${priorityBadgeClass}">Prioritas: ${safeHtml(priorityLabel)}</span>
                </div>
              </div>

              <div class="print-section">
                <div class="print-section-title">Informasi Laporan</div>
                <div class="print-info">
                  <div class="print-label">Judul Laporan</div>
                  <div class="print-value">${showValue(selectedReport.judul_pengaduan)}</div>
                </div>
                <div class="print-info">
                  <div class="print-label">Jenis Masalah</div>
                  <div><span class="print-category">${showValue(selectedReport.jenis_masalah)}</span></div>
                </div>
                <div class="print-info">
                  <div class="print-label">Kronologi</div>
                  <div class="print-soft-box print-text">${showParagraph(selectedReport.kronologi)}</div>
                </div>
                <div class="print-grid">
                  <div class="print-info">
                    <div class="print-label">Tanggal Kejadian</div>
                    <div class="print-value">${safeHtml(formatDateID(selectedReport.tanggal_kejadian))}</div>
                  </div>
                  <div class="print-info">
                    <div class="print-label">Waktu Kejadian</div>
                    <div class="print-value">${showValue(selectedReport.waktu_kejadian)}</div>
                  </div>
                </div>
                <div class="print-info">
                  <div class="print-label">Lokasi Kejadian</div>
                  <div class="print-value">${showValue(selectedReport.lokasi_kejadian)}</div>
                </div>
                ${
                  catatanParalegal
                    ? `<div class="print-note">
                        <div class="print-note-title">Catatan Paralegal</div>
                        <div class="print-note-text">${showParagraph(catatanParalegal)}</div>
                      </div>`
                    : ""
                }
              </div>

              <div class="print-section">
                <div class="print-section-title">Data Pelapor</div>
                <div class="print-grid">
                  <div class="print-info">
                    <div class="print-label">Nama Pelapor</div>
                    <div class="print-value">${showValue(selectedReport.nama_pelapor)}</div>
                  </div>
                  <div class="print-info">
                    <div class="print-label">NIK</div>
                    <div class="print-value">${showValue(selectedReport.nik)}</div>
                  </div>
                  <div class="print-info">
                    <div class="print-label">Nomor Telepon</div>
                    <div class="print-value">${showValue(selectedReport.nomor_telepon)}</div>
                  </div>
                  <div class="print-info">
                    <div class="print-label">Email</div>
                    <div class="print-value">${showValue(selectedReport.email)}</div>
                  </div>
                  <div class="print-info">
                    <div class="print-label">Posbankum/Kecamatan</div>
                    <div class="print-value">${showValue(selectedReport.posbankum_info)}</div>
                  </div>
                  <div class="print-info">
                    <div class="print-label">Lurah/Kades</div>
                    <div class="print-value">${showValue(selectedReport.nama_lurah)}</div>
                  </div>
                </div>
              </div>

              <div class="print-section">
                <div class="print-section-title">Paralegal yang Mengurus</div>
                <div class="print-grid">
                  <div class="print-box">
                    <div class="print-label">Nama Paralegal</div>
                    <div class="print-value">${showValue(selectedReport.paralegal_nama)}</div>
                  </div>
                  <div class="print-box">
                    <div class="print-label">Nomor HP Paralegal</div>
                    <div class="print-value">${showValue(selectedReport.paralegal_hp)}</div>
                  </div>
                </div>
              </div>

              <div class="print-section">
                <div class="print-section-title">Ringkasan Waktu</div>
                <div class="print-summary">
                  <div class="print-box">
                    <div class="print-label">Tanggal Dibuat</div>
                    <div class="print-value">${safeHtml(formatDateID(selectedReport.created_at || selectedReport.tanggal_kejadian))}</div>
                  </div>
                  <div class="print-box">
                    <div class="print-label">Tanggal Kejadian</div>
                    <div class="print-value">${safeHtml(formatDateID(selectedReport.tanggal_kejadian))}</div>
                  </div>
                  <div class="print-box">
                    <div class="print-label">Total Durasi</div>
                    <div class="print-value">${safeHtml(String(getDaysDiff(selectedReport.tanggal_kejadian)))} hari</div>
                  </div>
                </div>
              </div>

              <div class="print-section">
                <div class="print-section-title">Lampiran (${safeHtml(String(selectedReport.lampiran?.length || 0))})</div>
                ${lampiranHtml}
              </div>

              <div class="print-footer">
                <div>Dicetak dari Sistem Aplikasi Posbankum</div>
                <div>${showValue(selectedReport.nomor_pengaduan)}</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleParalegalChange = (value) => {
    const selected = paralegalOptions.find((x) => x.id === value);

    setFormData((prev) => ({
      ...prev,
      id_paralegal: selected?.id || "",
      paralegal_nama: selected?.nama || "",
      paralegal_hp: selected?.hp || "",
    }));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (!selectedFiles.length) {
      setFormData((prev) => ({
        ...prev,
        lampiran: [],
      }));
      return;
    }

    const invalidTypeFile = selectedFiles.find(
      (file) => !isAllowedFileType(file),
    );
    if (invalidTypeFile) {
      openReminderModal({
        title: "Format file tidak didukung",
        subtitle: "Periksa lampiran yang dipilih",
        description: `File ${invalidTypeFile.name} tidak didukung. Hanya PNG, JPG, JPEG, dan PDF yang diperbolehkan.`,
      });
      e.target.value = "";
      return;
    }

    const oversizeFile = selectedFiles.find(
      (file) => (file.size || 0) > MAX_FILE_SIZE_BYTES,
    );
    if (oversizeFile) {
      openReminderModal({
        title: "Ukuran file terlalu besar",
        subtitle: "Lampiran melebihi batas maksimum",
        description: `Ukuran file ${oversizeFile.name} melebihi batas 5MB.`,
      });
      e.target.value = "";
      return;
    }

    const files = selectedFiles.map((file) => ({
      file,
      nama_file: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size || 0,
    }));

    setFormData((prev) => ({
      ...prev,
      lampiran: files,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sanitizedFormData = getSanitizedFormData(formData);
    const validationError = validateFormData(
      sanitizedFormData,
      paralegalOptions,
    );

    if (validationError) {
      openReminderModal({
        title: "Data laporan belum lengkap",
        subtitle: "Periksa kembali formulir laporan",
        description: validationError,
      });
      return;
    }

    if (!profile?.id_posbankum || !profile?.id) {
      openReminderModal({
        title: "Profil belum lengkap",
        subtitle: "Data akun posbankum belum siap digunakan",
        description: "Profile posbankum belum lengkap.",
      });
      return;
    }

    setSaving(true);

    try {
      let namaPosbankumPembuat = firstFilled(
        currentPosbankum?.nama,
        sanitizedFormData.kelurahan,
      );

      if (!namaPosbankumPembuat) {
        const { data: posbankumPembuat, error: posbankumPembuatError } =
          await supabase
            .from("posbankum")
            .select("nama")
            .eq("id_posbankum", profile.id_posbankum)
            .maybeSingle();

        if (posbankumPembuatError) throw posbankumPembuatError;
        namaPosbankumPembuat = firstFilled(posbankumPembuat?.nama);
      }

      if (namaPosbankumPembuat) {
        const { error: kelurahanUpdateError } = await supabase
          .from("posbankum")
          .update({ kelurahan: namaPosbankumPembuat })
          .eq("id_posbankum", profile.id_posbankum);

        if (kelurahanUpdateError) throw kelurahanUpdateError;
      }

      const laporanFormData = {
        ...sanitizedFormData,
        kelurahan: namaPosbankumPembuat,
      };

      const payload = {
        id_posbankum: profile.id_posbankum,
        nama_pelapor: sanitizedFormData.nama_pelapor,
        nomor_telepon: sanitizedFormData.nomor_telepon,
        email: sanitizedFormData.email || null,
        jenis_masalah: sanitizedFormData.jenis_masalah,
        judul_pengaduan: sanitizedFormData.judul_pengaduan,
        kronologi: sanitizedFormData.kronologi,
        tanggal_kejadian: sanitizedFormData.tanggal_kejadian,
        waktu_kejadian: sanitizedFormData.waktu_kejadian,
        lokasi_kejadian: sanitizedFormData.lokasi_kejadian,
        provinsi: "Riau",
        kabupaten_kota: "Kota Pekanbaru",
        kecamatan: "Sukajadi",
        id_kabupaten: null,
        id_kecamatan: null,
        status: "diproses",
        id_paralegal: sanitizedFormData.id_paralegal,
        catatan_admin: buildCatatanAdmin(laporanFormData, profile),
        created_by: profile.id,
      };

      const insertedRow = await insertPengaduanWithRetry(payload);

      const id_pengaduan = insertedRow.id_pengaduan;

      const { error: timelineInsertError } = await supabase
        .from("pengaduan_timeline")
        .insert({
          id_pengaduan,
          title: "Laporan Diterima",
          deskripsi:
            "Laporan berhasil dibuat dan masuk ke antrian pemeriksaan awal.",
          tanggal: new Date().toISOString(),
          created_by: profile.id,
        });

      if (timelineInsertError) throw timelineInsertError;

      const kasusPayload = {
        id_posbankum: profile.id_posbankum,
        jenis_kasus: laporanFormData.jenis_masalah,
        judul_kasus: laporanFormData.judul_pengaduan,
        deskripsi_kasus: laporanFormData.kronologi,
        tgl_upload: insertedRow.created_at || new Date().toISOString(),
        tgl_mulai: laporanFormData.tanggal_kejadian || null,
        tgl_selesai: null,
        source_system: "website",
        website_pengaduan_id: id_pengaduan,
        last_synced_at: new Date().toISOString(),
        status: "diproses",
        prioritas: laporanFormData.prioritas || "sedang",
      };

      let insertedKasus = null;

      const { data: existingKasus, error: existingKasusError } = await supabase
        .from("kasus")
        .select("id_kasus, global_case_id")
        .eq("website_pengaduan_id", id_pengaduan)
        .maybeSingle();

      if (existingKasusError) throw existingKasusError;

      if (existingKasus) {
        insertedKasus = existingKasus;
      } else {
        const { data: newKasus, error: kasusInsertError } = await supabase
          .from("kasus")
          .insert(kasusPayload)
          .select("id_kasus, global_case_id")
          .single();

        if (kasusInsertError) throw kasusInsertError;
        insertedKasus = newKasus;
      }

      const { error: linkKasusError } = await supabase
        .from("lihat_kasus")
        .upsert(
          {
            id_posbankum: profile.id_posbankum,
            id_kasus: insertedKasus.id_kasus,
          },
          { onConflict: "id_posbankum,id_kasus" },
        );

      if (linkKasusError) {
        console.warn(
          "Relasi lihat_kasus tidak dapat disimpan, tetapi laporan utama tetap berhasil disimpan:",
          linkKasusError,
        );
      }

      if (sanitizedFormData.lampiran.length) {
        const lampiranInsertRows = [];

        for (const item of sanitizedFormData.lampiran) {
          const safeName = sanitizeFileName(item.nama_file);
          const path = `${id_pengaduan}/${Date.now()}-${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, item.file);

          if (uploadError) throw uploadError;

          lampiranInsertRows.push({
            id_pengaduan,
            nama_file: item.nama_file,
            path_file: path,
            mime_type: item.mime_type,
            size_bytes: item.size_bytes,
          });
        }

        if (lampiranInsertRows.length) {
          const { error: lampiranInsertError } = await supabase
            .from("pengaduan_lampiran")
            .insert(lampiranInsertRows);

          if (lampiranInsertError) throw lampiranInsertError;
        }
      }

      try {
        await syncWebsiteReportToMobile({
          kasusRow: insertedKasus,
          pengaduanRow: { ...insertedRow, id_pengaduan },
          formData: laporanFormData,
          profile,
        });
      } catch (syncError) {
        console.error("Gagal sinkron laporan pelayanan ke mobile:", syncError);

        if (!isIgnorableMobileSyncError(syncError)) {
          openReminderModal({
            title: "Sinkronisasi mobile tertunda",
            subtitle: "Data website tetap berhasil disimpan",
            description:
              "Laporan website sudah berhasil disimpan, tetapi sinkronisasi ke mobile sedang bermasalah.",
          });
        }
      }

      setFormData(EMPTY_FORM_DATA);
      await loadReports();
      setTab("aktif");
      setSuccessMessage("Laporan berhasil disimpan.");
    } catch (err) {
      console.error("handleSubmit error:", err);
      openReminderModal({
        title: isDuplicateNomorPengaduanError(err)
          ? "Nomor laporan bentrok"
          : "Laporan gagal disimpan",
        subtitle: isDuplicateNomorPengaduanError(err)
          ? "Sistem mendeteksi nomor laporan yang sudah dipakai"
          : "Terjadi kendala saat menyimpan data",
        description: isDuplicateNomorPengaduanError(err)
          ? "Nomor laporan bertabrakan dengan data yang sudah ada. Sistem sudah mencoba membuat nomor baru secara otomatis. Silakan klik Kirim Laporan sekali lagi."
          : err.message || "Gagal menyimpan laporan.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lpRoot">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />

      <ReminderModal
        open={reminderModal.open}
        title={reminderModal.title}
        subtitle={reminderModal.subtitle}
        description={reminderModal.description}
        buttonLabel={reminderModal.buttonLabel}
        onClose={closeReminderModal}
      />

      <div className="lpHeaderTitleWrap">
        <h2 className="lpPageTitle">Laporan Pelayanan</h2>
        <div className="lpPageUnderline" />
      </div>

      {errorMessage ? (
        <div style={{ marginBottom: 16, color: "red" }}>{errorMessage}</div>
      ) : null}

      <div className="lpStatsGrid">
        <div className="lpStatCard is-total">
          <div className="lpStatIcon">
            <FiFileText />
          </div>
          <div className="lpStatBody">
            <div className="lpStatLabel">Total Laporan</div>
            <div className="lpStatValue">{stats.total}</div>
          </div>
        </div>

        <div className="lpStatCard is-process">
          <div className="lpStatIcon">
            <FiClock />
          </div>
          <div className="lpStatBody">
            <div className="lpStatLabel">Sedang Proses</div>
            <div className="lpStatValue">{stats.aktif}</div>
          </div>
        </div>

        <div className="lpStatCard is-done">
          <div className="lpStatIcon">
            <FiCheckCircle />
          </div>
          <div className="lpStatBody">
            <div className="lpStatLabel">Selesai</div>
            <div className="lpStatValue">{stats.selesai}</div>
          </div>
        </div>

        <div className="lpStatCard is-high">
          <div className="lpStatIcon">
            <FiAlertTriangle />
          </div>
          <div className="lpStatBody">
            <div className="lpStatLabel">Prioritas Tinggi</div>
            <div className="lpStatValue">{stats.tinggi}</div>
          </div>
        </div>

        <div className="lpStatCard is-rate">
          <div className="lpStatIcon">
            <FiTrendingUp />
          </div>
          <div className="lpStatBody">
            <div className="lpStatLabel">Tingkat Selesai</div>
            <div className="lpStatValue">{stats.tingkatSelesai}%</div>
          </div>
        </div>

        <div className="lpStatCard is-average">
          <div className="lpStatIcon">
            <FiCalendar />
          </div>
          <div className="lpStatBody">
            <div className="lpStatLabel">Rata-rata</div>
            <div className="lpStatValue">{stats.avgHari} hari</div>
          </div>
        </div>
      </div>

      <div className="lpTabBar">
        <button
          type="button"
          className={`lpTabBtn ${tab === "buat" ? "is-active" : ""}`}
          onClick={() => setTab("buat")}
        >
          <FiPlus /> Buat Laporan
        </button>

        <button
          type="button"
          className={`lpTabBtn ${tab === "aktif" ? "is-active" : ""}`}
          onClick={() => setTab("aktif")}
        >
          <FiClock /> Laporan Aktif ({activeReports.length})
        </button>

        <button
          type="button"
          className={`lpTabBtn ${tab === "riwayat" ? "is-active" : ""}`}
          onClick={() => setTab("riwayat")}
        >
          <FiRotateCcw /> Riwayat Selesai ({completedReports.length})
        </button>

        <button
          type="button"
          className={`lpTabBtn ${tab === "statistik" ? "is-active" : ""}`}
          onClick={() => setTab("statistik")}
        >
          <AiOutlineBarChart />
          Statistik
        </button>
      </div>

      {tab === "buat" ? (
        <form className="lpFormCard" onSubmit={handleSubmit}>
          <input
            type="hidden"
            name="kelurahan"
            value={currentPosbankum?.nama || formData.kelurahan || ""}
            readOnly
          />

          <div className="lpInfoBox">
            <FiInfo />
            <div>
              <div className="lpInfoTitle">Petunjuk Pengisian</div>
              <div className="lpInfoText">
                Lengkapi formulir laporan dengan data yang akurat untuk wilayah
                Pekanbaru, Sukajadi. Field bertanda (*) wajib diisi.
              </div>
            </div>
          </div>

          <section className="lpSection">
            <div className="lpSectionTitle">
              <FiUser /> Data Pelapor
            </div>

            <div className="lpFormGrid two">
              <div className="lpField">
                <label>{renderRequiredLabel("Nama Lengkap")}</label>
                <input
                  value={formData.nama_pelapor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nama_pelapor: e.target.value,
                    }))
                  }
                  maxLength={120}
                  placeholder="Masukkan nama lengkap sesuai KTP"
                />
              </div>

              <div className="lpField">
                <label>
                  {renderRequiredLabel("NIK (Nomor Induk Kependudukan)")}
                </label>
                <input
                  value={formData.nik}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nik: digitsOnly(e.target.value, MAX_NIK_LENGTH),
                    }))
                  }
                  inputMode="numeric"
                  maxLength={MAX_NIK_LENGTH}
                  placeholder="16 digit NIK"
                />
              </div>

              <div className="lpField">
                <label>{renderRequiredLabel("Nomor Telepon/HP")}</label>
                <input
                  value={formData.nomor_telepon}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nomor_telepon: digitsOnly(
                        e.target.value,
                        MAX_PHONE_LENGTH,
                      ),
                    }))
                  }
                  inputMode="numeric"
                  maxLength={MAX_PHONE_LENGTH}
                  placeholder="081234567890"
                />
              </div>

              <div className="lpField">
                <label>Email Pelapor (Opsional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="contoh@email.com"
                />
              </div>

              <div className="lpField">
                <label>{renderRequiredLabel("Nama Lurah/Kepala Desa")}</label>
                <input
                  value={formData.nama_lurah}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nama_lurah: e.target.value,
                    }))
                  }
                  maxLength={120}
                  placeholder="Nama Lurah/Kepala Desa"
                />
              </div>
            </div>
          </section>

          <section className="lpSection">
            <div className="lpSectionTitle">
              <FiFileText /> Detail Laporan
            </div>

            <div className="lpFormGrid two">
              <div className="lpField">
                <label>{renderRequiredLabel("Jenis Masalah")}</label>
                <select
                  value={formData.jenis_masalah}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      jenis_masalah: e.target.value,
                    }))
                  }
                >
                  <option value="">Pilih Jenis Masalah</option>
                  <option value="Pidana">Pidana</option>
                  <option value="Perdata">Perdata</option>
                  <option value="Ketenagakerjaan">Ketenagakerjaan</option>
                  <option value="Keluarga">Keluarga</option>
                  <option value="Pertanahan">Pertanahan</option>
                  <option value="Konsumen">Konsumen</option>
                </select>
              </div>

              <div className="lpField">
                <label>{renderRequiredLabel("Prioritas")}</label>
                <select
                  value={formData.prioritas}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      prioritas: e.target.value,
                    }))
                  }
                >
                  <option value="">Pilih Prioritas Laporan</option>
                  <option value="tinggi">Tinggi</option>
                  <option value="sedang">Sedang</option>
                  <option value="rendah">Rendah</option>
                </select>
              </div>
            </div>

            <div className="lpField">
              <label>{renderRequiredLabel("Judul Laporan")}</label>
              <input
                value={formData.judul_pengaduan}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    judul_pengaduan: e.target.value.slice(0, MAX_TITLE_LENGTH),
                  }))
                }
                maxLength={MAX_TITLE_LENGTH}
                placeholder="Ringkasan singkat masalah (max 100 karakter)"
              />
            </div>

            <div className="lpField">
              <label>{renderRequiredLabel("Kronologi Kejadian")}</label>
              <textarea
                rows={6}
                value={formData.kronologi}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    kronologi: e.target.value,
                  }))
                }
                maxLength={3000}
                placeholder="Jelaskan kronologi kejadian secara detail (kapan, dimana, bagaimana, siapa saja yang terlibat)..."
              />
            </div>
          </section>

          <section className="lpSection">
            <div className="lpSectionTitle">
              <FiMapPin /> Lokasi & Waktu Kejadian
            </div>

            <div className="lpFormGrid two">
              <div className="lpField">
                <label>{renderRequiredLabel("Tanggal Kejadian")}</label>
                <input
                  type="date"
                  value={formData.tanggal_kejadian}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tanggal_kejadian: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="lpField">
                <label>{renderRequiredLabel("Waktu Kejadian")}</label>
                <input
                  type="time"
                  value={formData.waktu_kejadian}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      waktu_kejadian: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="lpField">
              <label>{renderRequiredLabel("Lokasi Kejadian")}</label>
              <input
                value={formData.lokasi_kejadian}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lokasi_kejadian: e.target.value,
                  }))
                }
                maxLength={200}
                placeholder="Contoh: Jl. Raya Bangkinang KM 15, Kampung Tengah"
              />
            </div>
          </section>

          <section className="lpSection">
            <div className="lpSectionTitle">
              <FiUsers /> Data Paralegal yang Mengurus
            </div>

            <div className="lpFormGrid two">
              <div className="lpField">
                <label>{renderRequiredLabel("Nama Paralegal")}</label>
                <select
                  value={formData.id_paralegal}
                  onChange={(e) => handleParalegalChange(e.target.value)}
                  disabled={!paralegalOptions.length}
                >
                  <option value="">
                    {paralegalOptions.length
                      ? "Pilih Paralegal"
                      : "Belum ada paralegal di profil"}
                  </option>
                  {paralegalOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lpField">
                <label>Nomor HP Paralegal</label>
                <input
                  value={formData.paralegal_hp}
                  readOnly
                  inputMode="numeric"
                  placeholder="Otomatis terisi saat pilih paralegal"
                />
              </div>
            </div>
          </section>

          <section className="lpSection">
            <div className="lpSectionTitle">
              <FiPaperclip /> Lampiran Dokumen/Bukti
            </div>

            <label className="lpUploadBox">
              <input
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileChange}
              />
              <div className="lpUploadTextMain">
                Klik untuk upload dokumen/foto
              </div>
              <div className="lpUploadTextSub">
                PNG, JPG, PDF (max 5MB per file)
              </div>
            </label>

            {formData.lampiran.length ? (
              <div className="lpUploadList">
                {formData.lampiran.map((f, idx) => (
                  <div className="lpUploadItem" key={`${f.nama_file}-${idx}`}>
                    {f.nama_file}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="lpSection">
            <div className="lpSectionTitle">Catatan Internal Paralegal</div>
            <div className="lpField">
              <textarea
                rows={4}
                value={formData.catatan_internal}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    catatan_internal: e.target.value,
                  }))
                }
                placeholder="Catatan khusus atau tindak lanjut yang diperlukan (opsional)"
              />
            </div>
          </section>

          <div className="lpFormActions">
            <button
              type="button"
              className="lpBtn lpBtnGhost"
              onClick={() => setFormData(EMPTY_FORM_DATA)}
            >
              Reset Form
            </button>

            <button
              type="submit"
              className="lpBtn lpBtnPrimary"
              disabled={saving}
            >
              <FiSend /> {saving ? "Menyimpan..." : "Kirim Laporan"}
            </button>
          </div>
        </form>
      ) : null}

      {(tab === "aktif" || tab === "riwayat") && (
        <>
          <div className="lpToolbar">
            <div className="lpSearchWrap">
              <FiSearch />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari laporan (nama, NIK, nomor laporan)..."
              />
            </div>

            <div className="lpFilterWrap">
              <FiFilter />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="semua">Semua Prioritas</option>
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>
              <FiChevronDown className="lpFilterChevron" />
            </div>
          </div>

          <div className="lpListWrap">
            {loading ? (
              <div className="lpEmptyCard is-loading">
                Memuat data laporan...
              </div>
            ) : filteredReports.length ? (
              filteredReports.map((report) => (
                <div className="lpReportCard" key={report.id_pengaduan}>
                  <div className="lpReportTop">
                    <div className="lpReportTitleWrap">
                      <div className="lpReportTitleRow">
                        <h3 className="lpReportTitle">
                          {report.judul_pengaduan}
                        </h3>

                        <div className="lpBadgeRow">
                          <span className="lpBadge badgeBlue">
                            <FiClock />
                            {getStatusLabel(report.status)}
                          </span>
                          <span
                            className={`lpBadge ${
                              report.prioritas === "tinggi"
                                ? "badgeRed"
                                : report.prioritas === "sedang"
                                  ? "badgeOrange"
                                  : "badgeBlue"
                            }`}
                          >
                            <FiAlertTriangle />
                            {getPriorityLabel(report.prioritas)}
                          </span>
                        </div>
                      </div>

                      <div className="lpReportNo">{report.nomor_pengaduan}</div>

                      <div className="lpReportMeta">
                        <span>
                          <FiUser /> {report.nama_pelapor}
                        </span>
                        <span>NIK: {report.nik}</span>
                        <span>
                          <FiMapPin /> {report.lokasi_kejadian}
                        </span>
                        <span>
                          <FiCalendar /> {formatDateID(report.tanggal_kejadian)}
                        </span>
                        <span>
                          <FiClock /> {getDaysDiff(report.tanggal_kejadian)}{" "}
                          hari
                        </span>
                      </div>

                      <div className="lpNameBadge">
                        <FiUsers /> {report.paralegal_nama}
                      </div>

                      <div className="lpCategoryRow">
                        <span className="lpCategoryBadge">
                          {report.jenis_masalah}
                        </span>
                      </div>

                      <p className="lpReportDesc">{report.kronologi}</p>
                    </div>
                  </div>

                  <div className="lpUpdateBox">
                    <div className="lpUpdateTitle">
                      <FiRotateCcw /> Update Terakhir
                    </div>
                    <div className="lpUpdateItem">
                      <div className="lpUpdateDot" />
                      <div className="lpUpdateContent">
                        <div className="lpUpdateHead">
                          <strong>
                            {report.updates?.[report.updates.length - 1]
                              ?.title || "-"}
                          </strong>
                          <span>
                            {report.updates?.[report.updates.length - 1]
                              ?.date || "-"}{" "}
                            •{" "}
                            {report.updates?.[report.updates.length - 1]
                              ?.time || "-"}
                          </span>
                        </div>
                        <div className="lpUpdateDesc">
                          {report.updates?.[report.updates.length - 1]?.desc ||
                            "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lpReportFooter">
                    <div className="lpReportFootText">
                      {report.updates?.length || 0} Update •{" "}
                      {report.lampiran?.length || 0} Lampiran
                    </div>

                    <div className="lpActionRow">
                      {tab === "aktif" && !report.is_mobile_only ? (
                        <button
                          type="button"
                          className="lpBtn lpBtnDelete"
                          onClick={() => handleDelete(report.id_pengaduan)}
                        >
                          <FiTrash2 /> Hapus
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="lpBtn lpBtnDetail"
                        onClick={() => handleOpenDetail(report)}
                      >
                        <FiEye /> Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="lpEmptyCard">
                <div className="lpEmptyIcon">
                  <FiFileText />
                </div>
                <h2>Tidak Ada Laporan Ditemukan</h2>
                <p>
                  Tidak ada laporan pelayanan yang sesuai dengan filter yang
                  dipilih.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "statistik" ? (
        <div className="lpStatsPage">
          <div className="lpStatsBoardGrid">
            <div className="lpPanelCard">
              <div className="lpPanelTitle">
                <FiBarChart2 /> Berdasarkan Jenis Masalah
              </div>

              <div className="lpBarList">
                {jenisStats.map((item) => (
                  <div className="lpBarItem" key={item.jenis}>
                    <div className="lpBarHead">
                      <span>{item.jenis}</span>
                      <strong>
                        {item.count} ({item.percentage}%)
                      </strong>
                    </div>
                    <div className="lpBarTrack">
                      <div
                        className="lpBarFill is-jenis"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lpPanelCard">
              <div className="lpPanelTitle">
                <FiAlertTriangle /> Berdasarkan Prioritas
              </div>

              <div className="lpBarList">
                {priorityStats.map((item) => (
                  <div className="lpBarItem" key={item.priority}>
                    <div className="lpBarHead">
                      <span>{toTitleCase(item.priority)}</span>
                      <strong>
                        {item.count} ({item.percentage}%)
                      </strong>
                    </div>
                    <div className="lpBarTrack">
                      <div
                        className={`lpBarFill ${
                          item.priority === "tinggi"
                            ? "is-priority-high"
                            : item.priority === "sedang"
                              ? "is-priority-mid"
                              : "is-priority-low"
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lpPanelCard">
            <div className="lpPanelTitle">
              <FiTrendingUp /> Ringkasan Performa
            </div>

            <div className="lpMiniStats">
              <div className="lpMiniStat blue">
                <div className="lpMiniLabel">Total Laporan Februari</div>
                <div className="lpMiniValue">{stats.total}</div>
              </div>

              <div className="lpMiniStat green">
                <div className="lpMiniLabel">Tingkat Penyelesaian</div>
                <div className="lpMiniValue">{stats.tingkatSelesai}%</div>
              </div>

              <div className="lpMiniStat slate">
                <div className="lpMiniLabel">Rata-rata Durasi</div>
                <div className="lpMiniValue">{stats.avgHari} hari</div>
              </div>

              <div className="lpMiniStat orange">
                <div className="lpMiniLabel">Laporan Aktif</div>
                <div className="lpMiniValue">{stats.aktif}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDetail && selectedReport ? (
        <div className="lpModalOverlay" onClick={handleCloseDetail}>
          <div className="lpModal" onClick={(e) => e.stopPropagation()}>
            <div className="lpModalHeader">
              <div>
                <div className="lpModalTitle">Detail Laporan Pelayanan</div>
                <div className="lpModalSub">
                  {selectedReport.nomor_pengaduan}
                </div>
              </div>

              <button
                type="button"
                className="lpModalClose"
                onClick={handleCloseDetail}
              >
                <FiX />
              </button>
            </div>

            <div className="lpModalBody">
              <div className="lpModalStatusRow">
                <span className="lpBadge badgeBlue">
                  <FiClock /> Status: {getStatusLabel(selectedReport.status)}
                </span>
                <span
                  className={`lpBadge ${
                    selectedReport.prioritas === "tinggi"
                      ? "badgeRed"
                      : selectedReport.prioritas === "sedang"
                        ? "badgeOrange"
                        : "badgeBlue"
                  }`}
                >
                  <FiAlertTriangle />{" "}
                  {getPriorityLabel(selectedReport.prioritas)}
                </span>
              </div>

              <div className="lpModalGrid">
                <div className="lpModalLeft">
                  <section className="lpSection compact">
                    <div className="lpSectionTitle">Data Pelapor</div>
                    <div className="lpDetailInfoCard">
                      <div className="lpDetailLine">
                        <FiUser /> {selectedReport.nama_pelapor}
                      </div>
                      <div className="lpDetailLine">
                        <FiCreditCard /> NIK: {selectedReport.nik}
                      </div>
                      <div className="lpDetailLine">
                        <FiPhone /> {selectedReport.nomor_telepon}
                      </div>
                      <div className="lpDetailLine">
                        <FiMail /> {selectedReport.email || "-"}
                      </div>
                      <div className="lpDetailLine">
                        <span
                          aria-hidden="true"
                          style={{
                            width: 18,
                            height: 18,
                            flex: "0 0 18px",
                            display: "inline-block",
                            backgroundColor: "currentColor",
                            WebkitMaskImage: `url(${posbankumIcon})`,
                            maskImage: `url(${posbankumIcon})`,
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskSize: "contain",
                          }}
                        />
                        {selectedReport.posbankum_info || "-"}
                      </div>
                      <div className="lpDetailLine">
                        <FaRegUserCircle /> Lurah/Kades:{" "}
                        {selectedReport.nama_lurah || "-"}
                      </div>
                      <div className="lpDetailLine">
                        <FiMapPin /> Lokasi Kejadian:{" "}
                        {selectedReport.lokasi_kejadian || "-"}
                      </div>
                    </div>
                  </section>

                  <section className="lpSection compact">
                    <div className="lpSectionTitle">
                      Paralegal yang Mengurus
                    </div>
                    <div className="lpParalegalCard">
                      <div className="lpParalegalName">
                        <FiUsers /> {selectedReport.paralegal_nama}
                      </div>
                      <div className="lpParalegalPhone">
                        <FiPhone /> {selectedReport.paralegal_hp}
                      </div>
                    </div>
                  </section>

                  <section className="lpSection compact">
                    <div className="lpSectionTitle">Informasi Laporan</div>
                    <div className="lpDetailBlock">
                      <div className="lpDetailLabel">Judul Laporan</div>
                      <div className="lpDetailValue">
                        {selectedReport.judul_pengaduan}
                      </div>
                    </div>

                    <div className="lpDetailBlock">
                      <div className="lpDetailLabel">Jenis Masalah</div>
                      <div>
                        <span className="lpCategoryBadge">
                          {selectedReport.jenis_masalah}
                        </span>
                      </div>
                    </div>

                    <div className="lpDetailBlock">
                      <div className="lpDetailLabel">Kronologi</div>
                      <div className="lpDetailTextBox">
                        {selectedReport.kronologi}
                      </div>
                    </div>

                    <div className="lpDetailMetaBox">
                      <div>
                        <div className="lpDetailLabel">Tanggal Dibuat</div>
                        <div className="lpDetailValue">
                          {formatDateID(selectedReport.tanggal_kejadian)}
                        </div>
                      </div>
                      <div>
                        <div className="lpDetailLabel">Total Durasi</div>
                        <div className="lpDetailValue">
                          {getDaysDiff(selectedReport.tanggal_kejadian)} hari
                        </div>
                      </div>
                    </div>

                    <div className="lpDetailBlock">
                      <div className="lpDetailLabel">
                        Lampiran ({selectedReport.lampiran?.length || 0})
                      </div>
                      <div className="lpAttachmentList">
                        {(selectedReport.lampiran || []).map((file, idx) => (
                          <div
                            className="lpAttachmentItem"
                            key={`${file.nama_file}-${idx}`}
                          >
                            <div className="lpAttachmentInfo">
                              <FiFileText /> {file.nama_file}
                            </div>

                            <button
                              type="button"
                              className="lpAttachmentEyeBtn"
                              onClick={() => handleOpenLampiran(file)}
                              title={
                                isImageFile(file)
                                  ? "Lihat foto"
                                  : "Buka lampiran"
                              }
                              disabled={previewLoading}
                            >
                              <FiEye />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>

                <div className="lpModalRight">
                  <section className="lpSection compact">
                    <div className="lpSectionTitle">Timeline Lengkap</div>

                    <div className="lpTimeline">
                      {(selectedReport.updates || []).map((item, idx) => (
                        <div
                          className="lpTimelineItem"
                          key={`${item.title}-${idx}`}
                        >
                          <div className="lpTimelineDot" />
                          <div className="lpTimelineCard">
                            <div className="lpTimelineHead">
                              <div className="lpTimelineTitle">
                                {item.title}
                              </div>
                              <div className="lpTimelineDate">{item.date}</div>
                            </div>

                            <div className="lpTimelineDesc">{item.desc}</div>

                            <div className="lpTimelineMeta">
                              <span>
                                <FiClock /> {item.time}
                              </span>
                              <span className="lpTimelineBy">{item.by}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="lpModalFooter">
              <button
                type="button"
                className="lpBtn lpBtnPrint"
                onClick={handlePrint}
              >
                <FiPrinter /> Print
              </button>

              <button
                type="button"
                className="lpBtn lpBtnPrimary"
                onClick={handleCloseDetail}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DeleteConfirmModal
        open={!!deleteTargetId}
        title="Hapus Laporan?"
        subtitle="Tindakan ini tidak dapat dibatalkan"
        description="Apakah Anda yakin ingin menghapus laporan ini? Semua data dan lampiran akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        loading={deleting}
        onCancel={() => !deleting && setDeleteTargetId(null)}
        onConfirm={confirmDelete}
      />

      {showPreview && previewFile ? (
        <div className="lpPreviewOverlay" onClick={handleClosePreview}>
          <div className="lpPreviewModal" onClick={(e) => e.stopPropagation()}>
            <div className="lpPreviewHeader">
              <div className="lpPreviewTitleWrap">
                <div className="lpPreviewTitle">Preview Lampiran Foto</div>
                <div className="lpPreviewSub">{previewFile.nama_file}</div>
              </div>

              <button
                type="button"
                className="lpPreviewHeaderClose"
                onClick={handleClosePreview}
                title="Tutup"
              >
                <FiX />
              </button>
            </div>

            <div className="lpPreviewBody">
              <img
                src={previewFile.signedUrl}
                alt={previewFile.nama_file}
                className="lpPreviewImage"
              />
            </div>

            <div className="lpPreviewFooter">
              <button
                type="button"
                className="lpBtn lpBtnPrimary lpPreviewCloseBtn"
                onClick={handleClosePreview}
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
