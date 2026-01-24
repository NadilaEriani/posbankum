import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiX, FiFileText, FiFile } from "react-icons/fi";
import "./dataPosbankum.css";

export default function DataPosbankum() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [kecamatan, setKecamatan] = useState("");

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

  const data = useMemo(
    () => [
      { id: 1, name: "kelurahan Kampung Tengah", completeness: "complete" },
      { id: 2, name: "kelurahan Harjosari", completeness: "complete" },
      { id: 3, name: "kelurahan Sungaiukai", completeness: "incomplete" },
      { id: 4, name: "kelurahan Padang Terubuk", completeness: "incomplete" },
      { id: 5, name: "kelurahan Sukajadi", completeness: "complete" },
      { id: 6, name: "kelurahan Marpoyan", completeness: "incomplete" },
    ],
    [],
  );

  // Dummy detail rows (sesuai wireframe)
  const detailRows = useMemo(
    () => [
      { kategori: "SK Posbankum", tanggal: "12 Mei 2025", status: "setuju" },
      { kategori: "SK Kab/Kota", tanggal: "12 Mei 2025", status: "setuju" },
      {
        kategori: "Dokumentasi Sarpras",
        tanggal: "12 Mei 2025",
        status: "tolak",
      },
      { kategori: "Tagging Area", tanggal: "12 Mei 2025", status: "tolak" },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return data.filter((item) => {
      const okTab = tab === "all" ? true : item.completeness === tab;
      const okQ = !query ? true : item.name.toLowerCase().includes(query);
      const okKab = kabupaten ? true : true;
      const okKec = kecamatan ? true : true;
      return okTab && okQ && okKab && okKec;
    });
  }, [data, q, tab, kabupaten, kecamatan]);

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

  return (
    <div className="dp">
      {/* 3 box atas */}
      <div className="dp-topBoxes">
        <div className="dp-topBox tone-green">
          <div className="dp-topTitle">Posbankum Aktif</div>
          <div className="dp-topValue">128</div>
        </div>
        <div className="dp-topBox tone-yellow">
          <div className="dp-topTitle">Menunggu Verifikasi</div>
          <div className="dp-topValue">14</div>
        </div>
        <div className="dp-topBox tone-blue">
          <div className="dp-topTitle">Data Tidak Lengkap</div>
          <div className="dp-topValue">22</div>
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
              value={kabupaten}
              onChange={(e) => setKabupaten(e.target.value)}
              className="dp-selectInput"
            >
              <option value="">Pilih Kabupaten</option>
              <option value="Pekanbaru">Pekanbaru</option>
              <option value="Kampar">Kampar</option>
              <option value="Siak">Siak</option>
            </select>
            {kabupaten && (
              <button
                className="dp-clearBtn"
                type="button"
                onClick={() => setKabupaten("")}
                aria-label="Clear kabupaten"
              >
                <FiX />
              </button>
            )}
          </div>

          <div className="dp-select">
            <select
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
              className="dp-selectInput"
            >
              <option value="">Pilih Kecamatan</option>
              <option value="Sukajadi">Sukajadi</option>
              <option value="Marpoyan">Marpoyan</option>
              <option value="Tenayan">Tenayan</option>
            </select>
            {kecamatan && (
              <button
                className="dp-clearBtn"
                type="button"
                onClick={() => setKecamatan("")}
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
        {filtered.map((item) => (
          <div key={item.id} className="dp-row">
            <div className="dp-leftBlock" />
            <div className="dp-rowTitle">{item.name}</div>

            <button
              className="dp-rowBtn"
              type="button"
              aria-label="Detail"
              onClick={() => openDetail(item)}
            >
              <FiFileText />
            </button>
          </div>
        ))}
      </div>

      {/* ===== MODAL DETAIL (wireframe) ===== */}
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
                  {selected?.name ?? "Detail"}
                </div>

                {/* badge status kelurahan (contoh: Lengkap / Menunggu) */}
                <span
                  className={`dp-headBadge ${selected?.completeness === "complete" ? "is-ok" : "is-warn"}`}
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
                          className={`dp-status ${r.status === "setuju" ? "is-ok" : "is-no"}`}
                        >
                          {r.status === "setuju" ? "Setuju" : "Tolak"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="dp-actBtn"
                          type="button"
                          aria-label="Buka dokumen"
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
