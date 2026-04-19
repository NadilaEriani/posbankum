import { useEffect, useMemo, useRef, useState } from "react";

import {
  FiSearch,
  FiX,
  FiCalendar,
  FiMapPin,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiChevronDown,
  FiFilter,
  FiCheck,
} from "react-icons/fi";

import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { supabase } from "../../lib/supabaseClient";
import SuccessToast from "../../components/ui/SuccessToast";
import "./laporanKegiatan.css";

const TABS = [
  { key: "all", label: "Semua Pengajuan" },
  { key: "Diterima", label: "Pengajuan Kegiatan Diterima" },
  { key: "Ditolak", label: "Pengajuan Kegiatan Ditolak" },
];

const BUCKET_THUMB = "kegiatan-thumbnails";

/* =========================
   Custom Dropdown (Kab/Kec)
========================= */
function RkDropdown({
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
    <div className={`rk-dd ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="rk-ddBtn"
        onClick={() => !disabled && setOpen((s) => !s)}
        aria-expanded={open}
        disabled={disabled}
      >
        <FiFilter className="rk-ddIcon" />
        <span className={`rk-ddText ${selectedLabel ? "" : "is-placeholder"}`}>
          {selectedLabel || placeholder}
        </span>
        <FiChevronDown className={`rk-ddChevron ${open ? "is-open" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="rk-ddMenu" role="listbox">
          {(options || []).map((opt) => {
            const isActive = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`rk-ddItem ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isActive && <FiCheck className="rk-ddCheck" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LaporanKegiatan() {
  // filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tab, setTab] = useState("all");
  const [kabupatenId, setKabupatenId] = useState("");
  const [kecamatanId, setKecamatanId] = useState("");

  // dropdown options
  const [kabupatenOpts, setKabupatenOpts] = useState([]);
  const [kecamatanOpts, setKecamatanOpts] = useState([]);

  // data
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // stats (3 card besar)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  // pagination (UI mirip gambar)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 4;

  // verify modal
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const getThumbUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(BUCKET_THUMB).getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const formatDate = (v) => {
    if (!v) return "-";
    try {
      return new Date(v).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  // status untuk tampilan (biar konsisten sama desain)
  const uiStatusKey = (statusDb) => {
    const s = norm(statusDb);
    if (["diterima", "disetujui", "approve", "approved"].includes(s))
      return "approved";
    if (["ditolak", "tolak", "reject", "rejected"].includes(s))
      return "rejected";
    return "pending";
  };

  const uiStatusLabel = (statusDb) => {
    const k = uiStatusKey(statusDb);
    if (k === "approved") return "Disetujui";
    if (k === "rejected") return "Ditolak";
    return "Menunggu";
  };

  // ICON untuk status pill (Figma)
  const uiStatusIcon = (statusDb) => {
    const k = uiStatusKey(statusDb);
    if (k === "approved") return <BsCheck2Circle className="rk-pillIc" />;
    if (k === "rejected") return <AiOutlineCloseCircle className="rk-pillIc" />;
    return <FiClock className="rk-pillIc" />;
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // load kabupaten
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("kabupaten")
        .select("id_kabupaten,nama")
        .order("nama", { ascending: true });

      if (error) {
        setErr(error.message);
        return;
      }
      setKabupatenOpts(data || []);
    })();
  }, []);

  // load kecamatan by kabupaten
  useEffect(() => {
    (async () => {
      setKecamatanId("");
      setKecamatanOpts([]);
      if (!kabupatenId) return;

      const { data, error } = await supabase
        .from("kecamatan")
        .select("id_kecamatan,nama")
        .eq("id_kabupaten", kabupatenId)
        .order("nama", { ascending: true });

      if (error) {
        setErr(error.message);
        return;
      }
      setKecamatanOpts(data || []);
    })();
  }, [kabupatenId]);

  // fetch kegiatan + join posbankum (LOGIKA ASLI TETAP)
  const fetchRows = async () => {
    setLoading(true);
    setErr("");

    try {
      let query = supabase
        .from("kegiatan")
        .select(
          `
          id_kegiatan,
          id_posbankum,
          judul,
          deskripsi,
          catatan,
          status,
          tgl_upload,
          tgl_mulai,
          tgl_selesai,
          thumbnail_path,
          posbankum:posbankum (
            nama,
            kabupaten:kabupaten ( nama ),
            kecamatan:kecamatan ( nama )
          )
        `,
        )
        .order("tgl_upload", { ascending: false });

      // tab (server-side seperti code kamu)
      if (tab !== "all") query = query.eq("status", tab);

      // filter kab/kec (server-side on relation)
      if (kabupatenId) query = query.eq("posbankum.id_kabupaten", kabupatenId);
      if (kecamatanId) query = query.eq("posbankum.id_kecamatan", kecamatanId);

      const { data, error } = await query;
      if (error) throw error;

      setRows(data || []);
    } catch (e) {
      setErr(e?.message || "Gagal memuat data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, kabupatenId, kecamatanId]);

  // fetch stats untuk 3 card besar (tanpa ganggu fetchRows)
  useEffect(() => {
    (async () => {
      try {
        const makeBase = () => {
          let q0 = supabase
            .from("kegiatan")
            .select("id_kegiatan, posbankum!inner(id_kabupaten,id_kecamatan)", {
              count: "exact",
              head: true,
            });

          if (kabupatenId) q0 = q0.eq("posbankum.id_kabupaten", kabupatenId);
          if (kecamatanId) q0 = q0.eq("posbankum.id_kecamatan", kecamatanId);
          return q0;
        };

        const totalRes = await makeBase();
        const total = totalRes?.count ?? 0;

        const okRes = await makeBase().eq("status", "Diterima");
        const approved = okRes?.count ?? 0;

        const noRes = await makeBase().eq("status", "Ditolak");
        const rejected = noRes?.count ?? 0;

        const pending = Math.max(0, total - approved - rejected);

        setStats({ pending, approved, rejected });
      } catch {
        // ignore
      }
    })();
  }, [kabupatenId, kecamatanId]);

  // search (client-side: judul + posbankum + deskripsi)
  const filtered = useMemo(() => {
    const s = debouncedQ.toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const judul = String(r?.judul || "").toLowerCase();
      const namaPos = String(r?.posbankum?.nama || "").toLowerCase();
      const desk = String(r?.deskripsi || "").toLowerCase();
      return judul.includes(s) || namaPos.includes(s) || desk.includes(s);
    });
  }, [rows, debouncedQ]);

  // pagination (reset kalau filter/search berubah)
  useEffect(() => {
    setPage(1);
  }, [tab, kabupatenId, kecamatanId, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(Math.max(page, 1), totalPages);
  const pageItems = useMemo(() => {
    const start = (pageClamped - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageClamped]);

  const openVerify = (item) => {
    setSelected(item);
    setVerifyOpen(true);
    setRejectOpen(false);
    setRejectNote("");
    setErr("");
  };

  const closeVerify = () => {
    if (saving) return;
    setVerifyOpen(false);
    setSelected(null);
    setRejectOpen(false);
    setRejectNote("");
  };

  const openReject = () => {
    setRejectNote(selected?.catatan || "");
    setRejectOpen(true);
    setErr("");
  };

  const closeReject = () => {
    if (saving) return;
    setRejectOpen(false);
  };

  // ESC close modal
  useEffect(() => {
    if (!verifyOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeVerify();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyOpen, saving]);

  const approve = async () => {
    if (!selected?.id_kegiatan) return;
    setSaving(true);
    setErr("");

    try {
      const { error } = await supabase
        .from("kegiatan")
        .update({ status: "Diterima", catatan: null })
        .eq("id_kegiatan", selected.id_kegiatan);

      if (error) throw error;

      closeVerify();
      await fetchRows();
      setSuccessMessage("Pengajuan kegiatan berhasil disetujui!");
    } catch (e) {
      setErr(e?.message || "Gagal menyetujui.");
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!selected?.id_kegiatan) return;

    if (!rejectNote.trim()) {
      setErr("Catatan penolakan wajib diisi.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      const { error } = await supabase
        .from("kegiatan")
        .update({ status: "Ditolak", catatan: rejectNote.trim() })
        .eq("id_kegiatan", selected.id_kegiatan);

      if (error) throw error;

      closeVerify();
      await fetchRows();
      setSuccessMessage("Pengajuan kegiatan berhasil ditolak!");
    } catch (e) {
      setErr(e?.message || "Gagal menolak.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rk-wrap">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      <h1 className="rk-title">Laporan Kegiatan Posbankum</h1>
      <br />
      {/* ===== 3 CARD BESAR (mirip gambar) ===== */}
      <div className="rk-topCards">
        <div className="rk-topCard">
          <div className="rk-topIcon rk-topIcon--wait" aria-hidden="true">
            <FiClock />
          </div>
          <div className="rk-topInfo">
            <div className="rk-topLabel">Menunggu Persetujuan</div>
            <div className="rk-topValue">{stats.pending}</div>
            <div className="rk-topHint">Kegiatan Pending</div>
          </div>
        </div>

        <div className="rk-topCard">
          <div className="rk-topIcon rk-topIcon--ok" aria-hidden="true">
            <BsCheck2Circle />
          </div>
          <div className="rk-topInfo">
            <div className="rk-topLabel">Disetujui</div>
            <div className="rk-topValue">{stats.approved}</div>
            <div className="rk-topHint">Kegiatan Approved</div>
          </div>
        </div>

        <div className="rk-topCard">
          <div className="rk-topIcon rk-topIcon--no" aria-hidden="true">
            <AiOutlineCloseCircle />
          </div>
          <div className="rk-topInfo">
            <div className="rk-topLabel">Ditolak</div>
            <div className="rk-topValue">{stats.rejected}</div>
            <div className="rk-topHint">Perlu Review</div>
          </div>
        </div>
      </div>

      {/* ===== PANEL (tabs + search) ===== */}
      <div className="rk-panel">
        {/* tabs */}
        <div className="rk-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`rk-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rk-divider" />

        {/* toolbar */}
        <div className="rk-toolbar">
          <div className="rk-search">
            <FiSearch className="rk-ic rk-ic-search" />
            <input
              placeholder="Pencarian..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                className="rk-clear"
                type="button"
                onClick={() => setQ("")}
              >
                <FiX />
              </button>
            )}
          </div>

          {/* ✅ FIX: ganti select jadi custom dropdown */}
          <div className="rk-filters">
            <RkDropdown
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

            <RkDropdown
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
                className="rk-resetBtn"
                type="button"
                onClick={() => {
                  setKabupatenId("");
                  setKecamatanId("");
                  setKecamatanOpts([]);
                }}
                title="Reset filter"
                aria-label="Reset filter"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>

      {err && <div className="rk-error">{err}</div>}

      {/* ===== LIST CARD KEGIATAN ===== */}
      <div className="rk-list">
        {loading ? (
          <div className="rk-empty">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="rk-empty">Tidak ada data.</div>
        ) : (
          pageItems.map((item) => {
            const thumbUrl = getThumbUrl(item.thumbnail_path);
            const pos = item?.posbankum?.nama || "-";
            const kab = item?.posbankum?.kabupaten?.nama || "-";
            const kec = item?.posbankum?.kecamatan?.nama || "-";
            const dateText = formatDate(item.tgl_mulai || item.tgl_upload);

            const skey = uiStatusKey(item.status);
            const pillLabel = uiStatusLabel(item.status);

            return (
              <div className="rk-itemCard" key={item.id_kegiatan}>
                <div
                  className="rk-thumb"
                  style={
                    thumbUrl
                      ? { backgroundImage: `url(${thumbUrl})` }
                      : undefined
                  }
                />

                <div className="rk-body">
                  <div className="rk-head">
                    <div className="rk-judul">{item.judul}</div>

                    <span className={`rk-pill rk-pill--${skey}`}>
                      {uiStatusIcon(item.status)}
                      {pillLabel}
                    </span>
                  </div>

                  <div className="rk-meta">
                    <FiMapPin className="rk-ic rk-ic-loc" />
                    <span className="rk-metaText">{pos}</span>
                    <span className="rk-dot">•</span>
                    <span className="rk-metaText">{kab}</span>
                    <span className="rk-dot">•</span>
                    <span className="rk-metaText">{kec}</span>
                  </div>

                  <div className="rk-meta">
                    <FiCalendar className="rk-ic rk-ic-cal" />
                    <span className="rk-metaText">{dateText}</span>
                  </div>

                  <div className="rk-desc">{item.deskripsi || "-"}</div>
                </div>

                <div className="rk-actions">
                  <button
                    className="rk-detailBtn"
                    type="button"
                    onClick={() => openVerify(item)}
                  >
                    <FiEye />
                    <span>Detail</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== PAGINATION (mirip gambar) ===== */}
      {filtered.length > 0 && (
        <div className="rk-pagination">
          <button
            className="rk-pageNav"
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
              className={`rk-pageBtn ${pageClamped === n ? "active" : ""}`}
              type="button"
              onClick={() => setPage(n)}
              disabled={n > totalPages}
            >
              {n}
            </button>
          ))}

          <button
            className="rk-pageNav"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageClamped >= totalPages}
            aria-label="Next"
          >
            <FiChevronRight />
          </button>
        </div>
      )}

      {/* ===== POPUP DETAIL ===== */}
      {verifyOpen && selected && (
        <div
          className="rk-overlay"
          onMouseDown={closeVerify}
          role="dialog"
          aria-modal="true"
        >
          <div className="rk-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button
              className="rk-close"
              type="button"
              onClick={closeVerify}
              disabled={saving}
              title="Tutup"
              aria-label="Tutup"
            >
              <FiX />
            </button>

            <div className="rk-modal-head">
              <div className="rk-modal-title">{selected.judul || "-"}</div>

              <div className="rk-modal-meta">
                <span className="rk-metaText">
                  {selected?.posbankum?.nama || "-"}
                </span>
                <span className="rk-dot">•</span>
                <FiCalendar className="rk-ic rk-ic-cal" />
                <span className="rk-metaText">
                  {formatDate(selected.tgl_upload)}
                </span>
              </div>

              <div className="rk-modal-loc">
                <FiMapPin className="rk-ic rk-ic-loc" />
                <span className="rk-locText">
                  {selected?.posbankum?.kecamatan?.nama || "-"}
                </span>
                <span className="rk-dot">•</span>
                <span className="rk-locText">
                  {selected?.posbankum?.kabupaten?.nama || "-"}
                </span>
              </div>
            </div>

            <div className="rk-modal-image">
              {getThumbUrl(selected.thumbnail_path) ? (
                <img
                  className="rk-modal-img"
                  src={getThumbUrl(selected.thumbnail_path)}
                  alt="thumbnail"
                />
              ) : (
                <div className="rk-modal-img-empty">Tidak ada thumbnail</div>
              )}
            </div>

            <div className="rk-modal-dates">
              <div className="rk-dateItem">
                <span className="rk-dateLabel">Tanggal Mulai</span>
                <span className="rk-dateValue">
                  {formatDate(selected.tgl_mulai)}
                </span>
              </div>

              <div className="rk-dateItem">
                <span className="rk-dateLabel">Tanggal Selesai</span>
                <span className="rk-dateValue">
                  {formatDate(selected.tgl_selesai)}
                </span>
              </div>
            </div>

            <div className="rk-modal-desc">
              <div className="rk-descTitle">Isi</div>
              <div className="rk-descText">{selected.deskripsi || "-"}</div>
            </div>

            {uiStatusKey(selected.status) === "rejected" &&
              selected.catatan && (
                <div className="rk-modal-note">
                  <div className="rk-note-title">Catatan Penolakan</div>
                  <div className="rk-note-text">{selected.catatan}</div>
                </div>
              )}

            <div className="rk-modal-infoRow">
              <div className="rk-infoCard">
                <div className="rk-infoLabel">Status</div>
                <span
                  className={`rk-pill rk-pill--${uiStatusKey(selected.status)}`}
                >
                  {uiStatusIcon(selected.status)}
                  {uiStatusLabel(selected.status)}
                </span>
              </div>
            </div>

            {uiStatusKey(selected.status) === "pending" && (
              <div className="rk-modal-actions">
                <button
                  className="rk-btn rk-btn-reject"
                  type="button"
                  onClick={openReject}
                  disabled={saving}
                >
                  Tolak
                </button>

                <button
                  className="rk-btn rk-btn-approve"
                  type="button"
                  onClick={approve}
                  disabled={saving}
                >
                  Terima
                </button>
              </div>
            )}

            {rejectOpen && (
              <div className="rk-reject-overlay" onMouseDown={closeReject}>
                <div
                  className="rk-reject-modal"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="rk-reject-head">
                    <div className="rk-reject-title">Catatan Penolakan</div>

                    <button
                      className="rk-close rk-close-sm"
                      type="button"
                      onClick={closeReject}
                      disabled={saving}
                      title="Tutup"
                      aria-label="Tutup"
                    >
                      <FiX />
                    </button>
                  </div>

                  <textarea
                    className="rk-reject-textarea"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Tulis catatan penolakan..."
                  />

                  <div className="rk-reject-actions">
                    <button
                      className="rk-btn rk-btn-neutral"
                      type="button"
                      onClick={closeReject}
                      disabled={saving}
                    >
                      Batal
                    </button>

                    <button
                      className="rk-btn rk-btn-primaryDark"
                      type="button"
                      onClick={reject}
                      disabled={saving}
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
