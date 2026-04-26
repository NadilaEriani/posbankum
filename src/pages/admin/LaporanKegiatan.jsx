import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiX,
  FiCalendar,
  FiMapPin,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiUsers,
  FiThumbsUp,
  FiThumbsDown,
  FiMessageSquare,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { supabase } from "../../lib/supabaseClient";
import SuccessToast from "../../components/ui/SuccessToast";
import RejectToast from "../../components/ui/RejectToast";
import "./laporanKegiatan.css";

const BUCKET_THUMB = "kegiatan-thumbnails";
const PAGE_SIZE = 6;

const TABS = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
];

const norm = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function uiStatusKey(statusDb) {
  const status = norm(statusDb);

  if (
    [
      "diterima",
      "disetujui",
      "approve",
      "approved",
      "valid",
      "selesai",
    ].includes(status)
  ) {
    return "approved";
  }

  if (["ditolak", "tolak", "reject", "rejected"].includes(status)) {
    return "rejected";
  }

  return "pending";
}

function uiStatusLabel(statusDb) {
  const key = uiStatusKey(statusDb);
  if (key === "approved") return "Disetujui";
  if (key === "rejected") return "Ditolak";
  return "Menunggu";
}

function uiStatusIcon(statusDb, className = "rk-statusIcon") {
  const key = uiStatusKey(statusDb);
  if (key === "approved") return <BsCheck2Circle className={className} />;
  if (key === "rejected") return <AiOutlineCloseCircle className={className} />;
  return <FiClock className={className} />;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCountLabel(value, suffix) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return `0 ${suffix}`;
  return `${n} ${suffix}`;
}

function safeText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isRejected(status) {
  return uiStatusKey(status) === "rejected";
}

