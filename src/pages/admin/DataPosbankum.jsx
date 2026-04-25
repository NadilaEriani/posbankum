import { AiOutlineCloseCircle } from "react-icons/ai";
import { BsCheck2Circle } from "react-icons/bs";
import React, { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiX,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiMapPin,
  FiEye,
  FiUsers,
  FiClock,
  FiAlertCircle,
  FiFilter,
  FiCheck,
  FiDownload,
} from "react-icons/fi";
import "./dataPosbankum.css";
import icon from "../../assets/icon.png";
import { supabase } from "../../lib/supabaseClient";

const BUCKET = "posbankum-docs";

/* =========================
   Custom Dropdown (Kab/Kec)
========================= */
function DpDropdown({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  // ✅ kalau value kosong -> tampilkan placeholder, bukan "Semua"
  const isEmptyValue = value === "" || value === null || value === undefined;

  const selectedLabel = !isEmptyValue
    ? (options || []).find((o) => String(o.value) === String(value))?.label ||
      ""
    : "";

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={`dp-dd ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="dp-ddBtn"
        onClick={() => !disabled && setOpen((s) => !s)}
        aria-expanded={open}
        disabled={disabled}
      >
        <FiFilter className="dp-ddIcon" />
        <span className={`dp-ddText ${selectedLabel ? "" : "is-placeholder"}`}>
          {selectedLabel || placeholder}
        </span>
        <FiChevronDown className={`dp-ddChevron ${open ? "is-open" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="dp-ddMenu" role="listbox">
          {(options || []).map((opt) => {
            const isActive = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`dp-ddItem ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isActive && <FiCheck className="dp-ddCheck" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DataPosbankum() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [kabupatenId, setKabupatenId] = useState("");
  const [kecamatanId, setKecamatanId] = useState("");

  // master data utk mapping nama kab/kec + dropdown
  const [kabupatenAll, setKabupatenAll] = useState([]);
  const [kecamatanAll, setKecamatanAll] = useState([]);

  const [rows, setRows] = useState([]);
  const [uploadsByPos, setUploadsByPos] = useState({});

  const [stats, setStats] = useState({
    aktif: 0,
    menunggu: 0,
    tidakLengkap: 0,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // accordion open/close
  const [expandedId, setExpandedId] = useState(null);

  // Modal preview file (gambar 3)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [previewKategori, setPreviewKategori] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const tabs = useMemo(
    () => [
      { key: "all", label: "Semua Posbankum" },
      { key: "complete", label: "Posbankum Data Lengkap" },
      { key: "incomplete", label: "Posbankum Data Tidak lengkap" },
    ],
    [],
  );

  // === Normalizer (biar kategori DB yang beda-beda tetap match)
  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const KATEGORI_ALIASES = useMemo(
    () => ({
      // === SK POSBANKUM
      "sk posbankum": "sk_posbankum",
      sk_posbankum: "sk_posbankum",
      "sk pos bankum": "sk_posbankum",

      // === SK KADARKUM (SK Kab/Kota)
      "sk kab/kota": "sk_kadarkum",
      "sk kab kota": "sk_kadarkum",
      "sk kabupaten/kota": "sk_kadarkum",
      "sk kadarkum": "sk_kadarkum",
      sk_kadarkum: "sk_kadarkum",

      // === SARPRAS
      "dokumentasi sarpras": "sarpras",
      "dokumentasi sapras": "sarpras",
      dokumentasi_sarpras: "sarpras",
      dokumentasi_sapras: "sarpras",
      "dok sarpras": "sarpras",
      "dok sapras": "sarpras",
      sarpras: "sarpras",
      sapras: "sarpras",

      // === TAGGING AREA
      "tagging area": "tagging_area",
      "tag area": "tagging_area",
      "topping area": "tagging_area",
      tagging_area: "tagging_area",
    }),
    [],
  );

  const canonKategori = (k) => {
    const n = norm(k);
    return KATEGORI_ALIASES[n] ?? n;
  };

  const REQUIRED = useMemo(
    () => [
      { label: "SK Posbankum", key: "sk_posbankum" },
      { label: "SK Kab/Kota", key: "sk_kadarkum" },
      { label: "Sapras", key: "sarpras" },
      { label: "Tagging Area", key: "tagging_area" },
    ],
    [],
  );

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Load master kabupaten + kecamatan (sekali)
  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const [kabRes, kecRes] = await Promise.all([
          supabase
            .from("kabupaten")
            .select("id_kabupaten,nama")
            .order("nama", { ascending: true }),
          supabase
            .from("kecamatan")
            .select("id_kecamatan,nama,id_kabupaten")
            .order("nama", { ascending: true }),
        ]);

        if (kabRes.error) throw kabRes.error;
        if (kecRes.error) throw kecRes.error;

        setKabupatenAll(kabRes.data ?? []);
        setKecamatanAll(kecRes.data ?? []);
      } catch (e) {
        setErr(e?.message || "Gagal memuat master kabupaten/kecamatan");
      }
    })();
  }, []);

  const kabById = useMemo(() => {
    const m = {};
    (kabupatenAll ?? []).forEach((k) => {
      m[k.id_kabupaten] = k;
    });
    return m;
  }, [kabupatenAll]);

  const kecById = useMemo(() => {
    const m = {};
    (kecamatanAll ?? []).forEach((kc) => {
      m[kc.id_kecamatan] = kc;
    });
    return m;
  }, [kecamatanAll]);

  const kabupatenOpts = kabupatenAll;

  const kecamatanOpts = useMemo(() => {
    if (!kabupatenId) return [];
    return (kecamatanAll ?? []).filter((kc) => kc.id_kabupaten === kabupatenId);
  }, [kecamatanAll, kabupatenId]);

  useEffect(() => {
    // kalau kabupaten berubah, reset kecamatan
    setKecamatanId("");
  }, [kabupatenId]);

  const normalizeStatus = (s) => {
    const x = norm(s);
    if (!x) return "menunggu";
    if (["setuju", "disetujui", "approved", "approve"].includes(x))
      return "disetujui";
    if (["tolak", "ditolak", "rejected", "reject"].includes(x))
      return "ditolak";
    if (["menunggu", "pending", "wait"].includes(x)) return "menunggu";
    return x;
  };

  const pickTimestamp = (u) =>
    u?.tgl_upload ??
    u?.tanggal_upload ??
    u?.uploaded_at ??
    u?.created_at ??
    u?.updated_at ??
    null;

  const pickPath = (u) =>
    u?.path_berkas ??
    u?.path ??
    u?.file_path ??
    u?.file_url ??
    u?.url ??
    u?.public_url ??
    "";

  const formatTanggal = (ts) => {
    if (!ts) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(ts));
    } catch {
      return "-";
    }
  };

  const hasTaggingArea = (pos) => {
    const lat = Number(pos?.latitude);
    const lng = Number(pos?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng);
  };

  const isChangedAfterCreate = (createdAt, updatedAt) => {
    if (!createdAt || !updatedAt) return false;

    const createdMs = new Date(createdAt).getTime();
    const updatedMs = new Date(updatedAt).getTime();

    if (!Number.isFinite(createdMs) || !Number.isFinite(updatedMs)) {
      return false;
    }

    // updated_at di tabel posbankum biasanya ikut terisi saat data dibuat.
    // Karena itu tanggal tagging area hanya tampil kalau memang sudah pernah di-update.
    return updatedMs - createdMs > 1000;
  };

  const pickTaggingTanggal = (pos, taggingLatest) => {
    if (taggingLatest) return pickTimestamp(taggingLatest);
    if (!hasTaggingArea(pos)) return null;
    return isChangedAfterCreate(pos?.created_at, pos?.updated_at)
      ? pos?.updated_at
      : null;
  };

  const buildOsmEmbed = (lat, lng) => {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";

    const delta = 0.004;
    const left = lo - delta;
    const right = lo + delta;
    const top = la + delta;
    const bottom = la - delta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${la}%2C${lo}`;
  };

  const buildGoogleMapsLink = (lat, lng) => {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(`${la},${lo}`)}`;
  };

  const sortUploads = (items = []) => {
    return [...items].sort((a, b) => {
      const timeA = new Date(pickTimestamp(a) || 0).getTime() || 0;
      const timeB = new Date(pickTimestamp(b) || 0).getTime() || 0;
      if (timeA !== timeB) return timeB - timeA;

      const nameA = String(
        a?.nama_berkas || a?.path_berkas || a?.id_data || "",
      );
      const nameB = String(
        b?.nama_berkas || b?.path_berkas || b?.id_data || "",
      );
      return nameA.localeCompare(nameB);
    });
  };

  const isImagePreview = (item) => {
    const mime = String(item?.mime || item?.mime_type || "").toLowerCase();
    const name = String(
      item?.name || item?.nama_berkas || item?.url || "",
    ).toLowerCase();
    return (
      mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
    );
  };

  const stripBucketPrefix = (p) => {
    const s = String(p || "");
    if (!s) return "";
    if (s.startsWith(`${BUCKET}/`)) return s.slice(BUCKET.length + 1);
    return s;
  };

  const makeSignedUrl = async (path) => {
    const raw = String(path || "");
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;

    const objectPath = stripBucketPrefix(raw);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, 60 * 10);

    if (error) throw error;
    return data?.signedUrl || "";
  };

  const openFile = async (row) => {
    setErr("");
    setPreviewItems([]);
    setPreviewIndex(0);

    if (row?.viewerType === "tagging_area") {
      const mapUrl = buildOsmEmbed(row?.latitude, row?.longitude);
      const mapsLink = buildGoogleMapsLink(row?.latitude, row?.longitude);

      if (!mapUrl) return;

      const item = {
        type: "map",
        url: mapUrl,
        mapsLink,
        name: "Tagging Area",
        kategori: row?.kategori || "Tagging Area",
        alamat: row?.alamat || "",
        latitude: row?.latitude,
        longitude: row?.longitude,
      };

      setPreviewItems([item]);
      setPreviewUrl(mapUrl);
      setPreviewMime("map");
      setPreviewName(item.name);
      setPreviewKategori(item.kategori);
      setPreviewOpen(true);
      return;
    }

    const files =
      Array.isArray(row?.files) && row.files.length ? row.files : [row];
    const cleanFiles = files.filter((item) => pickPath(item));
    if (!cleanFiles.length) return;

    try {
      const items = (
        await Promise.all(
          cleanFiles.map(async (item) => {
            const url = await makeSignedUrl(pickPath(item));
            if (!url) return null;

            return {
              type: "file",
              url,
              mime: item?.mime_type || "",
              name: item?.nama_berkas || row?.nama_berkas || "Berkas",
              kategori: item?.kategori || row?.kategori || "",
              row: item,
            };
          }),
        )
      ).filter(Boolean);

      if (!items.length) return;

      setPreviewItems(items);
      setPreviewUrl(items[0]?.url || "");
      setPreviewMime(items[0]?.mime || "");
      setPreviewName(items[0]?.name || "Berkas");
      setPreviewKategori(row?.kategori || items[0]?.kategori || "");
      setPreviewOpen(true);
    } catch (e) {
      setErr(e?.message || "Gagal membuka berkas");
    }
  };

  // hitung completeness dari uploads (per posbankum)
  const computeCompleteness = (uploads = [], posRow = null) => {
    const latestByKey = {};

    for (const u0 of uploads) {
      const key = canonKategori(u0?.kategori);
      if (!key) continue;

      const ts = pickTimestamp(u0);
      const prev = latestByKey[key];

      if (!prev) latestByKey[key] = u0;
      else {
        const a = new Date(pickTimestamp(prev) || 0).getTime();
        const b = new Date(ts || 0).getTime();
        if (b > a) latestByKey[key] = u0;
      }
    }

    const docsOk = REQUIRED.filter((req) => req.key !== "tagging_area").every(
      (req) => {
        const u = latestByKey[req.key];
        return (
          u && normalizeStatus(u.status_verifikasi ?? u.status) === "disetujui"
        );
      },
    );

    const taggingUpload = latestByKey.tagging_area;
    const taggingOk =
      hasTaggingArea(posRow) ||
      Boolean(
        taggingUpload &&
        pickPath(taggingUpload) &&
        normalizeStatus(
          taggingUpload.status_verifikasi ?? taggingUpload.status,
        ) === "disetujui",
      );

    return docsOk && taggingOk ? "complete" : "incomplete";
  };

  // Fetch posbankum + uploads
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        let query = supabase
          .from("posbankum")
          .select(
            "id_posbankum,nama,id_kabupaten,id_kecamatan,alamat,latitude,longitude,created_at,updated_at",
          )
          .order("nama", { ascending: true });

        if (kabupatenId) query = query.eq("id_kabupaten", kabupatenId);
        if (kecamatanId) query = query.eq("id_kecamatan", kecamatanId);
        if (debouncedQ) query = query.ilike("nama", `%${debouncedQ}%`);

        const { data: pos, error: posErr } = await query;
        if (posErr) throw posErr;

        const ids = (pos ?? []).map((r) => r.id_posbankum);

        let uploads = [];
        if (ids.length) {
          const { data: up, error: upErr } = await supabase
            .from("data_posbankum")
            .select("*")
            .in("id_posbankum", ids);

          if (upErr) throw upErr;
          uploads = up ?? [];
        }

        const grouped = {};
        for (const u of uploads) {
          const pid = u?.id_posbankum;
          if (!pid) continue;
          if (!grouped[pid]) grouped[pid] = [];
          grouped[pid].push(u);
        }

        const enriched = (pos ?? []).map((r) => ({
          ...r,
          completeness: computeCompleteness(grouped[r.id_posbankum] ?? [], r),
        }));

        // ✅ FIX: Posbankum Aktif = TOTAL posbankum (bukan yang complete)
        const aktif = enriched.length;

        const menunggu = uploads.filter(
          (u) =>
            normalizeStatus(u?.status_verifikasi ?? u?.status) === "menunggu",
        ).length;

        const tidakLengkap = enriched.filter(
          (r) => r.completeness === "incomplete",
        ).length;

        setRows(enriched);
        setUploadsByPos(grouped);
        setStats({ aktif, menunggu, tidakLengkap });

        // kalau expandedId tidak ada di list → tutup
        setExpandedId((prev) => {
          if (!prev) return null;
          const still = enriched.some((x) => x.id_posbankum === prev);
          return still ? prev : null;
        });
      } catch (e) {
        setErr(e?.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kabupatenId, kecamatanId, debouncedQ, REQUIRED, KATEGORI_ALIASES]);

  const filtered = useMemo(() => {
    return rows.filter((item) =>
      tab === "all" ? true : item.completeness === tab,
    );
  }, [rows, tab]);

  // detail rows per posbankum (accordion)
  const detailByPos = useMemo(() => {
    const out = {};

    for (const p of rows) {
      const pid = p.id_posbankum;
      const ups = uploadsByPos[pid] ?? [];

      const groupedByKey = {};
      for (const u of ups) {
        const key = canonKategori(u?.kategori);
        if (!key) continue;
        if (!groupedByKey[key]) groupedByKey[key] = [];
        groupedByKey[key].push(u);
      }

      Object.keys(groupedByKey).forEach((key) => {
        groupedByKey[key] = sortUploads(groupedByKey[key]);
      });

      out[pid] = REQUIRED.map((req) => {
        if (req.key === "tagging_area") {
          const taggingUploads = groupedByKey.tagging_area ?? [];
          const taggingLatest = taggingUploads[0];
          const hasCoords = hasTaggingArea(p);
          const taggingDate = pickTaggingTanggal(p, taggingLatest);

          if (hasCoords) {
            return {
              kategori: req.label,
              tanggal: formatTanggal(taggingDate),
              status: "menunggu",
              path: "__tagging_area__",
              viewerType: "tagging_area",
              latitude: p.latitude,
              longitude: p.longitude,
              alamat: p.alamat || "",
            };
          }

          if (taggingLatest) {
            return {
              kategori: req.label,
              tanggal: formatTanggal(taggingDate),
              status: normalizeStatus(
                taggingLatest?.status_verifikasi ?? taggingLatest?.status,
              ),
              path: pickPath(taggingLatest),
              mime_type: taggingLatest?.mime_type ?? "",
              nama_berkas: taggingLatest?.nama_berkas ?? "Tagging Area",
              files: taggingUploads,
            };
          }

          return {
            kategori: req.label,
            tanggal: "-",
            status: "menunggu",
            path: "",
            mime_type: "",
            nama_berkas: "",
          };
        }

        const files = groupedByKey[req.key] ?? [];
        const u = files[0];
        const st = normalizeStatus(u?.status_verifikasi ?? u?.status);
        const path = pickPath(u);

        return {
          kategori: req.label,
          tanggal: u ? formatTanggal(pickTimestamp(u)) : "-",
          status: st,
          path,
          mime_type: u?.mime_type ?? "",
          nama_berkas: u?.nama_berkas ?? "",
          files,
          fileCount: files.length,
        };
      });
    }

    return out;
  }, [rows, uploadsByPos, REQUIRED, KATEGORI_ALIASES]);

  const toggleExpand = (pid) => {
    setExpandedId((prev) => (prev === pid ? null : pid));
  };

  // Lock scroll + ESC for preview modal
  useEffect(() => {
    if (!previewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") setPreviewOpen(false);
      if (e.key === "ArrowLeft" && previewItems.length > 1) {
        setPreviewIndex((i) =>
          i === 0 ? previewItems.length - 1 : Math.max(0, i - 1),
        );
      }
      if (e.key === "ArrowRight" && previewItems.length > 1) {
        setPreviewIndex((i) =>
          i >= previewItems.length - 1
            ? 0
            : Math.min(previewItems.length - 1, i + 1),
        );
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewOpen, previewItems.length]);

  const currentPreview = previewItems[previewIndex] || null;
  const previewIsMap = currentPreview?.type === "map";
  const previewDisplayName = currentPreview?.name || previewName || "Berkas";
  const previewDisplayKategori =
    currentPreview?.kategori || previewKategori || "";
  const previewDisplayUrl = currentPreview?.url || previewUrl || "";

  const prevPreview = () => {
    if (previewItems.length <= 1) return;
    setPreviewIndex((i) => (i === 0 ? previewItems.length - 1 : i - 1));
  };

  const nextPreview = () => {
    if (previewItems.length <= 1) return;
    setPreviewIndex((i) => (i >= previewItems.length - 1 ? 0 : i + 1));
  };

  const renderStatus = (st) => {
    if (st === "disetujui") {
      return (
        <span className="dp-status is-ok">
          <BsCheck2Circle /> <span>Setuju</span>
        </span>
      );
    }
    if (st === "ditolak") {
      return (
        <span className="dp-status is-reject">
          <AiOutlineCloseCircle />
          <span>Tolak</span>
        </span>
      );
    }
    return (
      <span className="dp-status is-warn">
        <FiClock />
        <span>Menunggu</span>
      </span>
    );
  };

  return (
    <div className="dp">
      {err && (
        <div style={{ marginBottom: 12, color: "#b42318", fontSize: 14 }}>
          {err}
        </div>
      )}

      {/* 3 box atas (ikut style gambar) */}
      <div className="dp-topBoxes">
        <div className="dp-topBox tone-green">
          <div className="dp-topBoxInner">
            <div className="dp-topIcon is-green" aria-hidden="true">
              <img src={icon} alt="" className="dp-imgIcon" />
            </div>
            <div className="dp-topText">
              <div className="dp-topTitle">Posbankum Aktif</div>
              <div className="dp-topValue">{stats.aktif}</div>
              <div className="dp-topHint">Data lengkap & terverifikasi</div>
            </div>
          </div>
        </div>

        <div className="dp-topBox tone-yellow">
          <div className="dp-topBoxInner">
            <div className="dp-topIcon is-yellow" aria-hidden="true">
              <FiClock />
            </div>
            <div className="dp-topText">
              <div className="dp-topTitle">Menunggu Verifikasi</div>
              <div className="dp-topValue">{stats.menunggu}</div>
              <div className="dp-topHint">Dokumen belum diverifikasi</div>
            </div>
          </div>
        </div>

        <div className="dp-topBox tone-blue">
          <div className="dp-topBoxInner">
            <div className="dp-topIcon is-red" aria-hidden="true">
              <FiAlertCircle />
            </div>
            <div className="dp-topText">
              <div className="dp-topTitle">Data Tidak Lengkap</div>
              <div className="dp-topValue">{stats.tidakLengkap}</div>
              <div className="dp-topHint">Perlu dilengkapi</div>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL (toolbar + tabs) seperti gambar */}
      <div className="dp-filterCard">
        {/* Toolbar */}
        <div className="dp-toolbar">
          <div className="dp-search">
            <FiSearch className="dp-searchIcon" />
            <input
              className="dp-searchInput"
              placeholder="Pencarian..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                className="dp-clearBtn"
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear"
              >
                <FiX />
              </button>
            )}
          </div>

          {/* ====== FIX DROPDOWN: ganti native select -> custom dropdown ====== */}
          <div className="dp-filterRow">
            <DpDropdown
              value={kabupatenId}
              onChange={(val) => setKabupatenId(val)}
              placeholder="Pilih Kabupaten"
              options={[
                { value: "", label: "Semua" },
                ...kabupatenOpts.map((k) => ({
                  value: k.id_kabupaten,
                  label: k.nama,
                })),
              ]}
            />

            <DpDropdown
              value={kecamatanId}
              onChange={(val) => setKecamatanId(val)}
              placeholder="Pilih Kecamatan"
              disabled={!kabupatenId}
              options={[
                { value: "", label: "Semua" },
                ...kecamatanOpts.map((kc) => ({
                  value: kc.id_kecamatan,
                  label: kc.nama,
                })),
              ]}
            />

            {(kabupatenId || kecamatanId) && (
              <button
                className="dp-resetFilterBtn"
                type="button"
                onClick={() => {
                  setKabupatenId("");
                  setKecamatanId("");
                }}
                title="Reset filter"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>

        <div className="dp-divider" />

        {/* Tabs (pill seperti gambar) */}
        <div className="dp-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`dp-tab ${tab === t.key ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List (card accordion) */}
      <div className="dp-list">
        {loading ? (
          <div style={{ padding: 16, fontSize: 14 }}>Memuat data...</div>
        ) : filtered.length ? (
          filtered.map((item) => {
            const pid = item.id_posbankum;
            const isOpen = expandedId === pid;

            const kabName = kabById[item.id_kabupaten]?.nama || "";
            const kecName = kecById[item.id_kecamatan]?.nama || "";
            const loc = [kabName, kecName].filter(Boolean).join(" • ") || "-";

            const badgeText =
              item.completeness === "complete" ? "Lengkap" : "Tidak Lengkap";

            const detailRows = detailByPos[pid] ?? [];

            return (
              <div key={pid} className={`dp-card ${isOpen ? "is-open" : ""}`}>
                <div
                  className="dp-cardHead"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleExpand(pid)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleExpand(pid);
                  }}
                >
                  <div className="dp-iconWrap" aria-hidden="true">
                    <img src={icon} alt="" className="dp-imgIcon" />
                  </div>

                  <div className="dp-titleWrap">
                    <div className="dp-name">{item.nama}</div>
                    <div className="dp-sub">
                      <FiMapPin className="dp-subIcon" />
                      <span className="dp-subText">{loc}</span>
                    </div>
                  </div>

                  <div className="dp-right">
                    <span
                      className={`dp-rowBadge ${
                        item.completeness === "complete" ? "is-ok" : "is-warn"
                      }`}
                    >
                      {badgeText}
                    </span>

                    <div className="dp-chevron" aria-hidden="true">
                      {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </div>
                </div>

                {/* Expanded (gambar 2) */}
                {isOpen && (
                  <div
                    className="dp-cardExpand"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="dp-expandShell">
                      <table className="dp-expandTable">
                        <thead>
                          <tr>
                            <th>KATEGORI</th>
                            <th>TANGGAL UNGGAH</th>
                            <th>STATUS</th>
                            <th>AKSI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRows.map((r, idx) => (
                            <tr key={idx}>
                              <td className="dp-tdStrong">
                                <span>{r.kategori}</span>
                                {r.fileCount > 1 ? (
                                  <span className="dp-fileCount">
                                    {r.fileCount} Foto
                                  </span>
                                ) : null}
                              </td>
                              <td>{r.tanggal}</td>
                              <td>{renderStatus(r.status)}</td>
                              <td>
                                {r.path ? (
                                  <button
                                    className="dp-viewBtn"
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openFile(r);
                                    }}
                                  >
                                    <FiEye />
                                    <span>Lihat</span>
                                  </button>
                                ) : (
                                  <span className="dp-muted">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="dp-expandFoot">
                        <button
                          className="dp-closeInlineBtn"
                          type="button"
                          onClick={() => setExpandedId(null)}
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ padding: 16, fontSize: 14 }}>Data tidak ditemukan.</div>
        )}
      </div>

      {/* ===== PREVIEW MODAL (klik Lihat) ===== */}
      {previewOpen && (
        <div
          className="dp-modalOverlay"
          onMouseDown={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="dp-modal dp-modalPreview"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="dp-previewHead">
              <div className="dp-previewTitleWrap">
                <div className="dp-previewTitle">{previewDisplayName}</div>
                <div className="dp-previewSub">
                  {previewDisplayKategori}
                  {previewItems.length > 1
                    ? ` • ${previewIndex + 1} / ${previewItems.length}`
                    : ""}
                </div>
              </div>

              <button
                className="dp-previewClose"
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Tutup"
              >
                <FiX />
              </button>
            </div>

            <div className="dp-previewToolbar">
              <div className="dp-previewToolbarLeft">
                {previewItems.length > 1 ? (
                  <div className="dp-previewCounter">
                    <button
                      type="button"
                      onClick={prevPreview}
                      aria-label="Foto sebelumnya"
                    >
                      &lt;
                    </button>
                    <span>
                      {previewIndex + 1} / {previewItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={nextPreview}
                      aria-label="Foto berikutnya"
                    >
                      &gt;
                    </button>
                  </div>
                ) : null}
              </div>

              {!previewIsMap ? (
                <a
                  className="dp-downloadBtn"
                  href={previewDisplayUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    if (!previewDisplayUrl) e.preventDefault();
                  }}
                >
                  <FiDownload />
                  <span>Download</span>
                </a>
              ) : currentPreview?.mapsLink ? (
                <a
                  className="dp-downloadBtn"
                  href={currentPreview.mapsLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FiMapPin />
                  <span>Buka Maps</span>
                </a>
              ) : null}
            </div>

            <div className="dp-previewBody">
              {!previewDisplayUrl ? (
                <div className="dp-previewEmpty">Berkas tidak tersedia.</div>
              ) : previewIsMap ? (
                <div className="dp-mapPreviewWrap">
                  <iframe
                    src={previewDisplayUrl}
                    title="Tagging Area"
                    className="dp-previewFrame"
                  />
                  <div className="dp-mapInfo">
                    <div className="dp-mapInfoTitle">Lokasi Tagging Area</div>
                    <div className="dp-mapInfoText">
                      {currentPreview?.alamat || "Alamat belum tersedia"}
                    </div>
                    <div className="dp-mapInfoCoord">
                      {currentPreview?.latitude}, {currentPreview?.longitude}
                    </div>
                  </div>
                </div>
              ) : isImagePreview(currentPreview) ? (
                <div className="dp-previewMediaWrap">
                  <img
                    src={previewDisplayUrl}
                    alt={previewDisplayName}
                    className="dp-previewImg"
                  />
                </div>
              ) : (
                <iframe
                  src={previewDisplayUrl}
                  title={previewDisplayName}
                  className="dp-previewFrame"
                />
              )}
            </div>

            <div className="dp-modalFoot">
              <button
                className="dp-backBtn"
                type="button"
                onClick={() => setPreviewOpen(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
