import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiX, FiFileText, FiFile } from "react-icons/fi";
import "./dataPosbankum.css";
import { supabase } from "../../lib/supabaseClient";

const BUCKET = "posbankum-docs";

export default function DataPosbankum() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [kabupatenId, setKabupatenId] = useState("");
  const [kecamatanId, setKecamatanId] = useState("");

  const [kabupatenOpts, setKabupatenOpts] = useState([]);
  const [kecamatanOpts, setKecamatanOpts] = useState([]);

  const [rows, setRows] = useState([]);
  const [uploadsByPos, setUploadsByPos] = useState({});

  const [stats, setStats] = useState({
    aktif: 0,
    menunggu: 0,
    tidakLengkap: 0,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Modal detail
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Modal preview file
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [previewName, setPreviewName] = useState("");

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

  // map variasi nama kategori → kunci kanonik
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

      // === SARPRAS (Dokumentasi Sarpras)
      "dokumentasi sarpras": "sarpras",
      dokumentasi_sarpras: "sarpras",
      "dok sarpras": "sarpras",
      sarpras: "sarpras",

      // === TAGGING AREA
      "tagging area": "tagging_area",
      "tag area": "tagging_area",
      tagging_area: "tagging_area",
    }),
    [],
  );

  const canonKategori = (k) => {
    const n = norm(k);
    return KATEGORI_ALIASES[n] ?? n; // kalau tidak ada di alias, pakai normalisasi
  };

  const REQUIRED = useMemo(
    () => [
      { label: "SK Posbankum", key: "sk_posbankum" },
      { label: "SK Kab/Kota", key: "sk_kadarkum" },
      { label: "Dokumentasi Sarpras", key: "sarpras" },
      { label: "Tagging Area", key: "tagging_area" },
    ],
    [],
  );

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Load kabupaten
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

  // Load kecamatan berdasarkan kabupaten
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

  const stripBucketPrefix = (p) => {
    const s = String(p || "");
    if (!s) return "";
    // kalau tersimpan "posbankum-docs/xxx.pdf", buang prefix bucket
    if (s.startsWith(`${BUCKET}/`)) return s.slice(BUCKET.length + 1);
    return s;
  };

  const openFile = async (row) => {
    setErr("");

    // row = { path, mime_type, nama_berkas } (kita kirim dari detailRows)
    const raw = String(row?.path || "");
    if (!raw) return;

    let url = raw;

    // kalau bukan URL publik → buat signed url dari storage
    if (!/^https?:\/\//i.test(raw)) {
      const objectPath = stripBucketPrefix(raw);

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60 * 10);

      if (error) {
        setErr(error.message);
        return;
      }

      url = data?.signedUrl || "";
    }

    setPreviewUrl(url);
    setPreviewMime(row?.mime_type || "");
    setPreviewName(row?.nama_berkas || "Berkas");
    setPreviewOpen(true);
  };

  // hitung completeness dari uploads (per posbankum)
  const computeCompleteness = (uploads = []) => {
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

    const ok = REQUIRED.every((req) => {
      const u = latestByKey[req.key];
      return (
        u && normalizeStatus(u.status_verifikasi ?? u.status) === "disetujui"
      );
    });

    return ok ? "complete" : "incomplete";
  };

  // Fetch posbankum + uploads
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
          // ambil semua kolom biar aman jika nama kolom beda (tgl_upload vs created_at, path_berkas vs path, dll)
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
          completeness: computeCompleteness(grouped[r.id_posbankum] ?? []),
        }));

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
      } catch (e) {
        setErr(e?.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, [kabupatenId, kecamatanId, debouncedQ, REQUIRED, KATEGORI_ALIASES]);

  const filtered = useMemo(() => {
    return rows.filter((item) =>
      tab === "all" ? true : item.completeness === tab,
    );
  }, [rows, tab]);

  const openDetail = (item) => {
    setSelected(item);
    setOpen(true);
  };

  const closeDetail = () => {
    setOpen(false);
    setSelected(null);
  };

  // Lock scroll + ESC to close
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Modal rows: kategori wajib + upload terbaru per kategori (pakai kunci kanonik)
  const detailRows = useMemo(() => {
    const pid = selected?.id_posbankum;
    if (!pid) return [];

    const ups = uploadsByPos[pid] ?? [];
    const latest = {};

    for (const u of ups) {
      const key = canonKategori(u?.kategori);
      if (!key) continue;

      const prev = latest[key];
      const ts = pickTimestamp(u);
      if (!prev) latest[key] = u;
      else if (new Date(ts || 0) > new Date(pickTimestamp(prev) || 0))
        latest[key] = u;
    }

    return REQUIRED.map((req) => {
      const u = latest[req.key];
      const st = normalizeStatus(u?.status_verifikasi ?? u?.status);
      const path = pickPath(u);

      return {
        kategori: req.label,
        tanggal: u ? formatTanggal(pickTimestamp(u)) : "-",
        status: st,
        path,
        mime_type: u?.mime_type ?? "",
        nama_berkas: u?.nama_berkas ?? "",
      };
    });
  }, [selected, uploadsByPos, REQUIRED]);

  return (
    <div className="dp">
      {err && (
        <div style={{ marginBottom: 12, color: "#b42318", fontSize: 14 }}>
          {err}
        </div>
      )}

      {/* 3 box atas */}
      <div className="dp-topBoxes">
        <div className="dp-topBox tone-green">
          <div className="dp-topTitle">Posbankum Aktif</div>
          <div className="dp-topValue">{stats.aktif}</div>
        </div>
        <div className="dp-topBox tone-yellow">
          <div className="dp-topTitle">Menunggu Verifikasi</div>
          <div className="dp-topValue">{stats.menunggu}</div>
        </div>
        <div className="dp-topBox tone-blue">
          <div className="dp-topTitle">Data Tidak Lengkap</div>
          <div className="dp-topValue">{stats.tidakLengkap}</div>
        </div>
      </div>

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

        <div className="dp-filterRow">
          <div className="dp-select">
            <select
              value={kabupatenId}
              onChange={(e) => setKabupatenId(e.target.value)}
              className="dp-selectInput"
            >
              <option value="">Pilih Kabupaten</option>
              {kabupatenOpts.map((k) => (
                <option key={k.id_kabupaten} value={k.id_kabupaten}>
                  {k.nama}
                </option>
              ))}
            </select>

            {kabupatenId && (
              <button
                className="dp-clearBtn"
                type="button"
                onClick={() => setKabupatenId("")}
                aria-label="Clear kabupaten"
              >
                <FiX />
              </button>
            )}
          </div>

          <div className="dp-select">
            <select
              value={kecamatanId}
              onChange={(e) => setKecamatanId(e.target.value)}
              className="dp-selectInput"
              disabled={!kabupatenId}
              title={!kabupatenId ? "Pilih kabupaten dulu" : ""}
            >
              <option value="">Pilih Kecamatan</option>
              {kecamatanOpts.map((kc) => (
                <option key={kc.id_kecamatan} value={kc.id_kecamatan}>
                  {kc.nama}
                </option>
              ))}
            </select>

            {kecamatanId && (
              <button
                className="dp-clearBtn"
                type="button"
                onClick={() => setKecamatanId("")}
                aria-label="Clear kecamatan"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* List */}
      <div className="dp-list">
        {loading ? (
          <div style={{ padding: 16, fontSize: 14 }}>Memuat data...</div>
        ) : filtered.length ? (
          filtered.map((item) => (
            <div key={item.id_posbankum} className="dp-row">
              <div className="dp-leftBlock" />
              <div className="dp-rowTitle">{item.nama}</div>

              <button
                className="dp-rowBtn"
                type="button"
                aria-label="Detail"
                onClick={() => openDetail(item)}
              >
                <FiFileText />
              </button>
            </div>
          ))
        ) : (
          <div style={{ padding: 16, fontSize: 14 }}>Data tidak ditemukan.</div>
        )}
      </div>

      {/* ===== MODAL DETAIL ===== */}
      {open && (
        <div
          className="dp-modalOverlay"
          onMouseDown={closeDetail}
          role="dialog"
          aria-modal="true"
        >
          <div className="dp-modal" onMouseDown={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="dp-modalHead">
              <div className="dp-modalTitleRow">
                <div className="dp-modalTitle">
                  {selected?.nama ?? "Detail"}
                </div>

                <span
                  className={`dp-headBadge ${
                    selected?.completeness === "complete" ? "is-ok" : "is-warn"
                  }`}
                >
                  {selected?.completeness === "complete"
                    ? "Lengkap"
                    : "Tidak Lengkap"}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="dp-modalTableWrap">
              <table className="dp-modalTable">
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th>Tanggal Unggah</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {detailRows.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.kategori}</td>
                      <td>{r.tanggal}</td>
                      <td>
                        <span
                          className={`dp-status ${
                            r.status === "disetujui"
                              ? "is-ok"
                              : r.status === "ditolak"
                                ? "is-no"
                                : "is-warn"
                          }`}
                        >
                          {r.status === "disetujui"
                            ? "Setuju"
                            : r.status === "ditolak"
                              ? "Tolak"
                              : "Menunggu"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="dp-actBtn"
                          type="button"
                          aria-label="Buka dokumen"
                          disabled={!r.path}
                          title={!r.path ? "Belum ada berkas" : "Buka berkas"}
                          onClick={() => r.path && openFile(r)}
                        >
                          <FiFile />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="dp-modalFoot">
              <button
                className="dp-backBtn"
                type="button"
                onClick={closeDetail}
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
      {previewOpen && (
        <div
          className="dp-modalOverlay"
          onMouseDown={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="dp-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="dp-modalHead">
              <div className="dp-modalTitleRow">
                <div className="dp-modalTitle">
                  {previewName || "Preview Berkas"}
                </div>
                <button
                  className="dp-clearBtn"
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Tutup"
                  style={{ marginLeft: "auto" }}
                >
                  <FiX />
                </button>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {!previewUrl ? (
                <div style={{ fontSize: 14 }}>Berkas tidak tersedia.</div>
              ) : previewMime?.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={previewName}
                  style={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: 12,
                    background: "#f2f2f2",
                  }}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewName}
                  style={{
                    width: "100%",
                    height: "70vh",
                    border: "none",
                    borderRadius: 12,
                    background: "#f2f2f2",
                  }}
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
