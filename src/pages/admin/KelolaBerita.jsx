import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiEdit,
  FiEye,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import "./kelolaBerita.css";
import DeleteConfirmModal from "../../components/ui/DeleteConfirmModal";

const BUCKET_BERITA = "berita-images";
const KATEGORI_OPTIONS = [
  "Kegiatan",
  "Pelatihan",
  "Workshop",
  "Kunjungan",
  "Sosialisasi",
];

const formatDateID = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const excerptText = (value, max = 130) => {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Isi berita belum tersedia.";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
};

const cleanFilename = (name) =>
  String(name || "file")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isExternalUrl = (value) => /^https?:\/\//i.test(String(value || ""));
const isDataOrBlob = (value) => /^(data:|blob:)/i.test(String(value || ""));

function getStorageUrl(path) {
  if (!path) return "";
  if (isExternalUrl(path) || isDataOrBlob(path)) return path;
  const { data } = supabase.storage.from(BUCKET_BERITA).getPublicUrl(path);
  return data?.publicUrl || "";
}

function inferCategory(item) {
  const source =
    `${item?.kategori || ""} ${item?.judul || ""} ${item?.isi || ""}`.toLowerCase();
  if (source.includes("pelatihan")) return "Pelatihan";
  if (source.includes("workshop")) return "Workshop";
  if (source.includes("kunjungan")) return "Kunjungan";
  if (source.includes("sosialisasi")) return "Sosialisasi";
  return "Kegiatan";
}

async function detectOptionalColumns() {
  const out = { kategori: false };
  const { error } = await supabase.from("berita").select("kategori").limit(1);
  if (!error) out.kategori = true;
  return out;
}

