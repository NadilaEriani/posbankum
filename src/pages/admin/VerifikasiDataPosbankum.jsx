import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiEye,
  FiFileText,
  FiFilter,
  FiClock,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { supabase } from "../../lib/supabaseClient";
import SuccessToast from "../../components/ui/SuccessToast";
import "./verifikasiDataPosbankum.css";

const BUCKET = "posbankum-docs";

/* =========================
   Custom Dropdown (Kab/Kec)
========================= */
function VdDropdown({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

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
    <div className={`vd-dd ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="vd-ddBtn"
        onClick={() => !disabled && setOpen((s) => !s)}
        aria-expanded={open}
        disabled={disabled}
      >
        <FiFilter className="vd-ddIcon" />
        <span className={`vd-ddText ${selectedLabel ? "" : "is-placeholder"}`}>
          {selectedLabel || placeholder}
        </span>
        <FiChevronDown className={`vd-ddChevron ${open ? "is-open" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="vd-ddMenu" role="listbox">
          {(options || []).map((opt) => {
            const isActive = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`vd-ddItem ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isActive && <BsCheck2Circle className="vd-ddCheck" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VerifikasiDataPosbankum() {
  // filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [kabupatenId, setKabupatenId] = useState("");
  const [kecamatanId, setKecamatanId] = useState("");

  // dropdown opts
  const [kabupatenOpts, setKabupatenOpts] = useState([]);
  const [kecamatanOpts, setKecamatanOpts] = useState([]);

  // data
  const [posList, setPosList] = useState([]);
  const [uploadsByPos, setUploadsByPos] = useState({}); // {id_posbankum: upload[]}

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [previewName, setPreviewName] = useState("");
  // info lokasi untuk header popup
  const [previewKabName, setPreviewKabName] = useState("");
  const [previewKecName, setPreviewKecName] = useState("");

  // cache nama kecamatan biar tidak query berulang
  const [kecamatanNameCache, setKecamatanNameCache] = useState({});

  // doc selected (untuk tombol Tolak/Setuju)
  const [selectedDoc, setSelectedDoc] = useState(null); // {posId, key, uploadId, ...}
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // === kategori wajib (KEY harus konsisten dengan data DB kamu)
  const REQUIRED = useMemo(
    () => [
      { label: "Sk Posbankum", key: "sk_posbankum" },
      { label: "Sk Kadarkum", key: "sk_kadarkum" },
      { label: "Sapras", key: "sarpras" },
      { label: "Tagging Area", key: "tagging_area" },
    ],
    [],
  );

  // ===== helpers
  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  // alias supaya "sapras" dari DB tetap dianggap "sarpras"
  const KATEGORI_ALIASES = useMemo(
    () => ({
      sk_posbankum: "sk_posbankum",
      "sk posbankum": "sk_posbankum",

      sk_kadarkum: "sk_kadarkum",
      "sk kadarkum": "sk_kadarkum",
      "sk kab/kota": "sk_kadarkum",

      sarpras: "sarpras",
      sapras: "sarpras",
      "dokumentasi sarpras": "sarpras",
      "dokumentasi sapras": "sarpras",

      tagging_area: "tagging_area",
      "tagging area": "tagging_area",
    }),
    [],
  );

  const canonKategori = (k) => {
    const n = norm(k);
    return KATEGORI_ALIASES[n] ?? n;
  };

  const normalizeStatus = (s) => {
    const x = norm(s);
    if (!x) return "menunggu";
    if (["setuju", "disetujui", "approved", "approve"].includes(x))
      return "disetujui";
    if (["tolak", "ditolak", "rejected", "reject"].includes(x))
      return "ditolak";
    return "menunggu";
  };

  const pickTimestamp = (u) =>
    u?.tgl_upload ?? u?.created_at ?? u?.updated_at ?? null;
  const pickPath = (u) => u?.path_berkas ?? "";
  const pickMime = (u) => u?.mime_type ?? "";
  const pickName = (u) => u?.nama_berkas ?? "";
  const pickUploadId = (u) => u?.id_data ?? u?.id ?? u?.uuid ?? null;

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

  const stripBucketPrefix = (p) => {
    const s = String(p || "");
    if (!s) return "";
    if (s.startsWith(`${BUCKET}/`)) return s.slice(BUCKET.length + 1);
    return s;
  };

  // ===== debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // ===== load kabupaten
  useEffect(() => {
    (async () => {
      setErr("");
      const { data, error } = await supabase
        .from("kabupaten")
        .select("id_kabupaten,nama")
        .order("nama", { ascending: true });

      if (error) return setErr(error.message);
      setKabupatenOpts(data ?? []);
    })();
  }, []);

  // ===== load kecamatan by kabupaten (untuk dropdown)
  useEffect(() => {
    (async () => {
      setErr("");
      setKecamatanId("");
      setKecamatanOpts([]);

      if (!kabupatenId) return;

      const { data, error } = await supabase
        .from("kecamatan")
        .select("id_kecamatan,nama")
        .eq("id_kabupaten", kabupatenId)
        .order("nama", { ascending: true });

      if (error) return setErr(error.message);
      setKecamatanOpts(data ?? []);
    })();
  }, [kabupatenId]);

  // ===== fetch posbankum + uploads
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        let query = supabase
          .from("posbankum")
          .select("id_posbankum,nama,id_kabupaten,id_kecamatan")
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

        setPosList(pos ?? []);
        setUploadsByPos(grouped);

        // reset page kalau filter berubah
        setPage(1);
      } catch (e) {
        setErr(e?.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, [kabupatenId, kecamatanId, debouncedQ]);

  // ===== build card view model (tetap sama)
  const cards = useMemo(() => {
    return (posList ?? []).map((p) => {
      const ups = uploadsByPos[p.id_posbankum] ?? [];

      // latest per kategori
      const latestByKey = {};
      for (const u of ups) {
        const key = canonKategori(u?.kategori);
        if (!key) continue;

        const prev = latestByKey[key];
        if (!prev) latestByKey[key] = u;
        else {
          const a = new Date(pickTimestamp(prev) || 0).getTime();
          const b = new Date(pickTimestamp(u) || 0).getTime();
          if (b > a) latestByKey[key] = u;
        }
      }

      const docs = REQUIRED.map((req) => {
        const u = latestByKey[req.key];
        return {
          label: req.label,
          key: req.key,
          tanggal: u ? formatTanggal(pickTimestamp(u)) : "-",
          status: normalizeStatus(u?.status_verifikasi ?? u?.status),
          path: u ? pickPath(u) : "",
          mime: u ? pickMime(u) : "",
          name: u ? pickName(u) : "",
          uploadId: u ? pickUploadId(u) : null,
        };
      });

      return { ...p, docs };
    });
  }, [posList, uploadsByPos, REQUIRED, KATEGORI_ALIASES]);

  // ===== stats top cards (hanya UI)
  const stats = useMemo(() => {
    let menunggu = 0;
    let disetujui = 0;
    let ditolak = 0;

    for (const c of cards) {
      for (const d of c.docs) {
        if (!d.path) continue; // hitung hanya yang ada berkasnya
        if (d.status === "disetujui") disetujui += 1;
        else if (d.status === "ditolak") ditolak += 1;
        else menunggu += 1;
      }
    }
    return { menunggu, disetujui, ditolak };
  }, [cards]);

  // ===== pagination
  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const pageClamped = Math.min(Math.max(page, 1), totalPages);
  const pageItems = useMemo(() => {
    const start = (pageClamped - 1) * PAGE_SIZE;
    return cards.slice(start, start + PAGE_SIZE);
  }, [cards, pageClamped]);

  // lookup cepat pos berdasarkan id (untuk preview)
  const posById = useMemo(() => {
    const m = {};
    for (const p of posList ?? []) m[p.id_posbankum] = p;
    return m;
  }, [posList]);

  // lookup cepat kabupaten name dari dropdown opts
  const kabupatenNameById = useMemo(() => {
    const m = {};
    for (const k of kabupatenOpts ?? []) m[k.id_kabupaten] = k.nama;
    return m;
  }, [kabupatenOpts]);

  // prefetch nama kecamatan untuk tampilan card (UI saja)
  useEffect(() => {
    (async () => {
      const ids = Array.from(
        new Set((posList ?? []).map((p) => p.id_kecamatan).filter(Boolean)),
      ).filter((id) => !kecamatanNameCache[id]);

      if (!ids.length) return;

      const { data, error } = await supabase
        .from("kecamatan")
        .select("id_kecamatan,nama")
        .in("id_kecamatan", ids);

      if (error) return;

      const patch = {};
      (data ?? []).forEach((r) => {
        patch[r.id_kecamatan] = r.nama;
      });

      setKecamatanNameCache((prev) => ({ ...prev, ...patch }));
    })();
  }, [posList, kecamatanNameCache]);

  const getKecamatanName = async (idKecamatan) => {
    if (!idKecamatan) return "";

    // cache hit
    if (kecamatanNameCache[idKecamatan]) return kecamatanNameCache[idKecamatan];

    const { data, error } = await supabase
      .from("kecamatan")
      .select("nama")
      .eq("id_kecamatan", idKecamatan)
      .maybeSingle();

    if (error) return "";

    const name = data?.nama ?? "";
    setKecamatanNameCache((prev) => ({ ...prev, [idKecamatan]: name }));
    return name;
  };

  // ===== preview (modal)
  const openPreview = async (doc, posId) => {
    setErr("");
    if (!doc?.path) return;

    let url = doc.path;

    if (!/^https?:\/\//i.test(url)) {
      const objectPath = stripBucketPrefix(url);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60 * 10);

      if (error) {
        setErr(error.message);
        return;
      }
      url = data?.signedUrl || "";
    }

    setSelectedDoc({ ...doc, posId });

    const p = posById[posId];
    const kabName = kabupatenNameById[p?.id_kabupaten] ?? "-";
    setPreviewKabName(kabName);

    const kecName = (await getKecamatanName(p?.id_kecamatan)) || "-";
    setPreviewKecName(kecName);

    setPreviewUrl(url);
    setPreviewMime(doc.mime || "");
    setPreviewName(doc.name || "Berkas");
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewUrl("");
    setPreviewMime("");
    setPreviewName("");
    setSelectedDoc(null);
    setVerifyBusy(false);
    setPreviewKabName("");
    setPreviewKecName("");
  };

  // ESC close preview
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e) => e.key === "Escape" && closePreview();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  // ===== aksi verifikasi (Tolak / Setuju) — LOGIKA TETAP
  const setDocStatusLocal = (posId, key, status) => {
    setUploadsByPos((prev) => {
      const list = prev?.[posId] ?? [];
      if (!list.length) return prev;

      let latestIdx = -1;
      let latestTime = -1;

      for (let i = 0; i < list.length; i++) {
        const u = list[i];
        const k = canonKategori(u?.kategori);
        if (k !== key) continue;

        const t = new Date(pickTimestamp(u) || 0).getTime();
        if (t > latestTime) {
          latestTime = t;
          latestIdx = i;
        }
      }

      if (latestIdx < 0) return prev;

      const nextList = list.slice();
      nextList[latestIdx] = {
        ...nextList[latestIdx],
        status_verifikasi: status,
      };

      return { ...prev, [posId]: nextList };
    });
  };

  const updateVerification = async (status) => {
    setErr("");

    if (!selectedDoc?.uploadId) {
      setErr("ID dokumen tidak ditemukan (uploadId kosong).");
      return;
    }

    setVerifyBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const verifierId = authData?.user?.id ?? null;

      const payload = {
        status_verifikasi: status,
        id_user_verifikator: verifierId,
        tgl_verifikasi: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("data_posbankum")
        .update(payload)
        .eq("id_data", selectedDoc.uploadId);

      if (error) throw error;

      if (selectedDoc?.posId && selectedDoc?.key) {
        setDocStatusLocal(selectedDoc.posId, selectedDoc.key, status);
      }

      closePreview();
      setSuccessMessage(
        status === "disetujui"
          ? "Dokumen berhasil disetujui!"
          : "Dokumen berhasil ditolak!",
      );
    } catch (e) {
      setErr(e?.message || "Gagal memperbarui status verifikasi");
      setVerifyBusy(false);
    }
  };

  const renderDocIcon = (status) => {
    if (status === "disetujui")
      return <BsCheck2Circle className="vd-docStatusIcon" />;
    if (status === "ditolak")
      return <AiOutlineCloseCircle className="vd-docStatusIcon" />;
    return <FiClock className="vd-docStatusIcon" />;
  };

  return (
    <div className="vd">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      {/* ===== TOP 3 CARDS ===== */}
      <div className="vd-topBoxes">
        <div className="vd-topBox">
          <div className="vd-topBoxInner">
            <div className="vd-topIcon is-wait" aria-hidden="true">
              <FiClock />
            </div>
            <div className="vd-topText">
              <div className="vd-topTitle">Menunggu Verifikasi</div>
              <div className="vd-topValue">{stats.menunggu}</div>
              <div className="vd-topHint">Dokumen Perlu Ditinjau</div>
            </div>
          </div>
        </div>

        <div className="vd-topBox">
          <div className="vd-topBoxInner">
            <div className="vd-topIcon is-ok" aria-hidden="true">
              <BsCheck2Circle />
            </div>
            <div className="vd-topText">
              <div className="vd-topTitle">Disetujui</div>
              <div className="vd-topValue">{stats.disetujui}</div>
              <div className="vd-topHint">Dokumen Terverifikasi</div>
            </div>
          </div>
        </div>

        <div className="vd-topBox">
          <div className="vd-topBoxInner">
            <div className="vd-topIcon is-no" aria-hidden="true">
              <AiOutlineCloseCircle />
            </div>
            <div className="vd-topText">
              <div className="vd-topTitle">Ditolak</div>
              <div className="vd-topValue">{stats.ditolak}</div>
              <div className="vd-topHint">Perlu Diperbaiki</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SEARCH CARD ===== */}
      <div className="vd-filterCard">
        <div className="vd-toolbar">
          <div className="vd-search">
            <FiSearch className="vd-searchIcon" />
            <input
              className="vd-searchInput"
              placeholder="Pencarian..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                className="vd-clearBtn"
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear"
              >
                <FiX />
              </button>
            )}
          </div>

          <div className="vd-filterRow">
            <VdDropdown
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

            <VdDropdown
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
                className="vd-resetBtn"
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

        {err && <div className="vd-error">{err}</div>}
      </div>

      {/* ===== GRID CARDS ===== */}
      <div className="vd-grid">
        {loading ? (
          <div className="vd-loading">Memuat data...</div>
        ) : pageItems.length ? (
          pageItems.map((p) => {
            const kabName = kabupatenNameById[p.id_kabupaten] ?? "";
            const kecName = kecamatanNameCache[p.id_kecamatan] ?? "";
            const loc = [kabName, kecName].filter(Boolean).join(" • ") || "-";

            return (
              <div key={p.id_posbankum} className="vd-card">
                <div className="vd-cardHead">
                  <div className="vd-cardTitle">{p.nama}</div>
                  <div className="vd-cardSub">{loc}</div>
                </div>

                <div className="vd-docs">
                  {p.docs.map((d) => {
                    const tone =
                      d.status === "disetujui"
                        ? "is-ok"
                        : d.status === "ditolak"
                          ? "is-no"
                          : "is-wait";

                    return (
                      <div key={d.key} className={`vd-docPill ${tone}`}>
                        <div className="vd-docLeft">
                          <span
                            className={`vd-docStatus ${tone}`}
                            title={d.status}
                          >
                            {renderDocIcon(d.status)}
                          </span>
                          <div className="vd-docMeta">
                            <div className="vd-docLabel">{d.label}</div>
                            <div className="vd-docDate">{d.tanggal}</div>
                          </div>
                        </div>

                        <button
                          className="vd-eyeBtn"
                          type="button"
                          disabled={!d.path}
                          title={!d.path ? "Belum ada berkas" : "Lihat"}
                          onClick={() => openPreview(d, p.id_posbankum)}
                        >
                          <FiEye />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="vd-loading">Data tidak ditemukan.</div>
        )}
      </div>

      {/* ===== PAGINATION ===== */}
      <div className="vd-pagination">
        <button
          className="vd-pageNav"
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageClamped <= 1}
          aria-label="Prev"
        >
          <FiChevronLeft />
        </button>

        {[1, 2, 3].map((n) => (
          <button
            key={n}
            className={`vd-pageBtn ${pageClamped === n ? "is-active" : ""}`}
            type="button"
            onClick={() => setPage(n)}
            disabled={n > totalPages}
          >
            {n}
          </button>
        ))}

        <button
          className="vd-pageNav"
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={pageClamped >= totalPages}
          aria-label="Next"
        >
          <FiChevronRight />
        </button>
      </div>

      {/* ===== PREVIEW MODAL ===== */}
      {previewOpen && (
        <div
          className="vd-overlay"
          onMouseDown={closePreview}
          role="dialog"
          aria-modal="true"
        >
          <div className="vd-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="vd-modalHead">
              <button
                className="vd-closeSquare"
                type="button"
                onClick={closePreview}
                aria-label="Tutup"
                title="Tutup"
              >
                <FiX />
              </button>

              <div className="vd-headRight">
                <div className="vd-headSub">
                  {previewName || "Preview Dokumen"}
                </div>
                <div className="vd-headMeta">
                  Kabupaten: <b>{previewKabName || "-"}</b> • Kecamatan:{" "}
                  <b>{previewKecName || "-"}</b>
                </div>
              </div>
            </div>

            <div className="vd-previewWrap">
              <div className="vd-docShell">
                <div className="vd-previewBox">
                  {!previewUrl ? (
                    <div className="vd-previewEmpty">
                      <FiFileText className="vd-previewEmptyIcon" />
                      <div>Berkas tidak tersedia.</div>
                    </div>
                  ) : previewMime?.startsWith("image/") ? (
                    <img
                      className="vd-img"
                      src={previewUrl}
                      alt={previewName}
                    />
                  ) : (
                    <iframe
                      className="vd-iframe"
                      src={previewUrl}
                      title={previewName}
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="vd-previewFooter">
                  <div className="vd-verifyActions">
                    <button
                      className="vd-miniBtn vd-miniReject"
                      type="button"
                      onClick={() => updateVerification("ditolak")}
                      disabled={verifyBusy}
                    >
                      Tolak
                    </button>

                    <button
                      className="vd-miniBtn vd-miniApprove"
                      type="button"
                      onClick={() => updateVerification("disetujui")}
                      disabled={verifyBusy}
                    >
                      Setuju
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
