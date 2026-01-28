import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  FiFileText,
  FiUpload,
  FiEye,
  FiDownload,
  FiX,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import "./kelolaDataPosbankum.css";

const BUCKET = "posbankum-docs";
const TABLE = "data_posbankum";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export default function KelolaDataPosbankum({ profile }) {
  const fileInputRef = useRef(null);
  const posbankumId = profile?.id_posbankum ?? null;

  const [docs, setDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const [modalMode, setModalMode] = useState("upload");

  // row lama yang mau diganti (untuk edit)
  const [editRow, setEditRow] = useState(null);

  const items = useMemo(
    () => [
      { key: "sk_posbankum", label: "SK Posbankum" },
      { key: "sk_kadarkum", label: "SK Kadarkum" },
      { key: "sapras", label: "Sapras" },
      { key: "tagging_area", label: "Tagging Area" },
    ],
    [],
  );

  const loadDocs = useCallback(async () => {
    if (!posbankumId) return;
    setLoadingDocs(true);

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select(
          "id_data, kategori, path_berkas, tgl_upload, status_verifikasi, nama_berkas, mime_type, size_bytes",
        )
        .eq("id_posbankum", posbankumId)
        .order("tgl_upload", { ascending: false });

      if (error) throw error;

      const latest = {};
      for (const row of data ?? []) {
        if (!latest[row.kategori]) latest[row.kategori] = row; // ambil terbaru per kategori
      }
      setDocs(latest);
    } catch (e) {
      console.warn("loadDocs error:", e);
    } finally {
      setLoadingDocs(false);
    }
  }, [posbankumId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);
  const normStatus = (s) =>
    String(s || "")
      .trim()
      .toLowerCase();

  const isPending = (s) =>
    ["menunggu", "pending", "review", "verifikasi"].includes(normStatus(s));
  const isApproved = (s) =>
    ["disetujui", "approved", "valid", "diterima"].includes(normStatus(s));
  const isRejected = (s) =>
    ["ditolak", "rejected", "tolak"].includes(normStatus(s));

  const openUploadModal = (typeKey) => {
    setErr("");
    setSelectedFile(null);
    setDocType(typeKey);
    setModalMode("upload");
    setEditRow(null);
    setOpen(true);
  };

  const openChangeModal = (typeKey, row) => {
    setErr("");
    setSelectedFile(null);
    setDocType(typeKey);
    setModalMode("change");
    setEditRow(row || null);
    setOpen(true);
  };

  const closeModal = () => {
    if (uploading) return;
    setOpen(false);
    setDocType("");
    setSelectedFile(null);
    setErr("");
    setModalMode("upload");
    setEditRow(null);
  };

  const pickFile = () => {
    setErr("");
    fileInputRef.current?.click();
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;

    if (!ALLOWED_MIME.has(f.type)) {
      setErr("File harus PDF/JPG/PNG/WebP.");
      e.target.value = "";
      return;
    }

    const max = 10 * 1024 * 1024; // 10MB
    if (f.size > max) {
      setErr("Ukuran file maksimal 10MB.");
      e.target.value = "";
      return;
    }

    setSelectedFile(f);
  };

  const uploadNow = async () => {
    if (!posbankumId) return setErr("id_posbankum tidak ditemukan di profile.");
    if (!docType) return setErr("docType belum dipilih.");
    if (!selectedFile) return setErr("Pilih file dulu.");

    setUploading(true);
    setErr("");

    try {
      const safeName = selectedFile.name.replace(/[^\w.\-]+/g, "_");
      const path = `${posbankumId}/${docType}/${Date.now()}_${safeName}`;

      // 1) upload ke storage
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (upErr) {
        // pesan bucket belum dibuat
        if ((upErr.message || "").toLowerCase().includes("bucket")) {
          throw new Error(
            `Bucket "${BUCKET}" tidak ditemukan. Buat bucket di Supabase Storage atau cek VITE_SUPABASE_URL mengarah ke project yang benar.`,
          );
        }
        throw upErr;
      }

      // 2) simpan metadata ke data_posbankum (sesuai ERD kamu)
      const payload = {
        id_posbankum: posbankumId,
        kategori: docType,
        path_berkas: path,
        tgl_upload: new Date().toISOString(),
        status_verifikasi: "menunggu",
        nama_berkas: selectedFile.name,
        mime_type: selectedFile.type,
        size_bytes: selectedFile.size,
      };

      const { error: insErr } = await supabase.from(TABLE).insert(payload);
      if (insErr) throw insErr;

      await loadDocs();
      closeModal();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Upload gagal.");
    } finally {
      setUploading(false);
    }
  };
  const saveEdit = async () => {
    if (!posbankumId) return setErr("id_posbankum tidak ditemukan di profile.");
    if (!docType) return setErr("docType belum dipilih.");
    if (!selectedFile) return setErr("Pilih file dulu.");
    if (!editRow?.id_data)
      return setErr("Data lama tidak ditemukan untuk diedit.");

    setUploading(true);
    setErr("");

    try {
      // upload file baru
      const safeName = selectedFile.name.replace(/[^\w.\-]+/g, "_");
      const newPath = `${posbankumId}/${docType}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (upErr) throw upErr;

      // update row DB: replace path & metadata
      const { error: updErr } = await supabase
        .from(TABLE)
        .update({
          path_berkas: newPath,
          tgl_upload: new Date().toISOString(),
          status_verifikasi: "menunggu",
          nama_berkas: selectedFile.name,
          mime_type: selectedFile.type,
          size_bytes: selectedFile.size,
        })
        .eq("id_data", editRow.id_data);

      if (updErr) throw updErr;

      // (opsional) hapus file lama di storage kalau mau (nanti kita aktifkan)
      // if (editRow?.path_berkas) await supabase.storage.from(BUCKET).remove([editRow.path_berkas]);

      await loadDocs();
      closeModal();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Gagal menyimpan perubahan.");
    } finally {
      setUploading(false);
    }
  };
  const deleteDoc = async (row) => {
    if (!row?.id_data) return;

    const ok = confirm("Yakin ingin menghapus dokumen ini?");
    if (!ok) return;

    try {
      // hapus row DB
      const { error: delErr } = await supabase
        .from(TABLE)
        .delete()
        .eq("id_data", row.id_data);

      if (delErr) throw delErr;

      // hapus file storage (opsional tapi bagus)
      if (row.path_berkas) {
        await supabase.storage.from(BUCKET).remove([row.path_berkas]);
      }

      await loadDocs();
    } catch (e) {
      alert(e?.message || "Gagal menghapus dokumen.");
    }
  };

  const openSignedUrl = async (row, asDownload = false) => {
    try {
      if (!row?.path_berkas) return;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.path_berkas, 60 * 10);

      if (error) throw error;

      const url = data?.signedUrl;
      if (!url) throw new Error("Signed URL gagal dibuat.");

      const filename =
        row?.nama_berkas || row?.path_berkas?.split("/").pop() || "download";

      if (!asDownload) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(e?.message || "Gagal membuka file.");
    }
  };

  if (!posbankumId) {
    return (
      <section className="pbKD" style={{ padding: 18 }}>
        <div className="pbErrorBox">
          <b>Profile belum lengkap</b>
          <div style={{ marginTop: 8 }}>
            id_posbankum tidak ada di profiles untuk user ini.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pbKD">
      <div className="pbKDHero" />

      <div className="pbKDList">
        {items.map((it) => {
          const row = docs[it.key]; // bisa undefined
          const filename =
            row?.nama_berkas || row?.path_berkas?.split("/").pop() || "";

          return (
            <div className="pbKDRow" key={it.key}>
              <div className="pbKDLeft">
                <div className="pbKDIconBox">
                  <FiFileText />
                </div>
              </div>

              <div className="pbKDTitle">
                {it.label}
                {loadingDocs ? (
                  <span className="pbKDSub">Memuat...</span>
                ) : filename ? (
                  <span className="pbKDSub">{filename}</span>
                ) : (
                  <span className="pbKDSub">&nbsp;</span>
                )}
              </div>

              <div className="pbKDActions">
                {/* 1) belum ada row -> Upload */}
                {!row ? (
                  <button
                    className="pbKDUploadBtn"
                    type="button"
                    onClick={() => openUploadModal(it.key)}
                  >
                    <FiUpload /> Upload
                  </button>
                ) : isPending(row.status_verifikasi) ? (
                  /* 2) menunggu -> Lihat */
                  <button
                    className="pbKDIconBtn"
                    type="button"
                    title="Lihat"
                    disabled={!row?.path_berkas}
                    onClick={() => openSignedUrl(row, false)}
                  >
                    <FiEye />
                  </button>
                ) : isApproved(row.status_verifikasi) ? (
                  /* 3) disetujui -> Ajukan Perubahan (upload ulang) */
                  <button
                    className="pbKDUploadBtn"
                    type="button"
                    title="Ajukan Perubahan"
                    onClick={() => openChangeModal(it.key, row)}
                  >
                    <FiEdit2 /> 
                  </button>
                ) : isRejected(row.status_verifikasi) ? (
                  /* 4) ditolak -> Ajukan Perubahan + Hapus */
                  <>
                    <button
                      className="pbKDUploadBtn"
                      type="button"
                      title="Ajukan Perubahan"
                      onClick={() => openChangeModal(it.key, row)}
                    >
                      <FiEdit2 /> 
                    </button>

                    <button
                      className="pbKDIconBtn"
                      type="button"
                      title="Hapus"
                      onClick={() => deleteDoc(row)}
                    >
                      <FiTrash2 />
                    </button>
                  </>
                ) : (
                  /* fallback: minimal Lihat */
                  <button
                    className="pbKDIconBtn"
                    type="button"
                    title="Lihat"
                    disabled={!row?.path_berkas}
                    onClick={() => openSignedUrl(row, false)}
                  >
                    <FiEye />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="pbModalOverlay" role="dialog" aria-modal="true">
          <div className="pbModal">
            <div className="pbModalTop">
              <div className="pbModalHead" />
              <button
                className="pbModalClose"
                type="button"
                onClick={closeModal}
              >
                <FiX />
              </button>
            </div>

            <div className="pbModalBody">
              <div className="pbModalDropWrap">
                <button
                  type="button"
                  className="pbModalDrop"
                  onClick={pickFile}
                  disabled={uploading}
                >
                  <div className="pbModalDropInner">
                    <div className="pbModalDropIcon">
                      <FiUpload />
                    </div>
                    <div className="pbModalDropHint">
                      {selectedFile
                        ? selectedFile.name
                        : "Klik untuk pilih file (PDF/JPG/PNG)"}
                    </div>
                  </div>
                </button>
              </div>

              {err && <div className="pbModalErr">{err}</div>}

              <div className="pbModalActions">
                <button
                  className="pbModalBtn pbModalBtnPrimary"
                  type="button"
                  onClick={modalMode === "change" ? saveEdit : uploadNow}
                  disabled={uploading || !selectedFile}
                >
                  {uploading
                    ? "Memproses..."
                    : modalMode === "change"
                      ? "Simpan"
                      : "Upload"}
                </button>

                <button
                  className="pbModalBtn"
                  type="button"
                  onClick={closeModal}
                  disabled={uploading}
                >
                  Batal
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={onFileChange}
            />
          </div>
        </div>
      )}
    </section>
  );
}