export default function KelolaBerita({ currentUserId, currentUserName }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [authorMap, setAuthorMap] = useState(new Map());
  const [schemaInfo, setSchemaInfo] = useState({ kategori: false });
  const [formError, setFormError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeItem, setActiveItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    judul: "",
    isi: "",
    kategori: "",
    gambarFile: null,
  });
  const [existingImagePath, setExistingImagePath] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const info = await detectOptionalColumns();
        if (!isMounted) return;
        setSchemaInfo(info);
        await fetchBerita(info);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!(modalOpen || detailOpen || deleteOpen)) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (deleteOpen && !deleting) {
        setDeleteOpen(false);
        return;
      }
      if (detailOpen) {
        closeDetail();
        return;
      }
      if (modalOpen && !saving) {
        closeFormModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow || "";
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, detailOpen, deleteOpen, saving, deleting]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  async function fetchBerita(info = schemaInfo) {
    setLoading(true);
    try {
      const selectFields = info?.kategori
        ? "id_berita,id_user,judul,isi,gambar,tgl_publish,kategori"
        : "id_berita,id_user,judul,isi,gambar,tgl_publish";

      const { data, error } = await supabase
        .from("berita")
        .select(selectFields)
        .order("tgl_publish", { ascending: false });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const nextAuthorMap = new Map();
      const userIds = Array.from(
        new Set(rows.map((row) => row.id_user).filter(Boolean)),
      );

      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", userIds);

        if (!profileError && Array.isArray(profiles)) {
          profiles.forEach((profile) => {
            nextAuthorMap.set(profile.id, profile.full_name || "Admin");
          });
        }
      }

      setAuthorMap(nextAuthorMap);
      setItems(rows);
    } catch (error) {
      console.error(error);
      setFormError(error?.message || "Gagal memuat data berita.");
    } finally {
      setLoading(false);
    }
  }

  const normalizedItems = useMemo(() => {
    return items.map((item) => {
      return {
        ...item,
        kategori: String(item?.kategori || inferCategory(item)),
        authorName:
          authorMap.get(item?.id_user) ||
          currentUserName ||
          "Admin Kemenkumham Riau",
        imageUrl: getStorageUrl(item?.gambar),
      };
    });
  }, [items, authorMap, currentUserName]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return normalizedItems;
    return normalizedItems.filter((item) => {
      const haystack =
        `${item?.judul || ""} ${item?.isi || ""} ${item?.kategori || ""} ${item?.authorName || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [normalizedItems, search]);

  const resetForm = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm({
      judul: "",
      isi: "",
      kategori: KATEGORI_OPTIONS[0],
      gambarFile: null,
    });
    setExistingImagePath("");
    setImagePreview("");
    setFormError("");
    setActiveItem(null);
  };

  const openCreate = () => {
    resetForm();
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    resetForm();
    setModalMode("edit");
    setActiveItem(item);
    setExistingImagePath(item?.gambar || "");
    setImagePreview(item?.imageUrl || "");
    setForm({
      judul: item?.judul || "",
      isi: item?.isi || "",
      kategori: item?.kategori || KATEGORI_OPTIONS[0],
      gambarFile: null,
    });
    setModalOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const openDetail = (item) => {
    setActiveItem(item);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setActiveItem(null);
  };

  const openDelete = (item) => {
    setActiveItem(item);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setActiveItem(null);
  };

  const handlePickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setFormError("Format gambar harus PNG, JPG, atau JPEG.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran gambar maksimal 5MB.");
      event.target.value = "";
      return;
    }

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setFormError("");
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, gambarFile: file }));
    setImagePreview(previewUrl);
  };

  const clearImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm((prev) => ({ ...prev, gambarFile: null }));
    setExistingImagePath("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function uploadImage(file) {
    if (!file) return existingImagePath || "";

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const fileName = cleanFilename(file.name.replace(/\.[^.]+$/, ""));
    const filePath = `berita/${Date.now()}-${fileName || "gambar"}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_BERITA)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;
    return filePath;
  }

  async function removeStoredImage(path) {
    if (!path || isExternalUrl(path) || isDataOrBlob(path)) return;
    try {
      await supabase.storage.from(BUCKET_BERITA).remove([path]);
    } catch (error) {
      console.warn("Gagal menghapus gambar lama berita:", error);
    }
  }

  const handleSubmit = async () => {
    const judul = String(form.judul || "").trim();
    const isi = String(form.isi || "").trim();
    const kategori = String(form.kategori || KATEGORI_OPTIONS[0]).trim();

    if (!judul) {
      setFormError("Judul berita wajib diisi.");
      return;
    }
    if (!isi) {
      setFormError("Isi berita wajib diisi.");
      return;
    }
    if (!currentUserId) {
      setFormError("Sesi admin tidak ditemukan. Silakan login ulang.");
      return;
    }

    setSaving(true);
    setFormError("");

    const previousImagePath =
      modalMode === "edit" ? activeItem?.gambar || "" : "";
    let uploadedPath = existingImagePath || "";

    try {
      if (form.gambarFile) {
        uploadedPath = await uploadImage(form.gambarFile);
      }

      const payload = {
        judul,
        isi,
        gambar: uploadedPath || null,
      };

      if (schemaInfo.kategori)
        payload.kategori = kategori || KATEGORI_OPTIONS[0];

      if (modalMode === "create") {
        payload.id_user = currentUserId;
        payload.tgl_publish = new Date().toISOString();

        const { error } = await supabase.from("berita").insert(payload);
        if (error) throw error;

        setToast({ type: "success", message: "Berita berhasil ditambah!" });
      } else {
        const { error } = await supabase
          .from("berita")
          .update(payload)
          .eq("id_berita", activeItem?.id_berita);

        if (error) throw error;

        if (previousImagePath && previousImagePath !== uploadedPath) {
          await removeStoredImage(previousImagePath);
        }

        setToast({ type: "success", message: "Berita berhasil diperbarui!" });
      }

      closeFormModal();
      await fetchBerita(schemaInfo);
    } catch (error) {
      console.error(error);
      if (
        form.gambarFile &&
        uploadedPath &&
        uploadedPath !== existingImagePath
      ) {
        await removeStoredImage(uploadedPath);
      }
      setFormError(
        error?.message?.includes("bucket")
          ? "Upload gambar gagal. Jalankan SQL tambahan untuk bucket berita-images, lalu coba lagi."
          : error?.message || "Gagal menyimpan berita.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeItem?.id_berita) return;
    setDeleting(true);

    try {
      const oldImage = activeItem?.gambar || "";
      const { error } = await supabase
        .from("berita")
        .delete()
        .eq("id_berita", activeItem.id_berita);

      if (error) throw error;

      await removeStoredImage(oldImage);
      setDeleteOpen(false);
      setToast({ type: "success", message: "Berita berhasil dihapus!" });
      await fetchBerita(schemaInfo);
      setActiveItem(null);
    } catch (error) {
      console.error(error);
      setFormError(error?.message || "Gagal menghapus berita.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="kb-wrap">
      {toast ? (
        <div className={`kb-toast is-${toast.type || "success"}`} role="status">
          <div className="kb-toastIcon">✓</div>
          <div className="kb-toastText">{toast.message}</div>
          <button
            className="kb-toastClose"
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
          >
            <FiX />
          </button>
        </div>
      ) : null}

      <div className="kb-head">
        <div>
          <h2 className="kb-title">Kelola Berita</h2>
          <span className="kb-titleUnderline" aria-hidden="true" />
        </div>
      </div>

      <div className="kb-toolbar">
        <label className="kb-search" aria-label="Cari berita">
          <FiSearch className="kb-searchIcon" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari berita..."
          />
        </label>

        <button className="kb-addButton" type="button" onClick={openCreate}>
          <FiPlus />
          Tambah Berita
        </button>
      </div>

      {formError && !modalOpen && !deleteOpen ? (
        <div className="kb-alert">{formError}</div>
      ) : null}

      {loading ? (
        <div className="kb-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="kb-card is-skeleton" aria-hidden="true">
              <div className="kb-skeleton kb-skeletonMedia" />
              <div className="kb-cardBody">
                <div className="kb-skeleton kb-skeletonLine short" />
                <div className="kb-skeleton kb-skeletonLine" />
                <div className="kb-skeleton kb-skeletonLine" />
                <div className="kb-skeleton kb-skeletonLine short" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="kb-empty">Belum ada berita yang sesuai.</div>
      ) : (
        <div className="kb-grid">
          {filteredItems.map((item) => (
            <article key={item.id_berita} className="kb-card">
              <div
                className={`kb-cardMedia ${!item.imageUrl ? "is-placeholder" : ""}`}
                style={
                  item.imageUrl
                    ? { backgroundImage: `url(${item.imageUrl})` }
                    : undefined
                }
              >
                <span className="kb-badge">{item.kategori || "Kegiatan"}</span>
              </div>

              <div className="kb-cardBody">
                <h3 className="kb-cardTitle">{item.judul || "Tanpa Judul"}</h3>
                <p className="kb-cardText">{excerptText(item.isi, 140)}</p>

                <div className="kb-cardMeta">
                  <span className="kb-metaItem">
                    <FiCalendar />
                    {formatDateID(item.tgl_publish)}
                  </span>
                  <span className="kb-metaAuthor">{item.authorName}</span>
                </div>
              </div>

              <div className="kb-cardActions">
                <button
                  className="kb-btnView"
                  type="button"
                  onClick={() => openDetail(item)}
                >
                  <FiEye />
                  Lihat
                </button>
                <button
                  className="kb-btnIcon is-green"
                  type="button"
                  onClick={() => openEdit(item)}
                >
                  <FiEdit />
                </button>
                <button
                  className="kb-btnIcon is-red"
                  type="button"
                  onClick={() => openDelete(item)}
                >
                  <FiTrash2 />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="kb-overlay" onMouseDown={closeFormModal}>
          <div
            className="kb-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="kb-modalHead">
              <div className="kb-modalTitle">
                {modalMode === "edit" ? "Edit Berita" : "Tambah Berita Baru"}
              </div>
              <button
                className="kb-modalClose"
                type="button"
                onClick={closeFormModal}
                disabled={saving}
              >
                <FiX />
              </button>
            </div>

            <div className="kb-modalBody">
              <div className="kb-field">
                <label className="kb-label">
                  Judul Berita <span>*</span>
                </label>
                <input
                  className="kb-input"
                  type="text"
                  value={form.judul}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, judul: event.target.value }))
                  }
                  placeholder="Masukkan judul berita..."
                />
              </div>

              <div className="kb-formGrid">
                <div className="kb-field">
                  <label className="kb-label">Thumbnail</label>
                  <div className="kb-uploadWrap">
                    <label
                      className={`kb-uploadBox ${imagePreview ? "has-image" : ""}`}
                      style={
                        imagePreview
                          ? { backgroundImage: `url(${imagePreview})` }
                          : undefined
                      }
                    >
                      {!imagePreview ? (
                        <div className="kb-uploadEmpty">
                          <FiUpload className="kb-uploadIcon" />
                          <div className="kb-uploadText">
                            Klik untuk upload gambar
                          </div>
                          <div className="kb-uploadNote">
                            PNG, JPG, JPEG (Max 5MB)
                          </div>
                        </div>
                      ) : null}
                      <input
                        ref={fileInputRef}
                        className="kb-fileInput"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handlePickImage}
                      />
                    </label>

                    {imagePreview ? (
                      <button
                        className="kb-removeImage"
                        type="button"
                        onClick={clearImage}
                      >
                        <FiX />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="kb-field">
                  <label className="kb-label">Kategori</label>
                  <div className="kb-selectWrap">
                    <select
                      className="kb-select"
                      value={form.kategori}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          kategori: event.target.value,
                        }))
                      }
                    >
                      {KATEGORI_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="kb-field">
                <label className="kb-label">
                  Isi Berita <span>*</span>
                </label>
                <textarea
                  className="kb-textarea"
                  value={form.isi}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isi: event.target.value }))
                  }
                  placeholder="Tulis isi berita..."
                />
              </div>

              {formError ? (
                <div className="kb-formError">{formError}</div>
              ) : null}

              <div className="kb-modalActions">
                <button
                  className="kb-btnGhost"
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  className="kb-btnPrimary"
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen && activeItem ? (
        <div className="kb-overlay" onMouseDown={closeDetail}>
          <div
            className="kb-detailModal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`kb-detailHero ${!activeItem.imageUrl ? "is-placeholder" : ""}`}
              style={
                activeItem.imageUrl
                  ? { backgroundImage: `url(${activeItem.imageUrl})` }
                  : undefined
              }
            >
              <button
                className="kb-detailClose"
                type="button"
                onClick={closeDetail}
              >
                <FiX />
              </button>

              <div className="kb-detailOverlay" />
              <div className="kb-detailContent">
                <span className="kb-badge is-detail">
                  {activeItem.kategori || "Kegiatan"}
                </span>
                <h3 className="kb-detailTitle">
                  {activeItem.judul || "Tanpa Judul"}
                </h3>
                <div className="kb-detailMeta">
                  <span className="kb-metaItem">
                    <FiCalendar />
                    {formatDateID(activeItem.tgl_publish)}
                  </span>
                  <span className="kb-detailAuthor">
                    {activeItem.authorName}
                  </span>
                </div>
              </div>
            </div>

            <div className="kb-detailBody">
              {String(activeItem.isi || "")
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph.trim()}</p>
                ))}
            </div>

            <div className="kb-detailFooter">
              <button
                className="kb-btnGhost large"
                type="button"
                onClick={closeDetail}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DeleteConfirmModal
        open={deleteOpen && !!activeItem}
        title="Hapus Berita?"
        subtitle="Tindakan ini tidak dapat dibatalkan"
        description="Apakah Anda yakin ingin menghapus berita ini? Semua data dan gambar terkait akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        loading={deleting}
        onCancel={closeDelete}
        onConfirm={handleDelete}
      />
    </section>
  );
}
