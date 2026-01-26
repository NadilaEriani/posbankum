import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiX, FiFileText, FiFile } from "react-icons/fi";
import "./dataPosbankum.css";
import { supabase } from "../../lib/supabaseClient"; // ✅ sesuai supabaseClient.js kamu

export default function DataPosbankum() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Simpan ID (uuid) supaya filter benar ke DB
  const [kabupatenId, setKabupatenId] = useState("");
  const [kecamatanId, setKecamatanId] = useState("");

  const [kabupatenOpts, setKabupatenOpts] = useState([]);
  const [kecamatanOpts, setKecamatanOpts] = useState([]);

  const [rows, setRows] = useState([]); // posbankum list (dengan completeness)
  const [uploadsByPos, setUploadsByPos] = useState({}); // { [id_posbankum]: data_posbankum[] }

  const [stats, setStats] = useState({
    aktif: 0,
    menunggu: 0,
    tidakLengkap: 0,
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // === MODAL STATE
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const tabs = useMemo(
    () => [
      { key: "all", label: "Semua Posbankum" },
      { key: "complete", label: "Posbankum Data Lengkap" },
      { key: "incomplete", label: "Posbankum Data Tidak lengkap" },
    ],
    [],
  );

  // kategori wajib (samakan dengan data yang kamu upload)
  const REQUIRED_KATEGORI = useMemo(
    () => [
      "SK Posbankum",
      "SK Kab/Kota",
      "Dokumentasi Sarpras",
      "Tagging Area",
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
    // jaga-jaga kalau ada data lama "setuju/tolak"
    if (!s) return "menunggu";
    const x = String(s).toLowerCase();
    if (x === "setuju") return "disetujui";
    if (x === "tolak") return "ditolak";
    return x;
  };

  // hitung completeness dari data_posbankum (per posbankum)
  const computeCompleteness = (uploads = []) => {
    const latestByKategori = {};
    for (const u of uploads) {
      const k = u.kategori ?? "";
      if (!k) continue;

      const prev = latestByKategori[k];
      if (!prev) latestByKategori[k] = u;
      else {
        const a = new Date(prev.tgl_upload).getTime();
        const b = new Date(u.tgl_upload).getTime();
        if (b > a) latestByKategori[k] = u;
      }
    }

    // lengkap = semua REQUIRED_KATEGORI ada & statusnya disetujui
    const ok = REQUIRED_KATEGORI.every((k) => {
      const u = latestByKategori[k];
      return u && normalizeStatus(u.status_verifikasi) === "disetujui";
    });

    return ok ? "complete" : "incomplete";
  };

  // Fetch posbankum + uploads sesuai filter
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

        // ambil uploads untuk posbankum yang tampil
        let uploads = [];
        if (ids.length) {
          const { data: up, error: upErr } = await supabase
            .from("data_posbankum")
            .select(
              "id_data,id_posbankum,kategori,tgl_upload,status_verifikasi,path_berkas",
            )
            .in("id_posbankum", ids);

          if (upErr) throw upErr;
          uploads = up ?? [];
        }

        // group uploads by posbankum
        const grouped = {};
        for (const u of uploads) {
          const pid = u.id_posbankum;
          if (!grouped[pid]) grouped[pid] = [];
          grouped[pid].push(u);
        }

        const enriched = (pos ?? []).map((r) => ({
          ...r,
          completeness: computeCompleteness(grouped[r.id_posbankum] ?? []),
        }));

        // stats (berdasarkan data yang sedang tampil)
        const aktif = enriched.length;
        const menunggu = uploads.filter(
          (u) => normalizeStatus(u.status_verifikasi) === "menunggu",
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
  }, [kabupatenId, kecamatanId, debouncedQ, REQUIRED_KATEGORI]);

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

  // Modal rows: pakai kategori wajib + ambil upload terbaru per kategori
  const detailRows = useMemo(() => {
    const pid = selected?.id_posbankum;
    if (!pid) return [];

    const ups = uploadsByPos[pid] ?? [];
    const latest = {};

    for (const u of ups) {
      const k = u.kategori ?? "";
      if (!k) continue;
      const prev = latest[k];
      if (!prev) latest[k] = u;
      else if (new Date(u.tgl_upload) > new Date(prev.tgl_upload))
        latest[k] = u;
    }

    return REQUIRED_KATEGORI.map((k) => {
      const u = latest[k];
      const st = normalizeStatus(u?.status_verifikasi);
      return {
        kategori: k,
        tanggal: u ? formatTanggal(u.tgl_upload) : "-",
        status: st, // disetujui / ditolak / menunggu
        path: u?.path_berkas ?? "",
      };
    });
  }, [selected, uploadsByPos, REQUIRED_KATEGORI]);

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
                          onClick={() =>
                            r.path && window.open(r.path, "_blank")
                          }
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
    </div>
  );
}
