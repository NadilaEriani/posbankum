import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiUpload,
  FiCalendar,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiMapPin,
  FiUsers,
  FiEye,
  FiInfo,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import SuccessToast from "../../components/ui/SuccessToast";
import DeleteConfirmModal from "../../components/ui/DeleteConfirmModal";
import "./kelolaKegiatan.css";

const TABS = [
  { key: "all", label: "Semua Kegiatan" },
  { key: "Diterima", label: "Pengajuan Kegiatan Diterima" },
  { key: "Diproses", label: "Pengajuan Kegiatan Diproses" },
  { key: "Ditolak", label: "Pengajuan Kegiatan Ditolak" },
];

const KATEGORI_OPTS = [
  "Sosialisasi",
  "Konsultasi",
  "Pendampingan",
  "Mediasi",
  "Penyuluhan",
  "Kunjungan",
];

const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v.trim(),
  );

const toDateInput = (v) => {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const norm = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

// ======================
// FIX: "Selesai" => "Diterima"
// ======================
function statusKind(statusRaw) {
  const s = norm(statusRaw);
  if (!s) return "unknown";

  if (s.includes("tolak") || s.includes("reject")) return "reject";

  if (s.includes("proses") || s.includes("pending") || s.includes("menunggu"))
    return "process";

  // ✅ selesai/done/finish dianggap diterima
  if (
    s.includes("terima") ||
    s.includes("approve") ||
    s.includes("valid") ||
    s.includes("selesai") ||
    s.includes("done") ||
    s.includes("finish")
  )
    return "accept";

  return "unknown";
}

function statusLabel(statusRaw) {
  const k = statusKind(statusRaw);
  if (k === "process") return "Proses";
  if (k === "reject") return "Ditolak";
  if (k === "accept") return "Diterima"; // ✅ label final
  return statusRaw || "Status";
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function pickNumber(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export default function KelolaKegiatan() {
  const [loading, setLoading] = useState(true);
  const [kegiatan, setKegiatan] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [posName, setPosName] = useState("Posbankum");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ===== id posbankum dari auth/profile
  const [posbankumId, setPosbankumId] = useState(null);
  const [idReady, setIdReady] = useState(false);

  // ===== modal mode: create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit
  const [editingItem, setEditingItem] = useState(null);

  // ===== detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // ===== deteksi kolom opsional (kalau ada di tabel, baru ikut disimpan)
  const [kegiatanCols, setKegiatanCols] = useState(new Set());

  const [form, setForm] = useState({
    judul: "",
    isi: "",
    tgl_mulai: "",
    tgl_selesai: "",
    lokasi: "",
    kategori: "",
    target_peserta: "",
    thumbnailFile: null,
  });

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const openPicker = (ref) => {
    const el = ref?.current;
    if (!el) return;
    if (el.showPicker) el.showPicker();
    else el.focus();
  };

  const BUCKET_THUMB = "kegiatan-thumbnails";
  const [existingThumbPath, setExistingThumbPath] = useState(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState(null);

  const getThumbUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(BUCKET_THUMB).getPublicUrl(path);
    return data?.publicUrl || null;
  };

  // cleanup objectURL kalau preview dari file
  useEffect(() => {
    return () => {
      if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(thumbPreviewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(thumbPreviewUrl);
    }
    setThumbPreviewUrl(null);
    setExistingThumbPath(null);
    setEditingItem(null);
    setForm({
      judul: "",
      isi: "",
      tgl_mulai: "",
      tgl_selesai: "",
      lokasi: "",
      kategori: "",
      target_peserta: "",
      thumbnailFile: null,
    });
  };

  const openCreate = () => {
    setFormError("");
    if (!posbankumId) {
      setFormError("ID Posbankum tidak ditemukan. Silakan login ulang.");
      return;
    }
    resetForm();
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setFormError("");
    if (!posbankumId) {
      setFormError("ID Posbankum tidak ditemukan. Silakan login ulang.");
      return;
    }
    resetForm();
    setModalMode("edit");
    setEditingItem(item);

    setForm({
      judul: item?.judul || "",
      isi: item?.deskripsi || "",
      tgl_mulai: toDateInput(item?.tgl_mulai),
      tgl_selesai: toDateInput(item?.tgl_selesai),
      lokasi: pickFirst(item, ["lokasi", "tempat", "alamat", "location"]),
      kategori: pickFirst(item, ["kategori", "category", "jenis", "tipe"]),
      target_peserta: String(
        pickNumber(item, ["target_peserta", "jumlah_peserta", "peserta"]) ?? "",
      ),
      thumbnailFile: null,
    });

    const oldPath = item?.thumbnail_path || null;
    setExistingThumbPath(oldPath);
    setThumbPreviewUrl(getThumbUrl(oldPath));

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const openDetail = (item) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
  };

  // ===== resolve id_posbankum (localStorage -> profiles -> cache)
  const resolvePosbankumId = async () => {
    setIdReady(false);
    setFormError("");

    const raw = localStorage.getItem("id_posbankum");
    if (raw && isUuid(raw)) {
      setPosbankumId(raw.trim());
      setIdReady(true);
      return;
    }
    if (raw && !isUuid(raw)) localStorage.removeItem("id_posbankum");

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      setFormError(userErr.message || "Gagal mengambil user login.");
      setIdReady(true);
      return;
    }

    const user = userRes?.user;
    if (!user?.id) {
      setFormError("User belum login. Silakan login ulang.");
      setIdReady(true);
      return;
    }

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id_posbankum")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      setFormError(profErr.message || "Gagal membaca profiles.");
      setIdReady(true);
      return;
    }

    const pid = prof?.id_posbankum;
    if (!pid || !isUuid(pid)) {
      setFormError(
        "profiles.id_posbankum kosong/invalid. Pastikan akun posbankum punya relasi ke tabel posbankum.",
      );
      setIdReady(true);
      return;
    }

    localStorage.setItem("id_posbankum", pid);
    setPosbankumId(pid);
    setIdReady(true);
  };

  const fetchPosbankumName = async (pid) => {
    if (!pid) return;

    const { data, error } = await supabase
      .from("posbankum")
      .select("nama")
      .eq("id_posbankum", pid)
      .maybeSingle();

    if (error) {
      setFormError((prev) => prev || error.message);
      return;
    }

    if (data?.nama) setPosName(data.nama);
  };

  const fetchKegiatan = async (pid) => {
    setLoading(true);
    setFormError("");

    if (!pid) {
      setKegiatan([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("kegiatan")
      .select("*")
      .eq("id_posbankum", pid)
      .order("tgl_upload", { ascending: false });

    if (error) {
      setFormError(error.message || "Gagal memuat kegiatan.");
      setKegiatan([]);
      setLoading(false);
      return;
    }

    const rows = data || [];
    setKegiatan(rows);

    const first = rows[0] || {};
    setKegiatanCols(new Set(Object.keys(first)));

    setLoading(false);
  };

  useEffect(() => {
    resolvePosbankumId();
  }, []);

  useEffect(() => {
    if (!idReady) return;
    if (!posbankumId) {
      setLoading(false);
      return;
    }
    fetchPosbankumName(posbankumId);
    fetchKegiatan(posbankumId);
  }, [idReady, posbankumId]);

  // ======================
  // FIX: stats "Selesai" diganti "Diterima"
  // ======================
  const stats = useMemo(() => {
    const rows = kegiatan || [];
    let total = rows.length;
    let process = 0,
      reject = 0,
      accept = 0;

    for (const r of rows) {
      const k = statusKind(r?.status);
      if (k === "process") process += 1;
      else if (k === "reject") reject += 1;
      else if (k === "accept") accept += 1;
    }
    return { total, process, reject, accept };
  }, [kegiatan]);

  // tab filter client-side
  const listByTab = useMemo(() => {
    if (tab === "all") return kegiatan;

    const t = norm(tab);
    return (kegiatan || []).filter((x) => {
      const s = norm(x?.status);

      if (t === "diproses")
        return s.includes("proses") || s.includes("pending");

      // ✅ diterima juga meng-cover selesai/done/finish
      if (t === "diterima")
        return (
          s.includes("terima") ||
          s.includes("approve") ||
          s.includes("valid") ||
          s.includes("selesai") ||
          s.includes("done") ||
          s.includes("finish")
        );

      if (t === "ditolak") return s.includes("tolak") || s.includes("reject");

      return s.includes(t);
    });
  }, [kegiatan, tab]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return listByTab;
    return listByTab.filter((x) => {
      const j = (x.judul || "").toLowerCase();
      const d = (x.deskripsi || "").toLowerCase();
      const c = (x.catatan || "").toLowerCase();
      return j.includes(s) || d.includes(s) || c.includes(s);
    });
  }, [listByTab, search]);

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

  const onPickFile = (e) => {
    const file = e.target.files?.[0] || null;

    if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(thumbPreviewUrl);
    }

    setForm((p) => ({ ...p, thumbnailFile: file }));

    if (file) {
      const url = URL.createObjectURL(file);
      setThumbPreviewUrl(url);
    } else {
      setThumbPreviewUrl(getThumbUrl(existingThumbPath));
    }
  };

  const clearThumb = () => {
    if (saving) return;
    if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(thumbPreviewUrl);
    }
    setForm((p) => ({ ...p, thumbnailFile: null }));
    setThumbPreviewUrl(null);
  };

  const handleDelete = async (item) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    const item = deleteItem;
    if (!item || deleting) return;
    setDeleting(true);
    setFormError("");

    const path = item?.thumbnail_path;
    if (path) {
      await supabase.storage.from(BUCKET_THUMB).remove([path]);
    }

    const { error } = await supabase
      .from("kegiatan")
      .delete()
      .eq("id_kegiatan", item.id_kegiatan);

    if (error) {
      setFormError(error.message || "Gagal menghapus kegiatan.");
      setDeleting(false);
      return;
    }

    await fetchKegiatan(posbankumId);
    setSuccessMessage("Kegiatan berhasil dihapus!");
    setDeleteItem(null);
    setDeleting(false);
  };

  const handleSubmit = async () => {
    setFormError("");

    if (!posbankumId) {
      setFormError("ID Posbankum tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (!form.judul.trim()) return setFormError("Judul wajib diisi.");
    if (!form.isi.trim()) return setFormError("Deskripsi wajib diisi.");
    if (!form.tgl_mulai) return setFormError("Tanggal Mulai wajib diisi.");
    if (!form.tgl_selesai) return setFormError("Tanggal Selesai wajib diisi.");

    const mulai = form.tgl_mulai;
    const selesai = form.tgl_selesai;
    if (selesai < mulai) {
      setFormError("Tanggal Selesai tidak boleh sebelum Tanggal Mulai.");
      return;
    }

    setSaving(true);

    try {
      let thumbnailPath = existingThumbPath || null;

      if (form.thumbnailFile) {
        const file = form.thumbnailFile;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext)
          ? ext
          : "jpg";
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const newPath = `posbankum/${posbankumId}/${Date.now()}_${safeName}.${safeExt}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET_THUMB)
          .upload(newPath, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || "image/jpeg",
          });

        if (upErr) throw upErr;

        if (existingThumbPath) {
          await supabase.storage.from(BUCKET_THUMB).remove([existingThumbPath]);
        }

        thumbnailPath = newPath;
      }

      const basePayload = {
        judul: form.judul.trim(),
        deskripsi: form.isi.trim(),
        tgl_mulai: form.tgl_mulai,
        tgl_selesai: form.tgl_selesai,
        thumbnail_path: thumbnailPath,
      };

      const optional = {};
      if (kegiatanCols.has("lokasi"))
        optional.lokasi = form.lokasi.trim() || null;
      if (kegiatanCols.has("kategori"))
        optional.kategori = form.kategori.trim() || null;
      if (kegiatanCols.has("target_peserta")) {
        const n = Number(form.target_peserta);
        optional.target_peserta = Number.isFinite(n) ? n : null;
      }
      if (kegiatanCols.has("jumlah_peserta")) {
        const n = Number(form.target_peserta);
        optional.jumlah_peserta = Number.isFinite(n) ? n : null;
      }

      if (modalMode === "create") {
        const payload = {
          id_posbankum: posbankumId,
          status: "Diproses",
          tgl_upload: new Date().toISOString(),
          ...basePayload,
          ...optional,
        };

        const { error: insErr } = await supabase
          .from("kegiatan")
          .insert([payload]);
        if (insErr) throw insErr;
      } else {
        if (!editingItem?.id_kegiatan)
          throw new Error("Data edit tidak valid.");

        const prevStatus = String(editingItem.status || "");
        const nextStatus =
          norm(prevStatus) === "ditolak" ? "Diproses" : prevStatus;

        const payload = {
          status: nextStatus,
          ...basePayload,
          ...optional,
        };

        const { error: upErr } = await supabase
          .from("kegiatan")
          .update(payload)
          .eq("id_kegiatan", editingItem.id_kegiatan);

        if (upErr) throw upErr;
      }

      setModalOpen(false);
      await fetchKegiatan(posbankumId);
      setSuccessMessage(
        modalMode === "edit"
          ? "Kegiatan berhasil diperbarui!"
          : "Kegiatan berhasil diajukan!",
      );
    } catch (e) {
      setFormError(e?.message || "Gagal menyimpan kegiatan.");
    } finally {
      setSaving(false);
    }
  };

  const detailThumbUrl = detailItem
    ? getThumbUrl(detailItem.thumbnail_path)
    : null;
  const detailKind = statusKind(detailItem?.status);

  return (
    <div className="kk-wrap">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      {/* ===== HEADER ===== */}
      <div className="kk-headTop">
        <div>
          <h1 className="kk-title">Kelola Kegiatan</h1>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="kk-stats">
        <div className="kk-statCard">
          <div className="kk-statIcon is-blue">
            <FiFileText />
          </div>
          <div>
            <div className="kk-statLabel">Total Kegiatan</div>
            <div className="kk-statValue">{stats.total}</div>
          </div>
        </div>

        <div className="kk-statCard">
          <div className="kk-statIcon is-green">
            <FiCheckCircle />
          </div>
          <div>
            <div className="kk-statLabel">Selesai</div>
            <div className="kk-statValue">{stats.accept}</div>
          </div>
        </div>

        <div className="kk-statCard">
          <div className="kk-statIcon is-orange">
            <FiClock />
          </div>
          <div>
            <div className="kk-statLabel">Proses</div>
            <div className="kk-statValue">{stats.process}</div>
          </div>
        </div>

        <div className="kk-statCard">
          <div className="kk-statIcon is-red">
            <FiXCircle />
          </div>
          <div>
            <div className="kk-statLabel">Ditolak</div>
            <div className="kk-statValue">{stats.reject}</div>
          </div>
        </div>
      </div>

      {/* ===== FILTER ROW ===== */}
      <div className="kk-row">
        <div className="kk-search">
          <FiSearch className="kk-ic kk-ic-search" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kegiatan..."
          />
        </div>

        <button className="kk-add" type="button" onClick={openCreate}>
          <FiPlus />
          Tambah Kegiatan
        </button>
      </div>

      {/* ===== TABS ===== */}
      <div className="kk-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`kk-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {formError && <div className="kk-form-error">{formError}</div>}

      {/* ===== LIST CARDS ===== */}
      <div className="kk-list">
        {!idReady ? (
          <div className="kk-empty">Memuat akun...</div>
        ) : loading ? (
          <div className="kk-empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="kk-empty">Belum ada kegiatan.</div>
        ) : (
          filtered.map((item) => {
            const kind = statusKind(item.status);
            const pill = statusLabel(item.status);
            const thumbUrl = getThumbUrl(item.thumbnail_path);

            const kategori = pickFirst(item, [
              "kategori",
              "category",
              "jenis",
              "tipe",
            ]);
            const lokasi = pickFirst(item, [
              "lokasi",
              "tempat",
              "alamat",
              "location",
            ]);
            const peserta = pickNumber(item, [
              "target_peserta",
              "jumlah_peserta",
              "peserta",
            ]);
            const catatan = pickFirst(item, [
              "catatan",
              "catatan_admin",
              "note",
              "keterangan",
            ]);

            const canEdit = kind === "reject" || kind === "process";
            const canDelete = kind === "reject";

            return (
              <div className="kk-card" key={item.id_kegiatan}>
                <div
                  className="kk-media"
                  style={
                    thumbUrl
                      ? { backgroundImage: `url(${thumbUrl})` }
                      : undefined
                  }
                >
                  <span className={`kk-statusPill is-${kind}`}>{pill}</span>
                  {kategori ? (
                    <span className="kk-catPill">{kategori}</span>
                  ) : null}
                </div>

                <div className="kk-cardBody">
                  <div className="kk-judul">{item.judul || "-"}</div>
                  <div className="kk-desc">{item.deskripsi || "-"}</div>

                  {kind === "reject" && catatan ? (
                    <div className="kk-rejectBox">
                      <div className="kk-rejectTitle">Catatan Admin</div>
                      <div className="kk-rejectText">{catatan}</div>
                    </div>
                  ) : null}

                  <div className="kk-meta">
                    <span className="kk-metaItem">
                      <FiCalendar className="kk-ic kk-ic-cal" />
                      {formatDate(item.tgl_mulai || item.tgl_upload)}
                    </span>

                    {lokasi ? (
                      <span className="kk-metaItem">
                        <FiMapPin className="kk-ic kk-ic-cal" />
                        {lokasi}
                      </span>
                    ) : null}

                    {Number.isFinite(Number(peserta)) ? (
                      <span className="kk-metaItem">
                        <FiUsers className="kk-ic kk-ic-cal" />
                        {peserta} peserta
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="kk-cardFooter">
                  <button
                    className="kk-btnView"
                    type="button"
                    onClick={() => openDetail(item)}
                    title="Lihat"
                  >
                    <FiEye />
                    Lihat
                  </button>

                  {canEdit && (
                    <button
                      className="kk-btnIcon is-orange"
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(item)}
                    >
                      <FiEdit2 />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      className="kk-btnIcon is-red"
                      type="button"
                      title="Hapus"
                      onClick={() => handleDelete(item)}
                    >
                      <FiTrash2 />
                    </button>
                  )}

                  <button
                    className="kk-btnIcon is-gray"
                    type="button"
                    title="Detail"
                    onClick={() => openDetail(item)}
                  >
                    <FiInfo />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== MODAL CREATE/EDIT ===== */}
      <DeleteConfirmModal
        open={!!deleteItem}
        title="Hapus Kegiatan?"
        subtitle="Tindakan ini tidak dapat dibatalkan"
        description="Apakah Anda yakin ingin menghapus kegiatan ini? Semua data dan timeline akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        loading={deleting}
        onCancel={() => !deleting && setDeleteItem(null)}
        onConfirm={confirmDelete}
      />

      {modalOpen && (
        <div className="kk-modal-overlay" onMouseDown={closeModal}>
          <div
            className="kk-modal kk-modal-modern"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={[
                "kk-modal-head",
                modalMode === "edit" ? "is-orange" : "is-blue",
              ].join(" ")}
            >
              <div className="kk-modal-title">
                {modalMode === "edit"
                  ? "Edit Kegiatan"
                  : "Tambah Kegiatan Baru"}
              </div>

              <button
                className="kk-modal-close"
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                <FiX />
              </button>
            </div>

            <div className="kk-modal-body">
              <div className="kk-field">
                <div className="kk-label">
                  Judul Kegiatan <span className="kk-req">*</span>
                </div>
                <input
                  className="kk-input"
                  value={form.judul}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, judul: e.target.value }))
                  }
                  placeholder="Masukkan judul kegiatan..."
                />
              </div>

              <div className="kk-gridForm">
                <div className="kk-field kk-thumbField">
                  <div className="kk-label">Thumbnail</div>

                  <div className="kk-thumbBoxWrap">
                    <label
                      className={`kk-thumb-upload ${thumbPreviewUrl ? "has-image" : ""}`}
                      style={
                        thumbPreviewUrl
                          ? { backgroundImage: `url(${thumbPreviewUrl})` }
                          : undefined
                      }
                    >
                      {!thumbPreviewUrl && (
                        <div className="kk-thumbEmpty">
                          <FiUpload className="kk-ic kk-ic-upload" />
                          <div className="kk-thumbEmptyText">
                            Klik untuk upload thumbnail
                          </div>
                        </div>
                      )}

                      <input
                        className="kk-file"
                        type="file"
                        accept="image/*"
                        onChange={onPickFile}
                      />
                    </label>

                    {thumbPreviewUrl ? (
                      <button
                        className="kk-thumbRemove"
                        type="button"
                        title="Hapus thumbnail"
                        onClick={clearThumb}
                        disabled={saving}
                      >
                        <FiX />
                      </button>
                    ) : null}
                  </div>

                  <div className="kk-file-name">
                    {form.thumbnailFile
                      ? form.thumbnailFile.name
                      : existingThumbPath
                        ? "thumbnail tersimpan"
                        : ""}
                  </div>
                </div>

                <div className="kk-field">
                  <div className="kk-label">
                    Tanggal Mulai <span className="kk-req">*</span>
                  </div>
                  <div className="kk-datebox">
                    <input
                      ref={startDateRef}
                      className="kk-input kk-input-date"
                      type="date"
                      value={form.tgl_mulai}
                      onChange={(e) =>
                        setForm((p) => {
                          const nextMulai = e.target.value;
                          const invalidEnd =
                            p.tgl_selesai &&
                            nextMulai &&
                            p.tgl_selesai < nextMulai;
                          return {
                            ...p,
                            tgl_mulai: nextMulai,
                            tgl_selesai: invalidEnd ? "" : p.tgl_selesai,
                          };
                        })
                      }
                    />
                    <FiCalendar
                      className="kk-date-ic"
                      onClick={() => openPicker(startDateRef)}
                    />
                  </div>
                </div>

                <div className="kk-field">
                  <div className="kk-label">
                    Tanggal Selesai <span className="kk-req">*</span>
                  </div>
                  <div className="kk-datebox">
                    <input
                      ref={endDateRef}
                      className="kk-input kk-input-date"
                      type="date"
                      value={form.tgl_selesai}
                      min={form.tgl_mulai || undefined}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, tgl_selesai: e.target.value }))
                      }
                    />
                    <FiCalendar
                      className="kk-date-ic"
                      onClick={() => openPicker(endDateRef)}
                    />
                  </div>
                </div>

                <div className="kk-field">
                  <div className="kk-label">Lokasi</div>
                  <input
                    className="kk-input"
                    value={form.lokasi}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, lokasi: e.target.value }))
                    }
                    placeholder="contoh: Kantor Posbankum..."
                  />
                </div>

                <div className="kk-field">
                  <div className="kk-label">Kategori</div>
                  <select
                    className="kk-input kk-select"
                    value={form.kategori}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, kategori: e.target.value }))
                    }
                  >
                    <option value="">Pilih kategori</option>
                    {KATEGORI_OPTS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="kk-field">
                  <div className="kk-label">Target Peserta</div>
                  <input
                    className="kk-input"
                    inputMode="numeric"
                    value={form.target_peserta}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, target_peserta: e.target.value }))
                    }
                    placeholder="contoh: 50"
                  />
                </div>

                {modalMode === "edit" &&
                statusKind(editingItem?.status) === "reject" ? (
                  <div className="kk-field kk-adminNote">
                    <div className="kk-label">Catatan Admin</div>
                    <div className="kk-adminNoteBox">
                      {String(editingItem?.catatan || "").trim()
                        ? editingItem.catatan
                        : "-"}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="kk-field">
                <div className="kk-label">
                  Deskripsi <span className="kk-req">*</span>
                </div>
                <textarea
                  className="kk-textarea"
                  value={form.isi}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isi: e.target.value }))
                  }
                  placeholder="Tulis deskripsi kegiatan..."
                />
              </div>

              {formError && <div className="kk-form-error">{formError}</div>}

              <div className="kk-modal-actions">
                <button
                  className="kk-btn kk-btn-primary"
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : modalMode === "edit"
                      ? "Update"
                      : "Simpan"}
                </button>

                <button
                  className="kk-btn kk-btn-ghost"
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      {detailOpen && detailItem && (
        <div className="kk-detail-overlay" onMouseDown={closeDetail}>
          <div
            className="kk-detail-modal kk-detail-modern"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="kk-detail-hero"
              style={
                detailThumbUrl
                  ? { backgroundImage: `url(${detailThumbUrl})` }
                  : undefined
              }
            >
              <button
                className="kk-detail-close"
                type="button"
                onClick={closeDetail}
              >
                <FiX />
              </button>

              <div className="kk-detail-badges">
                {pickFirst(detailItem, [
                  "kategori",
                  "category",
                  "jenis",
                  "tipe",
                ]) ? (
                  <span className="kk-catPill">
                    {pickFirst(detailItem, [
                      "kategori",
                      "category",
                      "jenis",
                      "tipe",
                    ])}
                  </span>
                ) : null}
                <span className={`kk-statusPill is-${detailKind}`}>
                  {statusLabel(detailItem.status)}
                </span>
              </div>
            </div>

            <div className="kk-detail-body">
              <div className="kk-detail-title">{detailItem.judul || "-"}</div>

              <div className="kk-detail-meta">
                <span className="kk-metaItem">
                  <FiMapPin className="kk-ic kk-ic-cal" />
                  {posName}
                </span>
                <span className="kk-dot">|</span>
                <span className="kk-metaItem">
                  <FiCalendar className="kk-ic kk-ic-cal" />
                  {formatDate(detailItem.tgl_mulai || detailItem.tgl_upload)}
                </span>
              </div>

              {detailKind === "reject" ? (
                <div className="kk-adminAlert">
                  <div className="kk-adminAlertTitle">Catatan Admin</div>
                  <div className="kk-adminAlertText">
                    {String(detailItem?.catatan || "").trim()
                      ? detailItem.catatan
                      : "-"}
                  </div>
                </div>
              ) : null}

              <div className="kk-detail-section">
                <div className="kk-detail-sectionTitle">Deskripsi Kegiatan</div>
                <div className="kk-detail-desc">
                  {detailItem.deskripsi || "-"}
                </div>
              </div>

              <div className="kk-detail-section">
                <div className="kk-detail-sectionTitle">Tanggal</div>
                <div className="kk-detail-dates">
                  <div className="kk-detail-dateRow">
                    <span className="kk-detail-dateLabel">Tanggal Mulai</span>
                    <span className="kk-detail-dateValue">
                      {formatDate(detailItem.tgl_mulai)}
                    </span>
                  </div>
                  <div className="kk-detail-dateRow">
                    <span className="kk-detail-dateLabel">Tanggal Selesai</span>
                    <span className="kk-detail-dateValue">
                      {formatDate(detailItem.tgl_selesai)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="kk-detail-actions">
                <button
                  className="kk-btn kk-btn-primary"
                  type="button"
                  onClick={closeDetail}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