export default function LaporanKegiatan() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const [successToast, setSuccessToast] = useState({ title: "", message: "" });
  const [rejectToast, setRejectToast] = useState("");

  const getThumbUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(BUCKET_THUMB).getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const fetchRows = async () => {
    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase
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
          lokasi,
          jumlah_peserta,
          anggota_terlibat,
          kategori,
          posbankum:posbankum (
            nama,
            nama_paralegal,
            kabupaten:kabupaten ( nama ),
            kecamatan:kecamatan ( nama )
          )
        `,
        )
        .order("tgl_upload", { ascending: false });

      if (error) throw error;
      setRows(data || []);
    } catch (error) {
      setRows([]);
      setErr(error?.message || "Gagal memuat data laporan kegiatan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedQ]);

  useEffect(() => {
    if (!detailOpen && !rejectOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (rejectOpen) closeRejectModal();
        else closeDetailModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, rejectOpen, saving]);

  const stats = useMemo(() => {
    const base = { total: rows.length, pending: 0, approved: 0, rejected: 0 };

    for (const row of rows) {
      const key = uiStatusKey(row?.status);
      if (key === "approved") base.approved += 1;
      else if (key === "rejected") base.rejected += 1;
      else base.pending += 1;
    }

    return base;
  }, [rows]);

  const searchedRows = useMemo(() => {
    const search = norm(debouncedQ);
    if (!search) return rows;

    return rows.filter((row) => {
      const haystack = [
        row?.judul,
        row?.deskripsi,
        row?.lokasi,
        row?.kategori,
        row?.posbankum?.nama,
        row?.posbankum?.kecamatan?.nama,
        row?.posbankum?.kabupaten?.nama,
      ]
        .map((item) => norm(item))
        .join(" ");

      return haystack.includes(search);
    });
  }, [rows, debouncedQ]);

  const tabCounts = useMemo(() => {
    const counts = {
      all: searchedRows.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of searchedRows) {
      const key = uiStatusKey(row?.status);
      counts[key] += 1;
    }

    return counts;
  }, [searchedRows]);

  const filteredRows = useMemo(() => {
    if (tab === "all") return searchedRows;
    return searchedRows.filter((row) => uiStatusKey(row?.status) === tab);
  }, [searchedRows, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageClamped = Math.min(Math.max(page, 1), totalPages);

  const pageItems = useMemo(() => {
    const start = (pageClamped - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, pageClamped]);

  const openDetailModal = (item) => {
    setSelected(item);
    setDetailOpen(true);
    setRejectOpen(false);
    setRejectNote("");
    setErr("");
  };

  const closeDetailModal = () => {
    if (saving) return;
    setDetailOpen(false);
    setRejectOpen(false);
    setRejectNote("");
    setSelected(null);
  };

  const openRejectModal = () => {
    setRejectNote(isRejected(selected?.status) ? selected?.catatan || "" : "");
    setRejectOpen(true);
    setErr("");
  };

  const closeRejectModal = () => {
    if (saving) return;
    setRejectOpen(false);
    setRejectNote("");
  };

  const resetFilters = () => {
    setQ("");
    setDebouncedQ("");
    setTab("all");
    setPage(1);
  };

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

      setDetailOpen(false);
      setRejectOpen(false);
      setRejectNote("");
      setSelected(null);
      await fetchRows();
      setSuccessToast({
        title: "Laporan Kegiatan Disetujui!",
        message: "Laporan kegiatan telah berhasil di setujui",
      });
    } catch (error) {
      setErr(error?.message || "Gagal menyetujui laporan kegiatan.");
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!selected?.id_kegiatan) return;

    const note = rejectNote.trim();
    if (!note) {
      setErr("Catatan penolakan wajib diisi.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      const { error } = await supabase
        .from("kegiatan")
        .update({ status: "Ditolak", catatan: note })
        .eq("id_kegiatan", selected.id_kegiatan);

      if (error) throw error;

      setDetailOpen(false);
      setRejectOpen(false);
      setRejectNote("");
      setSelected(null);
      await fetchRows();
      setRejectToast("Kegiatan Berhasil Ditolak");
    } catch (error) {
      setErr(error?.message || "Gagal menolak laporan kegiatan.");
    } finally {
      setSaving(false);
    }
  };

  const renderStatusPill = (status, extraClass = "") => {
    const key = uiStatusKey(status);

    return (
      <span className={`rk-statusPill is-${key} ${extraClass}`.trim()}>
        {uiStatusIcon(status)}
        {uiStatusLabel(status)}
      </span>
    );
  };

  const selectedThumb = selected ? getThumbUrl(selected.thumbnail_path) : null;
  const selectedStatusKey = uiStatusKey(selected?.status);
  const selectedPosName = safeText(selected?.posbankum?.nama);
  const selectedPelapor = safeText(
    selected?.posbankum?.nama_paralegal || selected?.posbankum?.nama,
  );
  const selectedLokasi = safeText(selected?.lokasi);
  const selectedPeserta = Number(selected?.jumlah_peserta);
  const selectedPesertaText = Number.isFinite(selectedPeserta)
    ? `${selectedPeserta} Orang`
    : "-";
  const selectedDokumentasi = selected?.thumbnail_path ? "1 Foto" : "0 Foto";

  return (
    <div className="rk-wrap">
      <SuccessToast
        title={successToast.title}
        message={successToast.message}
        onClose={() => setSuccessToast({ title: "", message: "" })}
      />
      <RejectToast message={rejectToast} onClose={() => setRejectToast("")} />

      <h1 className="rk-title">Laporan Kegiatan Posbankum</h1>

      <div className="rk-statGrid">
        <div className="rk-statCard is-total">
          <div className="rk-statIcon" aria-hidden="true">
            <FiFileText />
          </div>
          <div className="rk-statBody">
            <div className="rk-statLabel">Total Laporan</div>
            <div className="rk-statValue">{stats.total}</div>
          </div>
        </div>

        <div className="rk-statCard is-pending">
          <div className="rk-statIcon" aria-hidden="true">
            <FiClock />
          </div>
          <div className="rk-statBody">
            <div className="rk-statLabel">Menunggu</div>
            <div className="rk-statValue">{stats.pending}</div>
          </div>
        </div>

        <div className="rk-statCard is-approved">
          <div className="rk-statIcon" aria-hidden="true">
            <BsCheck2Circle />
          </div>
          <div className="rk-statBody">
            <div className="rk-statLabel">Disetujui</div>
            <div className="rk-statValue">{stats.approved}</div>
          </div>
        </div>

        <div className="rk-statCard is-rejected">
          <div className="rk-statIcon" aria-hidden="true">
            <AiOutlineCloseCircle />
          </div>
          <div className="rk-statBody">
            <div className="rk-statLabel">Ditolak</div>
            <div className="rk-statValue">{stats.rejected}</div>
          </div>
        </div>
      </div>

      <div className="rk-filterPanel">
        <label className="rk-searchBox" aria-label="Cari laporan kegiatan">
          <FiSearch className="rk-searchIcon" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Cari kegiatan, posbankum, atau lokasi..."
          />
          {q ? (
            <button
              className="rk-searchClear"
              type="button"
              onClick={() => setQ("")}
              aria-label="Hapus pencarian"
            >
              <FiX />
            </button>
          ) : null}
        </label>

        <div
          className="rk-tabs"
          role="tablist"
          aria-label="Filter status laporan"
        >
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`rk-tab ${tab === item.key ? "is-active" : ""}`}
              onClick={() => setTab(item.key)}
            >
              <span>{item.label}</span>
              <span className="rk-tabCount">{tabCounts[item.key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {err ? <div className="rk-errorBox">{err}</div> : null}

      {loading ? (
        <div className="rk-emptyCard is-loading">Memuat data...</div>
      ) : filteredRows.length === 0 ? (
        <div className="rk-emptyCard">
          <div className="rk-emptyIcon">
            <FiFileText />
          </div>
          <h2>Tidak Ada Data Ditemukan</h2>
          <p>
            Tidak ada laporan kegiatan yang sesuai dengan filter yang dipilih
          </p>
          <button className="rk-emptyBtn" type="button" onClick={resetFilters}>
            Reset Filter
          </button>
        </div>
      ) : (
        <>
          <div className="rk-cardGrid">
            {pageItems.map((item) => {
              const thumbUrl = getThumbUrl(item.thumbnail_path);
              const peserta = Number(item.jumlah_peserta);
              const pesertaText = Number.isFinite(peserta)
                ? `${peserta} Peserta`
                : "0 Peserta";
              const rejected = isRejected(item.status);

              return (
                <article className="rk-activityCard" key={item.id_kegiatan}>
                  <div
                    className="rk-cardImage"
                    style={
                      thumbUrl
                        ? { backgroundImage: `url(${thumbUrl})` }
                        : undefined
                    }
                  >
                    {renderStatusPill(item.status, "rk-cardStatus")}
                  </div>

                  <div className="rk-cardBody">
                    <h2 className="rk-cardTitle">{safeText(item.judul)}</h2>

                    <div className="rk-cardMeta">
                      <FiMapPin />
                      <span>{selectedPosNameForRow(item)}</span>
                    </div>

                    <div className="rk-cardMeta">
                      <FiCalendar />
                      <span>
                        {formatDate(item.tgl_mulai || item.tgl_upload)}
                      </span>
                    </div>

                    <div className="rk-cardMeta">
                      <FiUsers />
                      <span>{pesertaText}</span>
                    </div>

                    {rejected && item.catatan ? (
                      <div className="rk-reasonBox">
                        <div className="rk-reasonTitle">
                          <AiOutlineCloseCircle />
                          <span>Alasan Penolakan:</span>
                        </div>
                        <p>{item.catatan}</p>
                      </div>
                    ) : null}

                    <button
                      className="rk-detailBtn"
                      type="button"
                      onClick={() => openDetailModal(item)}
                    >
                      <FiEye />
                      <span>Lihat Detail</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div
              className="rk-pagination"
              aria-label="Paginasi laporan kegiatan"
            >
              <button
                className="rk-pageNav"
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={pageClamped <= 1}
                aria-label="Halaman sebelumnya"
              >
                <FiChevronLeft />
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`rk-pageBtn ${pageClamped === pageNumber ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ),
              )}

              <button
                className="rk-pageNav"
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={pageClamped >= totalPages}
                aria-label="Halaman berikutnya"
              >
                <FiChevronRight />
              </button>
            </div>
          ) : null}
        </>
      )}

      {detailOpen && selected ? (
        <div className="rk-modalOverlay" onMouseDown={closeDetailModal}>
          <section
            className="rk-detailModal"
            role="dialog"
            aria-modal="true"
            aria-label="Detail laporan kegiatan"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              className="rk-detailHero"
              style={
                selectedThumb
                  ? { backgroundImage: `url(${selectedThumb})` }
                  : undefined
              }
            >
              <div className="rk-detailHeroShade" />

              {renderStatusPill(selected.status, "rk-detailStatus")}

              <button
                className="rk-detailClose"
                type="button"
                onClick={closeDetailModal}
                disabled={saving}
                aria-label="Tutup detail"
              >
                <FiX />
              </button>

              <div className="rk-detailHeroText">
                <h2>{safeText(selected.judul)}</h2>
                <div className="rk-detailHeroMeta">
                  <span>
                    <FiMapPin />
                    {selectedPosName}
                  </span>
                  <span>
                    <FiCalendar />
                    {formatDate(selected.tgl_mulai || selected.tgl_upload)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rk-detailContent">
              <div className="rk-detailInfoGrid">
                <div className="rk-infoBox">
                  <span>Tanggal Pelaksanaan</span>
                  <strong>{formatDate(selected.tgl_mulai)}</strong>
                </div>

                <div className="rk-infoBox">
                  <span>Tanggal Laporan</span>
                  <strong>{formatDate(selected.tgl_upload)}</strong>
                </div>

                <div className="rk-infoBox">
                  <span>Lokasi Kegiatan</span>
                  <strong>{selectedLokasi}</strong>
                </div>

                <div className="rk-infoBox">
                  <span>Jumlah Peserta</span>
                  <strong>{selectedPesertaText}</strong>
                </div>

                <div className="rk-infoBox">
                  <span>Pelapor</span>
                  <strong>{selectedPelapor}</strong>
                </div>

                <div className="rk-infoBox">
                  <span>Dokumentasi</span>
                  <strong>{selectedDokumentasi}</strong>
                </div>
              </div>

              <div className="rk-detailSection">
                <h3>Deskripsi Kegiatan</h3>
                <p>{safeText(selected.deskripsi)}</p>
              </div>

              {selectedStatusKey === "rejected" ? (
                <div className="rk-detailSection rk-detailSectionReject">
                  <h3>Catatan Penolakan</h3>
                  <p>{safeText(selected.catatan)}</p>
                </div>
              ) : (
                <div className="rk-detailSection rk-detailSectionResult">
                  <h3>Hasil Kegiatan</h3>
                  <p>{safeText(selected.catatan)}</p>
                </div>
              )}
            </div>

            {selectedStatusKey === "pending" ? (
              <div className="rk-detailActions">
                <button
                  className="rk-actionBtn is-neutral"
                  type="button"
                  onClick={closeDetailModal}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  className="rk-actionBtn is-reject"
                  type="button"
                  onClick={openRejectModal}
                  disabled={saving}
                >
                  <FiThumbsDown />
                  Tolak
                </button>

                <button
                  className="rk-actionBtn is-approve"
                  type="button"
                  onClick={approve}
                  disabled={saving}
                >
                  <FiThumbsUp />
                  Terima
                </button>
              </div>
            ) : (
              <div className="rk-detailActions">
                <button
                  className="rk-actionBtn is-neutral"
                  type="button"
                  onClick={closeDetailModal}
                  disabled={saving}
                >
                  Tutup
                </button>
              </div>
            )}

            {rejectOpen ? (
              <div className="rk-rejectOverlay" onMouseDown={closeRejectModal}>
                <section
                  className="rk-rejectModal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Tolak laporan kegiatan"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="rk-rejectHead">
                    <div className="rk-rejectHeadIcon">
                      <FiMessageSquare />
                    </div>
                    <div>
                      <h2>Tolak Laporan Kegiatan</h2>
                      <p>Berikan catatan untuk perbaikan laporan</p>
                    </div>

                    <button
                      className="rk-rejectClose"
                      type="button"
                      onClick={closeRejectModal}
                      disabled={saving}
                      aria-label="Tutup popup penolakan"
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="rk-rejectBody">
                    <label className="rk-rejectLabel" htmlFor="rkRejectNote">
                      Catatan Penolakan <span>*</span>
                    </label>
                    <textarea
                      id="rkRejectNote"
                      className="rk-rejectTextarea"
                      value={rejectNote}
                      onChange={(event) => setRejectNote(event.target.value)}
                      placeholder="Jelaskan alasan penolakan dan apa yang perlu diperbaiki oleh paralegal..."
                    />
                    <p className="rk-rejectHelp">
                      Catatan ini akan dikirimkan ke paralegal untuk perbaikan
                      laporan kegiatan.
                    </p>

                    <div className="rk-rejectActions">
                      <button
                        className="rk-rejectCancel"
                        type="button"
                        onClick={closeRejectModal}
                        disabled={saving}
                      >
                        Batal
                      </button>
                      <button
                        className="rk-rejectSubmit"
                        type="button"
                        onClick={reject}
                        disabled={saving}
                      >
                        Tolak Laporan
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function selectedPosNameForRow(item) {
  return safeText(item?.posbankum?.nama);
}
