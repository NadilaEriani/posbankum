import { HiOutlineScale } from "react-icons/hi";
import { AiOutlineBarChart } from "react-icons/ai";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import {
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiMail,
  FiMapPin,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
} from "react-icons/fi";
import { BsSliders2, BsTelephone } from "react-icons/bs";
import posbankum from "../../assets/icon.png";
import "./semuaKasus.css";

const PAGE_SIZE = 9;

const MOBILE_SUPABASE_URL = import.meta.env.VITE_MOBILE_SUPABASE_URL;
const MOBILE_SUPABASE_ANON_KEY = import.meta.env.VITE_MOBILE_SUPABASE_ANON_KEY;

const mobileSupabase =
  MOBILE_SUPABASE_URL && MOBILE_SUPABASE_ANON_KEY
    ? createClient(MOBILE_SUPABASE_URL, MOBILE_SUPABASE_ANON_KEY)
    : null;

const CATEGORY_OPTIONS = [
  "Semua",
  "Hukum Pidana",
  "Hukum Perdata",
  "Hukum Keluarga",
  "Hukum Ketenagakerjaan",
  "Hukum Waris",
  "Pertanahan",
];

const STATUS_OPTIONS = ["Semua", "Diproses", "Mediasi", "Selesai"];
const PRIORITY_OPTIONS = ["Semua", "Rendah", "Sedang", "Tinggi"];
const SORT_OPTIONS = ["Terbaru", "Terlama", "Prioritas Tertinggi"];

function firstFilled(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (text && text.toLowerCase() !== "null" && text !== "-") {
      return text;
    }
  }

  return "-";
}

function isUsefulValue(value, blockedValues = []) {
  const text = String(value ?? "").trim();

  if (!text || text === "-" || text.toLowerCase() === "null") {
    return false;
  }

  const blocked = blockedValues.map((item) =>
    String(item || "")
      .trim()
      .toLowerCase(),
  );

  return !blocked.includes(text.toLowerCase());
}

