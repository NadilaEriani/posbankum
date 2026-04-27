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
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import SuccessToast from "../../components/ui/SuccessToast";
import DeleteConfirmModal from "../../components/ui/DeleteConfirmModal";
import "./kelolaKegiatan.css";

const BUCKET_THUMB = "kegiatan-thumbnails";

const OPTIONAL_Kegiatan_COLUMNS = [
  "lokasi",
  "tempat",
  "alamat",
  "location",
  "kategori",
  "category",
  "jenis",
  "tipe",
  "target_peserta",
  "jumlah_peserta",
  "peserta",
  "anggota_terlibat",
  "hasil_kegiatan",
  "anggota",
  "peserta_terlibat",
  "tim_terlibat",
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

function statusKind(statusRaw) {
  const s = norm(statusRaw);
  if (!s) return "process";
  if (s.includes("tolak") || s.includes("reject")) return "reject";
  if (s.includes("proses") || s.includes("pending") || s.includes("menunggu")) {
    return "process";
  }
  if (
    s.includes("terima") ||
    s.includes("approve") ||
    s.includes("valid") ||
    s.includes("selesai") ||
    s.includes("done") ||
    s.includes("finish")
  ) {
    return "accept";
  }
  return "process";
}

function statusLabel(statusRaw) {
  const k = statusKind(statusRaw);
  if (k === "process") return "Menunggu";
  if (k === "reject") return "Ditolak";
  return "Disetujui";
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) continue;
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

function parseListValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        return String(item?.nama || item?.name || item?.full_name || "").trim();
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  const raw = String(value || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return parseListValue(parsed);
  } catch {
    return raw
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function getAnggotaList(item) {
  return [
    ...parseListValue(item?.anggota_terlibat),
    ...parseListValue(item?.anggota),
    ...parseListValue(item?.peserta_terlibat),
    ...parseListValue(item?.tim_terlibat),
  ].filter((name, index, arr) => arr.indexOf(name) === index);
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

function formatShortText(value, max = 120) {
  const text = String(value || "").trim();
  if (!text) return "-";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

export default function KelolaKegiatan() {
  const [loading, setLoading] = useState(true);
  const [kegiatan, setKegiatan] = useState([]);
  const [search, setSearch] = useState("");
  const [posName, setPosName] = useState("Posbankum");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [posbankumId, setPosbankumId] = useState(null);
  const [idReady, setIdReady] = useState(false);
  const [kegiatanCols, setKegiatanCols] = useState(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingItem, setEditingItem] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const [existingThumbPath, setExistingThumbPath] = useState(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState(null);

  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    tgl_mulai: "",
    tgl_selesai: "",
    lokasi: "",
    jumlah_peserta: "",
    hasil_kegiatan: "",
    thumbnailFile: null,
  });

  const fileInputRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const getThumbUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(BUCKET_THUMB).getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const openPicker = (ref) => {
    const el = ref?.current;
    if (!el) return;
    if (el.showPicker) el.showPicker();
    else el.focus();
  };

  const revokeBlobPreview = () => {
    if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(thumbPreviewUrl);
    }
  };

  const resetForm = () => {
    revokeBlobPreview();
    setThumbPreviewUrl(null);
    setExistingThumbPath(null);
    setEditingItem(null);
    setForm({
      judul: "",
      deskripsi: "",
      tgl_mulai: "",
      tgl_selesai: "",
      lokasi: "",
      jumlah_peserta: "",
      hasil_kegiatan: "",
      thumbnailFile: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

  const detectKegiatanColumns = async () => {
    const detected = new Set([
      "id_kegiatan",
      "id_posbankum",
      "judul",
      "deskripsi",
      "catatan",
      "status",
      "tgl_upload",
      "tgl_mulai",
      "tgl_selesai",
      "thumbnail_path",
    ]);

    for (const col of OPTIONAL_Kegiatan_COLUMNS) {
      const { error } = await supabase.from("kegiatan").select(col).limit(1);
      if (!error) detected.add(col);
    }

    setKegiatanCols(detected);
    return detected;
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

    if (rows[0]) {
      setKegiatanCols((prev) => new Set([...prev, ...Object.keys(rows[0])]));
    }

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

    let canceled = false;

    const loadPage = async () => {
      await detectKegiatanColumns();
      if (canceled) return;
      await fetchPosbankumName(posbankumId);
      if (canceled) return;
      await fetchKegiatan(posbankumId);
    };

    loadPage();

    return () => {
      canceled = true;
    };
  }, [idReady, posbankumId]);

  useEffect(() => {
    return () => {
      if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(thumbPreviewUrl);
      }
    };
  }, [thumbPreviewUrl]);

  const stats = useMemo(() => {
    const rows = kegiatan || [];
    let process = 0;
    let reject = 0;
    let accept = 0;

    for (const r of rows) {
      const k = statusKind(r?.status);
      if (k === "process") process += 1;
      else if (k === "reject") reject += 1;
      else if (k === "accept") accept += 1;
    }

    return { total: rows.length, process, reject, accept };
  }, [kegiatan]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return kegiatan;

    return (kegiatan || []).filter((x) => {
      const judul = String(x.judul || "").toLowerCase();
      const deskripsi = String(x.deskripsi || "").toLowerCase();
      const lokasi = pickFirst(x, [
        "lokasi",
        "tempat",
        "alamat",
        "location",
      ]).toLowerCase();
      return judul.includes(s) || deskripsi.includes(s) || lokasi.includes(s);
    });
  }, [kegiatan, search]);

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
      deskripsi: item?.deskripsi || "",
      tgl_mulai: toDateInput(item?.tgl_mulai),
      tgl_selesai: toDateInput(item?.tgl_selesai),
      lokasi: pickFirst(item, ["lokasi", "tempat", "alamat", "location"]),
      jumlah_peserta: String(
        pickNumber(item, ["jumlah_peserta", "target_peserta", "peserta"]) ?? "",
      ),
      hasil_kegiatan: item?.hasil_kegiatan || "",
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

  const setSelectedFile = (file) => {
    if (!file) return;

    revokeBlobPreview();
    setForm((p) => ({ ...p, thumbnailFile: file }));
    setThumbPreviewUrl(URL.createObjectURL(file));
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) setSelectedFile(file);
  };

  const onDropFile = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) setSelectedFile(file);
  };

  const clearThumb = () => {
    if (saving) return;
    revokeBlobPreview();
    setForm((p) => ({ ...p, thumbnailFile: null }));
    setThumbPreviewUrl(null);
    setExistingThumbPath(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (item) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    const item = deleteItem;
    if (!item || deleting) return;
    setDeleting(true);
    setFormError("");

    try {
      const path = item?.thumbnail_path;
      if (path) {
        await supabase.storage.from(BUCKET_THUMB).remove([path]);
      }

      const { error } = await supabase
        .from("kegiatan")
        .delete()
        .eq("id_kegiatan", item.id_kegiatan);

      if (error) throw error;

      await fetchKegiatan(posbankumId);
      setSuccessMessage("Kegiatan berhasil dihapus!");
      setDeleteItem(null);
    } catch (error) {
      setFormError(error?.message || "Gagal menghapus kegiatan.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async () => {
    setFormError("");

    if (!posbankumId) {
      setFormError("ID Posbankum tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (!form.judul.trim()) return setFormError("Judul kegiatan wajib diisi.");
    if (!form.tgl_mulai) return setFormError("Tanggal Mulai wajib diisi.");
    if (form.tgl_selesai && form.tgl_selesai < form.tgl_mulai) {
      return setFormError("Tanggal Selesai tidak boleh sebelum Tanggal Mulai.");
    }
    if (!form.lokasi.trim()) return setFormError("Lokasi wajib diisi.");

    setSaving(true);

    try {
      let thumbnailPath = existingThumbPath || null;

      if (form.thumbnailFile) {
        const file = form.thumbnailFile;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext)
          ? ext
          : "jpg";
        const safeName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^\w.\-]+/g, "_");
        const newPath = `posbankum/${posbankumId}/${Date.now()}_${safeName}.${safeExt}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET_THUMB)
          .upload(newPath, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || "image/jpeg",
          });

        if (upErr) throw upErr;

        if (existingThumbPath && existingThumbPath !== newPath) {
          await supabase.storage.from(BUCKET_THUMB).remove([existingThumbPath]);
        }

        thumbnailPath = newPath;
      }

      const basePayload = {
        judul: form.judul.trim(),
        deskripsi: form.deskripsi.trim(),
        tgl_mulai: form.tgl_mulai,
        tgl_selesai: form.tgl_selesai || null,
        thumbnail_path: thumbnailPath,
      };

      const optional = {};

      if (kegiatanCols.has("lokasi")) optional.lokasi = form.lokasi.trim();
      else if (kegiatanCols.has("tempat")) optional.tempat = form.lokasi.trim();
      else if (kegiatanCols.has("alamat")) optional.alamat = form.lokasi.trim();
      else if (kegiatanCols.has("location"))
        optional.location = form.lokasi.trim();

      const jumlahPeserta = Number(form.jumlah_peserta);
      const pesertaValue = Number.isFinite(jumlahPeserta)
        ? jumlahPeserta
        : null;
      if (kegiatanCols.has("jumlah_peserta"))
        optional.jumlah_peserta = pesertaValue;
      else if (kegiatanCols.has("target_peserta"))
        optional.target_peserta = pesertaValue;
      else if (kegiatanCols.has("peserta")) optional.peserta = pesertaValue;

      if (kegiatanCols.has("hasil_kegiatan")) {
        optional.hasil_kegiatan = form.hasil_kegiatan.trim();
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

        const payload = {
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
          : "Kegiatan berhasil ditambahkan!",
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
  const detailLokasi = detailItem
    ? pickFirst(detailItem, ["lokasi", "tempat", "alamat", "location"]) ||
      posName
    : posName;
  const detailPeserta = detailItem
    ? pickNumber(detailItem, ["jumlah_peserta", "target_peserta", "peserta"])
    : null;
  const detailAnggota = detailItem ? getAnggotaList(detailItem) : [];

  return (
    <div className="kk-wrap">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />

      <div className="kk-headTop">
        <div>
          <h1 className="kk-title">Kelola Kegiatan</h1>
          <div className="kk-titleLine" />
        </div>
      </div>

      <div className="kk-stats">
        <div className="kk-statCard">
          <div className="kk-statIcon">
            <FiFileText />
          </div>
          <div>
            <div className="kk-statLabel">Total Kegiatan</div>
            <div className="kk-statValue">{stats.total}</div>
          </div>
        </div>

        <div className="kk-statCard">
          <div className="kk-statIcon">
            <FiCheckCircle />
          </div>
          <div>
            <div className="kk-statLabel">Disetujui</div>
            <div className="kk-statValue">{stats.accept}</div>
          </div>
        </div>

        <div className="kk-statCard">
          <div className="kk-statIcon">
            <FiClock />
          </div>
          <div>
            <div className="kk-statLabel">Menunggu</div>
            <div className="kk-statValue">{stats.process}</div>
          </div>
        </div>

        <div className="kk-statCard">
          <div className="kk-statIcon">
            <FiXCircle />
          </div>
          <div>
            <div className="kk-statLabel">Ditolak</div>
            <div className="kk-statValue">{stats.reject}</div>
          </div>
        </div>
      </div>

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

      {formError && <div className="kk-form-error">{formError}</div>}

      <div className="kk-list">
        {!idReady ? (
          <div className="kk-emptyCard is-loading">Memuat akun...</div>
        ) : loading ? (
          <div className="kk-emptyCard is-loading">Memuat data kegiatan...</div>
        ) : filtered.length === 0 ? (
          <div className="kk-emptyCard">
            <div className="kk-emptyIcon">
              <FiFileText />
            </div>
            <h2>Tidak Ada Kegiatan Ditemukan</h2>
            <p>Tidak ada kegiatan yang sesuai dengan kata kunci pencarian.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const kind = statusKind(item.status);
            const pill = statusLabel(item.status);
            const thumbUrl = getThumbUrl(item.thumbnail_path);
            const lokasi = pickFirst(item, [
              "lokasi",
              "tempat",
              "alamat",
              "location",
            ]);
            const peserta = pickNumber(item, [
              "jumlah_peserta",
              "target_peserta",
              "peserta",
            ]);
            const catatan = pickFirst(item, [
              "catatan",
              "catatan_admin",
              "note",
              "keterangan",
            ]);
            const isRejected = kind === "reject";
            const isAccepted = kind === "accept";

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
                  <span className={`kk-statusPill is-${kind}`}>
                    {isRejected ? <FiXCircle /> : null}
                    {pill}
                  </span>
                </div>

                <div className="kk-cardBody">
                  <div className="kk-judul">{item.judul || "-"}</div>
                  <div className="kk-desc">
                    {formatShortText(item.deskripsi, 128)}
                  </div>

                  {isRejected && catatan ? (
                    <div className="kk-rejectBox">
                      <div className="kk-rejectTitle">Alasan Penolakan:</div>
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
                    {isRejected ? "Lihat Detail" : "Lihat"}
                  </button>

                  {!isAccepted ? (
                    <button
                      className="kk-btnIcon is-orange"
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(item)}
                    >
                      <FiEdit2 />
                    </button>
                  ) : null}

                  {isRejected ? (
                    <button
                      className="kk-btnIcon is-red"
                      type="button"
                      title="Hapus"
                      onClick={() => handleDelete(item)}
                    >
                      <FiTrash2 />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <DeleteConfirmModal
        open={!!deleteItem}
        title="Hapus Kegiatan?"
        subtitle="Tindakan ini tidak dapat dibatalkan"
        description="Apakah Anda yakin ingin menghapus kegiatan ini? Data kegiatan akan dihapus permanen."
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
              className={`kk-modal-head ${modalMode === "edit" ? "is-orange" : "is-blue"}`}
            >
              <div className="kk-modal-title">
                {modalMode === "edit" ? "Edit Kegiatan" : "Tambah Kegiatan"}
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
                  placeholder="Tulis judul kegiatan..."
                />
              </div>

              <div className="kk-field">
                <div className="kk-label">Thumbnail</div>

                <div className="kk-thumbBoxWrap">
                  <label
                    className={`kk-thumb-upload ${thumbPreviewUrl ? "has-image" : ""}`}
                    style={
                      thumbPreviewUrl
                        ? { backgroundImage: `url(${thumbPreviewUrl})` }
                        : undefined
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDropFile}
                  >
                    {!thumbPreviewUrl && (
                      <div className="kk-thumbEmpty">
                        <FiUpload className="kk-ic kk-ic-upload" />
                        <div className="kk-thumbEmptyText">
                          Klik untuk pilih file
                        </div>
                        <div className="kk-thumbEmptySub">
                          atau drag & drop file di sini
                        </div>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
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
              </div>

              <div className="kk-twoCols">
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
                  <div className="kk-label">Tanggal Selesai</div>
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
              </div>

              <div className="kk-field">
                <div className="kk-label">
                  Lokasi <span className="kk-req">*</span>
                </div>
                <input
                  className="kk-input"
                  value={form.lokasi}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lokasi: e.target.value }))
                  }
                  placeholder="Masukkan lokasi..."
                />
              </div>

              <div className="kk-field">
                <div className="kk-label">Jumlah Peserta</div>
                <input
                  className="kk-input"
                  inputMode="numeric"
                  value={form.jumlah_peserta}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, jumlah_peserta: e.target.value }))
                  }
                  placeholder="Jumlah target peserta..."
                />
              </div>

              <div className="kk-field">
                <div className="kk-label">Deskripsi Kegiatan</div>
                <textarea
                  className="kk-textarea"
                  value={form.deskripsi}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, deskripsi: e.target.value }))
                  }
                  placeholder="Tulis deskripsi kegiatan..."
                  rows={5}
                />
              </div>

              <div className="kk-field kk-lastField">
                <div className="kk-label">Hasil Kegiatan</div>
                <textarea
                  className="kk-textarea"
                  value={form.hasil_kegiatan}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      hasil_kegiatan: e.target.value,
                    }))
                  }
                  placeholder="Tulis hasil kegiatan..."
                  rows={4}
                />
              </div>

              {formError && (
                <div className="kk-form-error kk-form-error-modal">
                  {formError}
                </div>
              )}
            </div>

            <div className="kk-modal-actions">
              <button
                className="kk-btn kk-btn-ghost"
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                Batal
              </button>

              <button
                className={`kk-btn ${modalMode === "edit" ? "kk-btn-orange" : "kk-btn-primary"}`}
                type="button"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving
                  ? "Menyimpan..."
                  : modalMode === "edit"
                    ? "Update"
                    : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="kk-detail-heroShade" />
              <button
                className="kk-detail-close"
                type="button"
                onClick={closeDetail}
              >
                <FiX />
              </button>

              <div className="kk-detail-heroContent">
                <span className={`kk-detail-status is-${detailKind}`}>
                  {statusLabel(detailItem.status)}
                </span>
                <div className="kk-detail-title">{detailItem.judul || "-"}</div>
                <div className="kk-detail-meta">
                  <span className="kk-detail-metaItem">
                    <FiCalendar />
                    {formatDate(detailItem.tgl_mulai || detailItem.tgl_upload)}
                  </span>
                  <span className="kk-detail-metaItem">
                    <FiMapPin />
                    {detailLokasi}
                  </span>
                  {Number.isFinite(Number(detailPeserta)) ? (
                    <span className="kk-detail-metaItem">
                      <FiUsers />
                      {detailPeserta} peserta
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="kk-detail-body">
              {detailKind === "reject" ? (
                <div className="kk-adminAlert">
                  <div className="kk-adminAlertTitle">Alasan Penolakan:</div>
                  <div className="kk-adminAlertText">
                    {pickFirst(detailItem, [
                      "catatan",
                      "catatan_admin",
                      "note",
                      "keterangan",
                    ]) || "-"}
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
                <div className="kk-detail-sectionTitle">Hasil Kegiatan</div>
                <div className="kk-detail-desc">
                  {detailItem.hasil_kegiatan || "-"}
                </div>
              </div>

              <div className="kk-detail-section">
                <div className="kk-detail-sectionTitle">
                  Anggota yang Terlibat
                </div>
                {detailAnggota.length ? (
                  <div className="kk-memberList">
                    {detailAnggota.map((name) => (
                      <span className="kk-memberChip" key={name}>
                        <FiUsers />
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="kk-detail-desc">-</div>
                )}
              </div>
            </div>

            <div className="kk-detail-actions">
              <button
                className="kk-btn kk-btn-ghost kk-detail-closeBtn"
                type="button"
                onClick={closeDetail}
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
