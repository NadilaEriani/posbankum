import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiX, FiFileText, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import "./verifikasiDataPosbankum.css";

const BUCKET = "posbankum-docs";

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

  // === kategori wajib (KEY harus konsisten dengan data DB kamu)
  const REQUIRED = useMemo(
    () => [
      { label: "Sk Posbankum", key: "sk_posbankum" },
      { label: "Sk Kadarkum", key: "sk_kadarkum" },
      { label: "Sapras", key: "sarpras" }, // tampilan tetap "Sapras", key kita samakan ke "sarpras"
      { label: "Tagging Area", key: "tagging_area" },
    ],
    []
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
      "sk_posbankum": "sk_posbankum",
      "sk posbankum": "sk_posbankum",

      "sk_kadarkum": "sk_kadarkum",
      "sk kadarkum": "sk_kadarkum",
      "sk kab/kota": "sk_kadarkum",

      // penting: DB kamu ada yang pakai "sapras"
      "sarpras": "sarpras",
      "sapras": "sarpras",
      "dokumentasi sarpras": "sarpras",
      "dokumentasi sapras": "sarpras",

      "tagging_area": "tagging_area",
      "tagging area": "tagging_area",
    }),
    []
  );

  const canonKategori = (k) => {
    const n = norm(k);
    return KATEGORI_ALIASES[n] ?? n;
  };

  const normalizeStatus = (s) => {
    const x = norm(s);
    if (!x) return "menunggu";
    if (["setuju", "disetujui", "approved", "approve"].includes(x)) return "disetujui";
    if (["tolak", "ditolak", "rejected", "reject"].includes(x)) return "ditolak";
    return "menunggu";
  };

  const pickTimestamp = (u) => u?.tgl_upload ?? u?.created_at ?? u?.updated_at ?? null;
  const pickPath = (u) => u?.path_berkas ?? "";
  const pickMime = (u) => u?.mime_type ?? "";
  const pickName = (u) => u?.nama_berkas ?? "";

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

  // ===== load kecamatan by kabupaten
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

  // ===== build card view model
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
        };
      });

      return { ...p, docs };
    });
  }, [posList, uploadsByPos, REQUIRED, KATEGORI_ALIASES]);

  // ===== pagination
  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const pageClamped = Math.min(Math.max(page, 1), totalPages);
  const pageItems = useMemo(() => {
    const start = (pageClamped - 1) * PAGE_SIZE;
    return cards.slice(start, start + PAGE_SIZE);
  }, [cards, pageClamped]);

  // ===== preview (modal)
  const openPreview = async (doc) => {
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
  };

  // ESC close preview
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e) => e.key === "Escape" && closePreview();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  return (
    <div className="vd">
      {/* Top right user label (biar persis gambar) */}
      <div className="vd-topRight">
        <span className="vd-topIcon" />
        <span className="vd-topText">Hai Admin Kemenkumham</span>
      </div>

      <div className="vd-title">Verifikasi Data Posbankum</div>

      <div className="vd-panel">
        {/* toolbar */}
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
              <button className="vd-clearBtn" type="button" onClick={() => setQ("")}>
                <FiX />
              </button>
            )}
          </div>

          <div className="vd-filters">
            <div className="vd-select">
              <select
                className="vd-selectInput"
                value={kabupatenId}
                onChange={(e) => setKabupatenId(e.target.value)}
              >
                <option value="">Pilih Kabupaten</option>
                {kabupatenOpts.map((k) => (
                  <option key={k.id_kabupaten} value={k.id_kabupaten}>
                    {k.nama}
                  </option>
                ))}
              </select>
              {!!kabupatenId && (
                <button className="vd-clearBtn" type="button" onClick={() => setKabupatenId("")}>
                  <FiX />
                </button>
              )}
            </div>

            <div className="vd-select">
              <select
                className="vd-selectInput"
                value={kecamatanId}
                onChange={(e) => setKecamatanId(e.target.value)}
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
              {!!kecamatanId && (
                <button className="vd-clearBtn" type="button" onClick={() => setKecamatanId("")}>
                  <FiX />
                </button>
              )}
            </div>
          </div>
        </div>

        {err && <div className="vd-error">{err}</div>}

        {/* grid cards */}
        <div className="vd-grid">
          {loading ? (
            <div className="vd-loading">Memuat data...</div>
          ) : pageItems.length ? (
            pageItems.map((p) => (
              <div key={p.id_posbankum} className="vd-card">
                <div className="vd-cardTitle">{p.nama}</div>

                <div className="vd-docs">
                  {p.docs.map((d) => (
                    <div key={d.key} className="vd-docRow">
                      <span className="vd-dot" />
                      <span className="vd-docLabel">{d.label}</span>

                      <button
                        className="vd-docBtn"
                        type="button"
                        disabled={!d.path}
                        title={!d.path ? "Belum ada berkas" : "Preview berkas"}
                        onClick={() => openPreview(d)}
                      >
                        <FiFileText />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="vd-loading">Data tidak ditemukan.</div>
          )}
        </div>

        {/* pagination */}
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
      </div>

      {/* ===== Preview Modal (POPUP, bukan tab baru) ===== */}
      {previewOpen && (
        <div className="vd-overlay" onMouseDown={closePreview} role="dialog" aria-modal="true">
          <div className="vd-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="vd-modalHead">
              <span className="vd-modalIcon" />
              <span className="vd-modalTitle">{previewName || "Preview"}</span>

              <button className="vd-close" type="button" onClick={closePreview} aria-label="Tutup">
                <FiX />
              </button>
            </div>

            <div className="vd-previewWrap">
              <div className="vd-previewBox">
                {!previewUrl ? (
                  <div className="vd-previewEmpty">Berkas tidak tersedia.</div>
                ) : previewMime?.startsWith("image/") ? (
                  <img className="vd-img" src={previewUrl} alt={previewName} />
                ) : (
                  <iframe className="vd-iframe" src={previewUrl} title={previewName} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