function formatDateID(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDateID(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPriorityWeight(value) {
  if (value === "Tinggi") return 3;
  if (value === "Sedang") return 2;
  return 1;
}

function getStatusIcon(status) {
  if (status === "Selesai") return <FiCheckCircle />;
  if (status === "Mediasi") return <FiUsers />;
  return <FiClock />;
}

function normalizePhone(phone) {
  const cleaned = String(phone || "").replace(/\D/g, "");

  if (!cleaned) return "";
  if (cleaned.startsWith("62")) return cleaned;
  if (cleaned.startsWith("0")) return `62${cleaned.slice(1)}`;

  return cleaned;
}

function buildWhatsappLink(item) {
  const phone = normalizePhone(item.paralegalPhone);

  if (!phone) return "";

  const text = encodeURIComponent(
    `Halo ${item.paralegal}, saya ingin menanyakan status kasus ${item.id} - ${item.judul}.`,
  );

  return `https://wa.me/${phone}?text=${text}`;
}

function exportCsv(rows) {
  const headers = [
    "Nomor Kasus",
    "Judul",
    "Kategori",
    "Status",
    "Prioritas",
    "Posbankum",
    "Kota",
    "Pelapor",
    "Paralegal",
    "Tanggal Lapor",
  ];

  const escapeValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.judul,
        row.kategori,
        row.status,
        row.prioritas,
        row.posbankum,
        row.kota,
        row.pelapor,
        row.paralegal,
        formatShortDateID(row.tanggalLapor),
      ]
        .map(escapeValue)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "semua-kasus-posbankum-riau.csv";
  a.click();

  URL.revokeObjectURL(url);
}

function parseCatatanAdmin(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeKategori(value) {
  const text = String(value || "").trim();
  const raw = text.toLowerCase();

  if (raw === "pidana" || raw === "hukum pidana") return "Hukum Pidana";
  if (raw === "perdata" || raw === "hukum perdata") return "Hukum Perdata";
  if (raw === "keluarga" || raw === "hukum keluarga") return "Hukum Keluarga";

  if (raw === "ketenagakerjaan" || raw === "hukum ketenagakerjaan") {
    return "Hukum Ketenagakerjaan";
  }

  if (raw === "waris" || raw === "hukum waris") return "Hukum Waris";
  if (raw === "pertanahan") return "Pertanahan";

  return text || "Lainnya";
}

function normalizePrioritas(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (raw === "tinggi" || raw === "high") return "Tinggi";
  if (raw === "sedang" || raw === "medium") return "Sedang";
  if (raw === "rendah" || raw === "low") return "Rendah";

  return "Sedang";
}

function normalizeStatus(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (
    raw === "selesai" ||
    raw === "done" ||
    raw === "completed" ||
    raw === "complete"
  ) {
    return "Selesai";
  }

  if (raw === "mediasi" || raw === "mediation") return "Mediasi";

  return "Diproses";
}

function ensurePosbankumPrefix(value) {
  const text = String(value || "").trim();

  if (!text || text === "-") return "Posbankum Belum Dipetakan";
  if (text.toLowerCase().startsWith("posbankum")) return text;

  return `Posbankum ${text}`;
}

function getLocationFromMobileRegion({
  kelurahanNama,
  kecamatanNama,
  kabupatenNama,
}) {
  return [kelurahanNama, kecamatanNama, kabupatenNama]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
}

function inferStatus(row, extra, timelines = []) {
  const explicitStatus = String(
    extra.status_kasus || extra.status || row.status || "",
  )
    .trim()
    .toLowerCase();

  if (explicitStatus === "selesai") return "Selesai";
  if (explicitStatus === "mediasi") return "Mediasi";
  if (explicitStatus === "diproses") return "Diproses";

  const hasMediasiTimeline = timelines.some((item) =>
    String(item.title || item.deskripsi || "")
      .toLowerCase()
      .includes("mediasi"),
  );

  if (hasMediasiTimeline) return "Mediasi";
  if (String(row.status || "").toLowerCase() === "selesai") return "Selesai";

  return "Diproses";
}

function inferProgress(status, extra, timelines = []) {
  const numericProgress = Number(extra.progress);

  if (Number.isFinite(numericProgress) && numericProgress >= 0) {
    return Math.max(0, Math.min(100, Math.round(numericProgress)));
  }

  if (status === "Selesai") return 100;

  const aktivitasCount = Math.max(0, (timelines || []).length - 1);

  return Math.max(0, Math.min(100, aktivitasCount * 25));
}

function inferMobileProgress(status, progressRows = []) {
  if (status === "Selesai") return 100;

  const count = progressRows.length;

  if (!count) return 0;

  return Math.max(0, Math.min(95, count * 25));
}

function mapPengaduanToCase(
  row,
  posbankumRow,
  kabupatenNama,
  timelines = [],
  kasusRow = null,
) {
  const extra = parseCatatanAdmin(row.catatan_admin);
  const status = inferStatus(row, extra, timelines);
  const progress = inferProgress(status, extra, timelines);
  const lastTimeline = timelines.length
    ? timelines[timelines.length - 1]
    : null;

  return {
    id: row.nomor_pengaduan || row.id_pengaduan,
    judul: row.judul_pengaduan || "Tanpa Judul",
    kategori: normalizeKategori(row.jenis_masalah),
    status,
    prioritas: normalizePrioritas(extra.prioritas || row.prioritas),
    progress,
    posbankum: ensurePosbankumPrefix(posbankumRow?.nama),
    kota: firstFilled(
      row.lokasi_kejadian,
      row.kecamatan,
      row.kabupaten_kota,
      kabupatenNama,
      posbankumRow?.alamat,
    ),
    pelapor: firstFilled(row.nama_pelapor),
    paralegal: firstFilled(
      extra.paralegal_nama,
      posbankumRow?.nama_paralegal,
      "Paralegal Belum Diisi",
    ),
    paralegalPhone: firstFilled(extra.paralegal_hp, posbankumRow?.nomor_tlp),
    emailPosbankum: firstFilled(posbankumRow?.email_akun, row.email),
    tanggalLapor:
      row.created_at || row.tanggal_kejadian || new Date().toISOString(),
    updateTerakhir:
      lastTimeline?.tanggal ||
      kasusRow?.last_synced_at ||
      row.updated_at ||
      row.created_at ||
      new Date().toISOString(),
    deskripsi:
      row.kronologi || extra.catatan_internal || "Belum ada deskripsi kasus.",
    sumberData:
      String(kasusRow?.source_system || "website").toLowerCase() === "mobile"
        ? "Mobile"
        : "Website",
    globalCaseId: kasusRow?.global_case_id || null,
    mobilePengaduanId: kasusRow?.mobile_pengaduan_id || null,
    websiteKasusId: kasusRow?.id_kasus || null,
    websitePengaduanId: row.id_pengaduan || null,
  };
}

function mapWebsiteKasusToCase(row, posbankumRow) {
  const sourceLabel =
    String(row.source_system || "").toLowerCase() === "mobile"
      ? "Mobile"
      : "Website";

  const status = row.tgl_selesai ? "Selesai" : normalizeStatus(row.status);
  const judul = row.judul_kasus || row.jenis_kasus || "Tanpa Judul";

  return {
    id:
      row.website_pengaduan_id ||
      row.id_kasus ||
      row.global_case_id ||
      row.mobile_pengaduan_id,
    judul,
    kategori: normalizeKategori(row.jenis_kasus || row.judul_kasus),
    status,
    prioritas: normalizePrioritas(row.prioritas),
    progress: status === "Selesai" ? 100 : 0,
    posbankum: ensurePosbankumPrefix(posbankumRow?.nama),
    kota: firstFilled(posbankumRow?.alamat),
    pelapor: "Pelapor Belum Diisi",
    paralegal: firstFilled(
      posbankumRow?.nama_paralegal,
      "Paralegal Belum Diisi",
    ),
    paralegalPhone: firstFilled(posbankumRow?.nomor_tlp),
    emailPosbankum: firstFilled(posbankumRow?.email_akun),
    tanggalLapor: row.tgl_upload || new Date().toISOString(),
    updateTerakhir:
      row.last_synced_at || row.tgl_upload || new Date().toISOString(),
    deskripsi: row.deskripsi_kasus || "Belum ada deskripsi kasus.",
    sumberData: sourceLabel,
    globalCaseId: row.global_case_id || null,
    mobilePengaduanId: row.mobile_pengaduan_id || null,
    websiteKasusId: row.id_kasus || null,
    websitePengaduanId: row.website_pengaduan_id || null,
  };
}

function mapMobilePengaduanToCase(
  row,
  {
    masyarakatRow = null,
    paralegalRow = null,
    webPosbankumRow = null,
    progressRows = [],
    kabupatenNama = "",
    kecamatanNama = "",
    kelurahanNama = "",
  } = {},
) {
  const status = row.tgl_selesai ? "Selesai" : normalizeStatus(row.status);
  const lastProgress = progressRows.length
    ? progressRows[progressRows.length - 1]
    : null;

  const regionLocation = getLocationFromMobileRegion({
    kelurahanNama,
    kecamatanNama,
    kabupatenNama,
  });

  const posbankumName = ensurePosbankumPrefix(
    firstFilled(webPosbankumRow?.nama, paralegalRow?.nama_posbankum),
  );

  return {
    id: row.id,
    judul: row.kategori_masalah || "Tanpa Judul",
    kategori: normalizeKategori(row.kategori_masalah),
    status,
    prioritas: normalizePrioritas(row.prioritas),
    progress: inferMobileProgress(status, progressRows),
    posbankum: posbankumName,
    kota: firstFilled(
      row.lokasi_kejadian,
      masyarakatRow?.alamat,
      regionLocation,
      webPosbankumRow?.alamat,
      paralegalRow?.alamat,
    ),
    pelapor: firstFilled(masyarakatRow?.nama, "Pelapor Belum Diisi"),
    paralegal: firstFilled(
      webPosbankumRow?.nama_paralegal,
      paralegalRow?.nama_posbankum,
      "Paralegal Belum Diisi",
    ),
    paralegalPhone: firstFilled(
      paralegalRow?.no_hp,
      webPosbankumRow?.nomor_tlp,
    ),
    emailPosbankum: firstFilled(webPosbankumRow?.email_akun),
    tanggalLapor: row.tgl_lapor || new Date().toISOString(),
    updateTerakhir:
      lastProgress?.tanggal_progres ||
      lastProgress?.created_at ||
      row.synced_at ||
      row.tgl_lapor ||
      new Date().toISOString(),
    deskripsi: row.kronologi || "Belum ada deskripsi kasus.",
    sumberData: "Mobile",
    globalCaseId: row.global_case_id || null,
    mobilePengaduanId: row.id || null,
    websiteKasusId: row.website_kasus_id || null,
    websitePengaduanId: null,
    lampiranUrl: row.lampiran_url || "",
  };
}

function isSameSyncedCase(a, b) {
  return Boolean(
    (a.globalCaseId && b.globalCaseId && a.globalCaseId === b.globalCaseId) ||
    (a.mobilePengaduanId &&
      b.mobilePengaduanId &&
      a.mobilePengaduanId === b.mobilePengaduanId) ||
    (a.websiteKasusId &&
      b.websiteKasusId &&
      a.websiteKasusId === b.websiteKasusId),
  );
}

function mergeWebsiteAndMobileCase(existing, item) {
  const webIdIsBetter =
    existing?.id &&
    !String(existing.id).toUpperCase().startsWith("PGN-") &&
    String(existing.id).trim() !== "-";

  const finalId = webIdIsBetter ? existing.id : item.id || existing.id;

  return {
    ...existing,
    ...item,

    id: finalId,

    judul: isUsefulValue(item.judul, ["Tanpa Judul"])
      ? item.judul
      : existing.judul,
    kategori: isUsefulValue(item.kategori, ["Lainnya"])
      ? item.kategori
      : existing.kategori,
    status: item.status || existing.status,
    prioritas: item.prioritas || existing.prioritas,
    progress: Math.max(
      Number(existing.progress || 0),
      Number(item.progress || 0),
    ),

    posbankum: isUsefulValue(item.posbankum, ["Posbankum Belum Dipetakan"])
      ? item.posbankum
      : existing.posbankum,
    kota: isUsefulValue(item.kota) ? item.kota : existing.kota,
    pelapor: isUsefulValue(item.pelapor, ["Pelapor Belum Diisi"])
      ? item.pelapor
      : existing.pelapor,
    paralegal: isUsefulValue(item.paralegal, ["Paralegal Belum Diisi"])
      ? item.paralegal
      : existing.paralegal,
    paralegalPhone: isUsefulValue(item.paralegalPhone)
      ? item.paralegalPhone
      : existing.paralegalPhone,
    emailPosbankum: isUsefulValue(item.emailPosbankum)
      ? item.emailPosbankum
      : existing.emailPosbankum,

    tanggalLapor: item.tanggalLapor || existing.tanggalLapor,
    updateTerakhir: item.updateTerakhir || existing.updateTerakhir,
    deskripsi: isUsefulValue(item.deskripsi, ["Belum ada deskripsi kasus."])
      ? item.deskripsi
      : existing.deskripsi,

    websiteKasusId: existing.websiteKasusId || item.websiteKasusId,
    websitePengaduanId: existing.websitePengaduanId || item.websitePengaduanId,
    globalCaseId: existing.globalCaseId || item.globalCaseId,
    mobilePengaduanId: existing.mobilePengaduanId || item.mobilePengaduanId,
    lampiranUrl: item.lampiranUrl || existing.lampiranUrl || "",
  };
}

export default function SemuaKasus() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showStat, setShowStat] = useState(false);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    kategori: "Semua",
    status: "Semua",
    prioritas: "Semua",
    urutkan: "Terbaru",
  });

  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    let isMounted = true;

    async function loadCasesFromSupabase() {
      setLoading(true);
      setLoadError("");

      try {
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
            catatan_admin,
            created_by,
            created_at,
            updated_at,
            prioritas,
            id_paralegal
          `,
          )
          .order("created_at", { ascending: false });

        if (pengaduanError) throw pengaduanError;

        const { data: websiteKasusRows, error: websiteKasusError } =
          await supabase
            .from("kasus")
            .select(
              `
              id_kasus,
              jenis_kasus,
              deskripsi_kasus,
              tgl_upload,
              tgl_mulai,
              tgl_selesai,
              global_case_id,
              source_system,
              mobile_pengaduan_id,
              website_pengaduan_id,
              last_synced_at,
              id_posbankum,
              judul_kasus,
              status,
              prioritas
            `,
            )
            .order("tgl_upload", { ascending: false });

        if (websiteKasusError) throw websiteKasusError;

        const posbankumIds = [
          ...new Set(
            [
              ...(pengaduanRows || []).map((item) => item.id_posbankum),
              ...(websiteKasusRows || []).map((item) => item.id_posbankum),
            ].filter(Boolean),
          ),
        ];

        let posbankumRows = [];
        let kabupatenRows = [];
        let timelineRows = [];

        if (posbankumIds.length) {
          const { data, error } = await supabase
            .from("posbankum")
            .select(
              `
              id_posbankum,
              id_kabupaten,
              nama,
              nomor_tlp,
              alamat,
              nama_paralegal,
              email_akun
            `,
            )
            .in("id_posbankum", posbankumIds);

          if (error) throw error;
          posbankumRows = data || [];
        }

        const kabupatenIds = [
          ...new Set(
            (posbankumRows || [])
              .map((item) => item.id_kabupaten)
              .concat((pengaduanRows || []).map((item) => item.id_kabupaten))
              .filter(Boolean),
          ),
        ];

        if (kabupatenIds.length) {
          const { data, error } = await supabase
            .from("kabupaten")
            .select("id_kabupaten, nama")
            .in("id_kabupaten", kabupatenIds);

          if (error) throw error;
          kabupatenRows = data || [];
        }

        const pengaduanIds = (pengaduanRows || []).map(
          (item) => item.id_pengaduan,
        );

        if (pengaduanIds.length) {
          const { data, error } = await supabase
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
            .in("id_pengaduan", pengaduanIds)
            .order("tanggal", { ascending: true });

          if (error) throw error;
          timelineRows = data || [];
        }

        const posbankumMap = new Map(
          (posbankumRows || []).map((item) => [item.id_posbankum, item]),
        );

        const kabupatenMap = new Map(
          (kabupatenRows || []).map((item) => [item.id_kabupaten, item.nama]),
        );

        const timelineMap = new Map();

        for (const item of timelineRows || []) {
          if (!timelineMap.has(item.id_pengaduan)) {
            timelineMap.set(item.id_pengaduan, []);
          }

          timelineMap.get(item.id_pengaduan).push(item);
        }

        const kasusByWebsitePengaduanId = new Map();

        for (const row of websiteKasusRows || []) {
          if (row.website_pengaduan_id) {
            kasusByWebsitePengaduanId.set(row.website_pengaduan_id, row);
          }
        }

        const websitePengaduanCases = (pengaduanRows || []).map((row) => {
          const posbankumRow = posbankumMap.get(row.id_posbankum);

          const kabupatenNama =
            kabupatenMap.get(posbankumRow?.id_kabupaten) ||
            kabupatenMap.get(row.id_kabupaten) ||
            row.kabupaten_kota;

          const relatedKasus =
            kasusByWebsitePengaduanId.get(row.id_pengaduan) || null;

          return mapPengaduanToCase(
            row,
            posbankumRow,
            kabupatenNama,
            timelineMap.get(row.id_pengaduan) || [],
            relatedKasus,
          );
        });

        const pengaduanIdSet = new Set(
          (pengaduanRows || []).map((row) => row.id_pengaduan),
        );

        const orphanWebsiteKasusRows = (websiteKasusRows || []).filter(
          (row) => {
            if (!row.website_pengaduan_id) return true;
            return !pengaduanIdSet.has(row.website_pengaduan_id);
          },
        );

        const websiteKasusCases = orphanWebsiteKasusRows.map((row) =>
          mapWebsiteKasusToCase(row, posbankumMap.get(row.id_posbankum)),
        );

        let mobileCases = [];
        let mobileReadError = "";

        if (mobileSupabase) {
          const { data: mobilePengaduanRows, error: mobilePengaduanError } =
            await mobileSupabase
              .from("pengaduan")
              .select(
                `
                id,
                masyarakat_id,
                kategori_masalah,
                kronologi,
                lokasi_kejadian,
                lampiran_url,
                status,
                prioritas,
                paralegal_id,
                tgl_lapor,
                tgl_selesai,
                tgl_kejadian,
                global_case_id,
                source_system,
                website_kasus_id,
                website_posbankum_id,
                synced_at
              `,
              )
              .order("tgl_lapor", { ascending: false });

          if (mobilePengaduanError) {
            mobileReadError =
              mobilePengaduanError.message ||
              "Gagal membaca data kasus dari Supabase mobile.";
          } else {
            const mobileRows = mobilePengaduanRows || [];

            const paralegalIds = [
              ...new Set(
                mobileRows.map((item) => item.paralegal_id).filter(Boolean),
              ),
            ];

            const masyarakatIds = [
              ...new Set(
                mobileRows.map((item) => item.masyarakat_id).filter(Boolean),
              ),
            ];

            const mobilePengaduanIds = [
              ...new Set(mobileRows.map((item) => item.id).filter(Boolean)),
            ];

            const mobileWebPosbankumIds = [
              ...new Set(
                mobileRows
                  .map((item) => item.website_posbankum_id)
                  .filter(Boolean),
              ),
            ];

            let paralegalRows = [];
            let masyarakatRows = [];
            let mobileProgressRows = [];
            let mobileWebPosbankumRows = [];
            let mobileKabupatenRows = [];
            let mobileKecamatanRows = [];
            let mobileKelurahanRows = [];

            if (paralegalIds.length) {
              const { data: paralegalData, error: paralegalError } =
                await mobileSupabase
                  .from("paralegal")
                  .select("id, nama_posbankum, alamat, no_hp, web_id")
                  .in("id", paralegalIds);

              if (paralegalError) throw paralegalError;
              paralegalRows = paralegalData || [];
            }

            if (masyarakatIds.length) {
              const { data: masyarakatData, error: masyarakatError } =
                await mobileSupabase
                  .from("masyarakat")
                  .select(
                    `
                    id,
                    nik,
                    nama,
                    no_hp,
                    alamat,
                    kabupaten_id,
                    kecamatan_id,
                    kelurahan_id
                  `,
                  )
                  .in("id", masyarakatIds);

              if (masyarakatError) throw masyarakatError;
              masyarakatRows = masyarakatData || [];
            }

            if (mobilePengaduanIds.length) {
              const { data: progressData, error: progressError } =
                await mobileSupabase
                  .from("progres_kasus")
                  .select(
                    `
                    id,
                    pengaduan_id,
                    deskripsi_progres,
                    tanggal_progres,
                    foto_dokumentasi,
                    created_at
                  `,
                  )
                  .in("pengaduan_id", mobilePengaduanIds)
                  .order("tanggal_progres", { ascending: true });

              if (progressError) throw progressError;
              mobileProgressRows = progressData || [];
            }

            if (mobileWebPosbankumIds.length) {
              const { data: webPosbankumData, error: webPosbankumError } =
                await supabase
                  .from("posbankum")
                  .select(
                    `
                    id_posbankum,
                    id_kabupaten,
                    nama,
                    nomor_tlp,
                    alamat,
                    nama_paralegal,
                    email_akun
                  `,
                  )
                  .in("id_posbankum", mobileWebPosbankumIds);

              if (webPosbankumError) throw webPosbankumError;
              mobileWebPosbankumRows = webPosbankumData || [];
            }

            const mobileKabupatenIds = [
              ...new Set(
                masyarakatRows.map((item) => item.kabupaten_id).filter(Boolean),
              ),
            ];

            const mobileKecamatanIds = [
              ...new Set(
                masyarakatRows.map((item) => item.kecamatan_id).filter(Boolean),
              ),
            ];

            const mobileKelurahanIds = [
              ...new Set(
                masyarakatRows.map((item) => item.kelurahan_id).filter(Boolean),
              ),
            ];

            if (mobileKabupatenIds.length) {
              const { data, error } = await mobileSupabase
                .from("kabupaten")
                .select("id, nama")
                .in("id", mobileKabupatenIds);

              if (error) throw error;
              mobileKabupatenRows = data || [];
            }

            if (mobileKecamatanIds.length) {
              const { data, error } = await mobileSupabase
                .from("kecamatan")
                .select("id, nama")
                .in("id", mobileKecamatanIds);

              if (error) throw error;
              mobileKecamatanRows = data || [];
            }

            if (mobileKelurahanIds.length) {
              const { data, error } = await mobileSupabase
                .from("kelurahan")
                .select("id, nama")
                .in("id", mobileKelurahanIds);

              if (error) throw error;
              mobileKelurahanRows = data || [];
            }

            const paralegalMap = new Map(
              paralegalRows.map((item) => [item.id, item]),
            );

            const masyarakatMap = new Map(
              masyarakatRows.map((item) => [item.id, item]),
            );

            const mobileWebPosbankumMap = new Map(
              mobileWebPosbankumRows.map((item) => [item.id_posbankum, item]),
            );

            const mobileKabupatenMap = new Map(
              mobileKabupatenRows.map((item) => [item.id, item.nama]),
            );

            const mobileKecamatanMap = new Map(
              mobileKecamatanRows.map((item) => [item.id, item.nama]),
            );

            const mobileKelurahanMap = new Map(
              mobileKelurahanRows.map((item) => [item.id, item.nama]),
            );

            const mobileProgressMap = new Map();

            for (const progress of mobileProgressRows) {
              if (!mobileProgressMap.has(progress.pengaduan_id)) {
                mobileProgressMap.set(progress.pengaduan_id, []);
              }

              mobileProgressMap.get(progress.pengaduan_id).push(progress);
            }

            mobileCases = mobileRows.map((row) => {
              const masyarakatRow = masyarakatMap.get(row.masyarakat_id);
              const paralegalRow = paralegalMap.get(row.paralegal_id);

              const webPosbankumRow = mobileWebPosbankumMap.get(
                row.website_posbankum_id,
              );

              return mapMobilePengaduanToCase(row, {
                masyarakatRow,
                paralegalRow,
                webPosbankumRow,
                progressRows: mobileProgressMap.get(row.id) || [],
                kabupatenNama: mobileKabupatenMap.get(
                  masyarakatRow?.kabupaten_id,
                ),
                kecamatanNama: mobileKecamatanMap.get(
                  masyarakatRow?.kecamatan_id,
                ),
                kelurahanNama: mobileKelurahanMap.get(
                  masyarakatRow?.kelurahan_id,
                ),
              });
            });
          }
        }

        const mergedByKey = new Map();

        for (const item of websitePengaduanCases) {
          const key = item.websitePengaduanId || item.globalCaseId || item.id;
          mergedByKey.set(`website-pengaduan-${key}`, item);
        }

        for (const item of websiteKasusCases) {
          const syncKey =
            item.globalCaseId ||
            item.mobilePengaduanId ||
            item.websiteKasusId ||
            item.websitePengaduanId ||
            item.id;

          mergedByKey.set(`website-kasus-${syncKey}`, item);
        }

        for (const item of mobileCases) {
          let matchedKey = "";

          for (const [key, websiteItem] of mergedByKey.entries()) {
            if (isSameSyncedCase(websiteItem, item)) {
              matchedKey = key;
              break;
            }
          }

          if (matchedKey) {
            const existing = mergedByKey.get(matchedKey);
            mergedByKey.set(
              matchedKey,
              mergeWebsiteAndMobileCase(existing, item),
            );
          } else {
            const syncKey =
              item.globalCaseId ||
              item.mobilePengaduanId ||
              item.websiteKasusId ||
              item.id;

            mergedByKey.set(`mobile-${syncKey}`, item);
          }
        }

        if (isMounted) {
          setCases(Array.from(mergedByKey.values()));

          if (mobileReadError) {
            setLoadError(
              `Data website tampil, tetapi data mobile belum bisa dibaca: ${mobileReadError}`,
            );
          }
        }
      } catch (error) {
        console.error("Gagal load semua kasus dari Supabase:", error);

        if (isMounted) {
          setCases([]);
          setLoadError(error.message || "Gagal memuat data dari Supabase.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCasesFromSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const sourceCases = useMemo(() => cases || [], [cases]);

  const summary = useMemo(() => {
    const total = sourceCases.length;

    return {
      total,
      diproses: sourceCases.filter((item) => item.status === "Diproses").length,
      mediasi: sourceCases.filter((item) => item.status === "Mediasi").length,
      selesai: sourceCases.filter((item) => item.status === "Selesai").length,
      tinggi: sourceCases.filter((item) => item.prioritas === "Tinggi").length,
    };
  }, [sourceCases]);

  const filteredCases = useMemo(() => {
    let rows = [...sourceCases];

    const keyword = search.trim().toLowerCase();

    if (keyword) {
      rows = rows.filter((item) =>
        [
          item.id,
          item.judul,
          item.pelapor,
          item.paralegal,
          item.posbankum,
          item.kategori,
        ].some((field) => String(field).toLowerCase().includes(keyword)),
      );
    }

    if (filters.kategori !== "Semua") {
      rows = rows.filter((item) => item.kategori === filters.kategori);
    }

    if (filters.status !== "Semua") {
      rows = rows.filter((item) => item.status === filters.status);
    }

    if (filters.prioritas !== "Semua") {
      rows = rows.filter((item) => item.prioritas === filters.prioritas);
    }

    rows.sort((a, b) => {
      if (filters.urutkan === "Terlama") {
        return new Date(a.tanggalLapor) - new Date(b.tanggalLapor);
      }

      if (filters.urutkan === "Prioritas Tertinggi") {
        const byPriority =
          getPriorityWeight(b.prioritas) - getPriorityWeight(a.prioritas);

        if (byPriority !== 0) return byPriority;

        return new Date(b.tanggalLapor) - new Date(a.tanggalLapor);
      }

      return new Date(b.tanggalLapor) - new Date(a.tanggalLapor);
    });

    return rows;
  }, [sourceCases, search, filters]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));

    if (page > total) {
      setPage(1);
    }
  }, [filteredCases, page]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));

  const pagedCases = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCases.slice(start, start + PAGE_SIZE);
  }, [filteredCases, page]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.kategori !== "Semua") count += 1;
    if (filters.status !== "Semua") count += 1;
    if (filters.prioritas !== "Semua") count += 1;
    if (search.trim()) count += 1;

    return count;
  }, [filters, search]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (search.trim()) chips.push(`Pencarian: "${search.trim()}"`);
    if (filters.kategori !== "Semua") chips.push(filters.kategori);
    if (filters.status !== "Semua") chips.push(filters.status);
    if (filters.prioritas !== "Semua") chips.push(filters.prioritas);

    return chips;
  }, [filters, search]);

  const categoryStats = useMemo(() => {
    return CATEGORY_OPTIONS.filter((item) => item !== "Semua")
      .map((kategori) => {
        const count = sourceCases.filter(
          (row) => row.kategori === kategori,
        ).length;

        const percentage = summary.total
          ? ((count / summary.total) * 100).toFixed(1)
          : "0.0";

        return { kategori, count, percentage };
      })
      .filter((item) => item.count > 0);
  }, [sourceCases, summary.total]);

  const posbankumStats = useMemo(() => {
    const grouped = sourceCases.reduce((acc, item) => {
      const key = String(item.posbankum || "Posbankum")
        .replace(/^Posbankum\s+/i, "")
        .trim();

      acc[key] = (acc[key] || 0) + 1;

      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [sourceCases]);

  const openDetail = (item) => {
    setSelectedCase(item);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setSelectedCase(null);
    setShowDetail(false);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setShowFilter(false);
  };

  const resetFilters = () => {
    const initial = {
      kategori: "Semua",
      status: "Semua",
      prioritas: "Semua",
      urutkan: "Terbaru",
    };

    setFilters(initial);
    setDraftFilters(initial);
    setSearch("");
    setPage(1);
  };

  const openWhatsapp = () => {
    if (!selectedCase) return;

    const link = buildWhatsappLink(selectedCase);

    if (!link) return;

    window.open(link, "_blank", "noopener,noreferrer");
  };

  const goPrevPage = () => setPage((prev) => Math.max(1, prev - 1));
  const goNextPage = () => setPage((prev) => Math.min(totalPages, prev + 1));

  return (
    <div className="skWrap">
      <div className="skHeaderRow">
        <div>
          <h2 className="skPageTitle">Semua Kasus Posbankum Riau</h2>
          <div className="skTitleUnderline" />
        </div>

        <button
          type="button"
          className="skStatsBtn"
          onClick={() => setShowStat(true)}
        >
          <AiOutlineBarChart /> Statistik
        </button>
      </div>

      <div className="skStatsGrid">
        <div className="skStatCard skBlue">
          <div className="skStatLabel">Total Kasus</div>
          <div className="skStatValue">{summary.total}</div>
        </div>

        <div className="skStatCard skYellow">
          <div className="skStatLabel">Diproses</div>
          <div className="skStatValue">{summary.diproses}</div>
        </div>

        <div className="skStatCard skBlue">
          <div className="skStatLabel">Mediasi</div>
          <div className="skStatValue">{summary.mediasi}</div>
        </div>

        <div className="skStatCard skGreen">
          <div className="skStatLabel">Selesai</div>
          <div className="skStatValue">{summary.selesai}</div>
        </div>

        <div className="skStatCard skRed">
          <div className="skStatLabel">Prioritas Tinggi</div>
          <div className="skStatValue">{summary.tinggi}</div>
        </div>
      </div>

      <div className="skToolbarCard">
        <div className="skToolbarRow">
          <div className="skSearchBox">
            <FiSearch />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari berdasarkan nomor kasus, judul, pelapor, atau paralegal..."
            />
          </div>

          <button
            type="button"
            className="skFilterBtn"
            onClick={() => {
              setDraftFilters(filters);
              setShowFilter(true);
            }}
          >
            <BsSliders2 />
            Filter & Urutkan
            {activeFilterCount > 0 ? (
              <span className="skFilterCount">{activeFilterCount}</span>
            ) : null}
          </button>

          <button
            type="button"
            className="skExportBtn"
            onClick={() => exportCsv(filteredCases)}
          >
            <FiDownload /> Export CSV
          </button>
        </div>

        {activeFilterChips.length ? (
          <div className="skActiveFilterBar">
            <div className="skActiveLeft">
              <span className="skActiveLabel">Filter Aktif:</span>
              <div className="skChipWrap">
                {activeFilterChips.map((chip) => (
                  <span className="skActiveChip" key={chip}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="skResetLink"
              onClick={resetFilters}
            >
              Reset Semua
            </button>
          </div>
        ) : null}
      </div>

      {loadError ? (
        <div className="skResultText" style={{ color: "#b91c1c" }}>
          {loadError}
        </div>
      ) : null}

      <div className="skResultText">
        Menampilkan{" "}
        <span className="skResultNumber">{filteredCases.length}</span> dari{" "}
        <span className="skResultNumber">{sourceCases.length}</span> kasus
      </div>

      {loading ? (
        <div className="sk-emptyCard is-loading">Memuat data kasus...</div>
      ) : sourceCases.length === 0 ? (
        <div className="sk-emptyCard">
          <div className="sk-emptyIcon">
            <FiFileText />
          </div>
          <h2>Tidak Ada Kasus Ditemukan</h2>
          <p>Belum ada data kasus yang tersedia untuk posbankum ini.</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="sk-emptyCard">
          <div className="sk-emptyIcon">
            <FiFileText />
          </div>
          <h2>Tidak Ada Kasus Ditemukan</h2>
          <p>Tidak ada kasus yang sesuai dengan filter yang dipilih.</p>
          <button className="sk-emptyBtn" type="button" onClick={resetFilters}>
            Reset Filter
          </button>
        </div>
      ) : (
        <>
          <div className="skCardGrid">
            {pagedCases.map((item) => (
              <div className="skCaseCard" key={item.id}>
                <div className="skCaseTop">
                  <div className="skCaseTopRow">
                    <div className="skCaseNumber">{item.id}</div>
                    <div
                      className={`skPriorityPill skPriority${item.prioritas}`}
                    >
                      {item.prioritas}
                    </div>
                  </div>

                  <h3 className="skCaseTitle">{item.judul}</h3>

                  <div className="skBadgeRow">
                    <span className={`skStatusBadge skStatus${item.status}`}>
                      {getStatusIcon(item.status)}
                      {item.status}
                    </span>

                    <span className="skCategoryBadge">{item.kategori}</span>
                  </div>
                </div>

                <div className="skCaseBody">
                  <div className="skProgressHead">
                    <span>Progress</span>
                    <b>{item.progress}%</b>
                  </div>

                  <div className="skProgressTrack">
                    <div
                      className="skProgressFill"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="skInfoList">
                    <div className="skInfoItem skInfoItemPosbankum">
                      <span
                        className="skMaskIcon"
                        style={{ "--mask-url": `url(${posbankum})` }}
                        aria-hidden="true"
                      />
                      <span className="skInfoTextBold">{item.posbankum}</span>
                    </div>

                    <div className="skInfoItem">
                      <FiMapPin />
                      <span>{item.kota}</span>
                    </div>

                    <div className="skInfoItem">
                      <FiUser />
                      <span>Pelapor: {item.pelapor}</span>
                    </div>

                    <div className="skInfoItem">
                      <HiOutlineScale className="skParalegalIconThin" />
                      <span>Paralegal: {item.paralegal}</span>
                    </div>

                    <div className="skInfoItem">
                      <FiCalendar className="skDateIconBold" />
                      <span>{formatShortDateID(item.tanggalLapor)}</span>
                    </div>
                  </div>

                  <p className="skCaseDesc">{item.deskripsi}</p>

                  <button
                    type="button"
                    className="skDetailBtn"
                    onClick={() => openDetail(item)}
                  >
                    <FiEye />
                    <span>Lihat Detail</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="skPagination">
              <button
                type="button"
                className="skPageArrow"
                onClick={goPrevPage}
                disabled={page === 1}
              >
                <FiChevronLeft />
              </button>

              {Array.from({ length: totalPages }).map((_, index) => {
                const value = index + 1;

                return (
                  <button
                    type="button"
                    key={value}
                    className={`skPageBtn ${page === value ? "is-active" : ""}`}
                    onClick={() => setPage(value)}
                  >
                    {value}
                  </button>
                );
              })}

              <button
                type="button"
                className="skPageArrow"
                onClick={goNextPage}
                disabled={page === totalPages}
              >
                <FiChevronRight />
              </button>
            </div>
          ) : null}
        </>
      )}

      {showDetail && selectedCase ? (
        <div className="skOverlay" onClick={closeDetail}>
          <div className="skDetailModal" onClick={(e) => e.stopPropagation()}>
            <div className="skDetailHeader">
              <button
                type="button"
                className="skModalClose"
                onClick={closeDetail}
              >
                <FiX />
              </button>

              <div className="skDetailNumber">{selectedCase.id}</div>
              <div className="skDetailTitle">{selectedCase.judul}</div>

              <div className="skDetailBadgeRow">
                <span
                  className={`skStatusBadge skStatus${selectedCase.status}`}
                >
                  {getStatusIcon(selectedCase.status)}
                  {selectedCase.status}
                </span>

                <span className="skCategoryBadge">{selectedCase.kategori}</span>

                <span
                  className={`skPriorityPill skPriority${selectedCase.prioritas}`}
                >
                  {selectedCase.prioritas}
                </span>
              </div>

              <div className="skDetailProgressHead">
                <span>Progress Penanganan</span>
                <b>{selectedCase.progress}%</b>
              </div>

              <div className="skDetailProgressTrack">
                <div
                  className="skDetailProgressFill"
                  style={{ width: `${selectedCase.progress}%` }}
                />
              </div>
            </div>

            <div className="skDetailBody">
              <div className="skDetailInfoCard">
                <div className="skSectionHead is-card">
                  <span
                    className="skMaskIcon skMaskBlue"
                    style={{ "--mask-url": `url(${posbankum})` }}
                    aria-hidden="true"
                  />
                  <span>Informasi Posbankum</span>
                </div>

                <div className="skDetailInfoGrid">
                  <div>
                    <div className="skDetailLabel">Nama Posbankum</div>
                    <div className="skDetailValue">
                      {selectedCase.posbankum}
                    </div>
                  </div>

                  <div>
                    <div className="skDetailLabel">Kabupaten/Kota</div>
                    <div className="skDetailValue">{selectedCase.kota}</div>
                  </div>

                  <div>
                    <div className="skDetailLabel">Email</div>
                    <div className="skDetailValue skIconValue">
                      <FiMail />
                      {selectedCase.emailPosbankum}
                    </div>
                  </div>

                  <div>
                    <div className="skDetailLabel">Paralegal</div>
                    <div className="skDetailValue">
                      {selectedCase.paralegal}
                    </div>
                  </div>
                </div>
              </div>

              <div className="skSectionBlock">
                <div className="skSectionHead">
                  <FiUser />
                  <span>Informasi Pelapor</span>
                </div>

                <div className="skTwoColGrid">
                  <div className="skPlainCard">
                    <div className="skDetailLabel">Nama Pelapor</div>
                    <div className="skDetailValue">{selectedCase.pelapor}</div>
                  </div>

                  <div className="skPlainCard">
                    <div className="skDetailLabel">Telepon Paralegal</div>
                    <div className="skDetailValue skIconValue">
                      <BsTelephone />
                      {selectedCase.paralegalPhone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="skSectionBlock">
                <div className="skSectionHead">
                  <FiCalendar className="skDateIconBold skDateIconBoldBlue" />
                  <span>Timeline</span>
                </div>

                <div className="skTwoColGrid">
                  <div className="skPlainCard">
                    <div className="skDetailLabel">Tanggal Lapor</div>
                    <div className="skDetailValue">
                      {formatDateID(selectedCase.tanggalLapor)}
                    </div>
                  </div>

                  <div className="skPlainCard">
                    <div className="skDetailLabel">Update Terakhir</div>
                    <div className="skDetailValue">
                      {formatDateID(selectedCase.updateTerakhir)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="skSectionBlock">
                <div className="skSectionHead">
                  <FiFileText />
                  <span>Deskripsi Kasus</span>
                </div>

                <div className="skDescriptionCard">
                  {selectedCase.deskripsi}
                </div>
              </div>
            </div>

            <div className="skDetailFooter">
              <button
                type="button"
                className="skFooterGhost"
                onClick={closeDetail}
              >
                Tutup
              </button>

              <button
                type="button"
                className="skFooterPrimary"
                onClick={openWhatsapp}
              >
                <BsTelephone /> Hubungi Paralegal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFilter ? (
        <div className="skOverlay" onClick={() => setShowFilter(false)}>
          <div className="skFilterModal" onClick={(e) => e.stopPropagation()}>
            <div className="skModalTopBar">
              <div className="skModalTitle">
                <BsSliders2 />
                Filter & Urutkan Kasus
              </div>

              <button
                type="button"
                className="skModalClose"
                onClick={() => setShowFilter(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="skFilterBody">
              <div className="skFilterSection">
                <div className="skFilterLabel">Kategori Kasus</div>
                <div className="skOptionGrid">
                  {CATEGORY_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`skOptionBtn ${
                        draftFilters.kategori === item ? "is-active" : ""
                      }`}
                      onClick={() =>
                        setDraftFilters((prev) => ({ ...prev, kategori: item }))
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="skFilterSection">
                <div className="skFilterLabel">Status Kasus</div>
                <div className="skOptionGrid">
                  {STATUS_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`skOptionBtn ${
                        draftFilters.status === item ? "is-active" : ""
                      }`}
                      onClick={() =>
                        setDraftFilters((prev) => ({ ...prev, status: item }))
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="skFilterSection">
                <div className="skFilterLabel">Prioritas</div>
                <div className="skOptionGrid">
                  {PRIORITY_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`skOptionBtn ${
                        draftFilters.prioritas === item ? "is-active" : ""
                      }`}
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          prioritas: item,
                        }))
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="skFilterSection">
                <div className="skFilterLabel">Urutkan Berdasarkan</div>
                <div className="skOptionColumn">
                  {SORT_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`skOptionBtn full ${
                        draftFilters.urutkan === item ? "is-active" : ""
                      }`}
                      onClick={() =>
                        setDraftFilters((prev) => ({ ...prev, urutkan: item }))
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="skModalFooter">
              <button
                type="button"
                className="skFooterGhost"
                onClick={() => {
                  const initial = {
                    kategori: "Semua",
                    status: "Semua",
                    prioritas: "Semua",
                    urutkan: "Terbaru",
                  };

                  setDraftFilters(initial);
                }}
              >
                Reset Semua
              </button>

              <button
                type="button"
                className="skFooterPrimary"
                onClick={applyFilters}
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showStat ? (
        <div className="skOverlay" onClick={() => setShowStat(false)}>
          <div className="skStatModal" onClick={(e) => e.stopPropagation()}>
            <div className="skModalTopBar">
              <div className="skModalTitle">
                <FiClock />
                Statistik Kasus Posbankum Riau
              </div>

              <button
                type="button"
                className="skModalClose"
                onClick={() => setShowStat(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="skStatModalBody">
              <div className="skStatModalGrid">
                <div className="skStatCard skBlue">
                  <div className="skStatLabel">Total Kasus</div>
                  <div className="skStatValue">{summary.total}</div>
                </div>

                <div className="skStatCard skYellow">
                  <div className="skStatLabel">Diproses</div>
                  <div className="skStatValue">{summary.diproses}</div>
                </div>

                <div className="skStatCard skOrange">
                  <div className="skStatLabel">Mediasi</div>
                  <div className="skStatValue">{summary.mediasi}</div>
                </div>

                <div className="skStatCard skGreen">
                  <div className="skStatLabel">Selesai</div>
                  <div className="skStatValue">{summary.selesai}</div>
                </div>
              </div>

              <div className="skStatSectionTitle">
                Kasus Berdasarkan Kategori
              </div>

              <div className="skBarList">
                {categoryStats.map((item) => (
                  <div className="skBarCard" key={item.kategori}>
                    <div className="skBarHead">
                      <span>{item.kategori}</span>
                      <b>
                        {item.count} kasus ({item.percentage}%)
                      </b>
                    </div>

                    <div className="skBarTrack">
                      <div
                        className="skBarFill"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="skStatSectionTitle">
                Kasus Berdasarkan Posbankum
              </div>

              <div className="skPosbankumGrid">
                {posbankumStats.map((item) => (
                  <div className="skPosbankumCard" key={item.name}>
                    <div className="skPosbankumLeft">
                      <span
                        className="skMaskIcon skMaskBlue"
                        style={{ "--mask-url": `url(${posbankum})` }}
                        aria-hidden="true"
                      />
                      <span>{item.name}</span>
                    </div>

                    <span className="skPosbankumCount">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
