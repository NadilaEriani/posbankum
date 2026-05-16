import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiMail,
  FiMapPin,
  FiEye,
  FiEyeOff,
  FiFilter,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import SuccessToast from "../../components/ui/SuccessToast";
import posbankumIcon from "../../assets/icon.png";
import "./manajemenAkun.css";

const PAGE_SIZE = 6;

function stripPosbankumPrefix(name) {
  const raw = String(name || "").trim();
  return raw.replace(/^posbankum\s+/i, "").trim();
}

function formatPosbankumName(name) {
  const cleanName = stripPosbankumPrefix(name);
  return cleanName ? `Posbankum ${cleanName}` : "Posbankum";
}

function KpDropdown({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
  withIcon = true,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const isEmptyValue = value === "" || value === null || value === undefined;
  const selectedLabel = !isEmptyValue
    ? (options || []).find((item) => String(item.value) === String(value))
        ?.label || ""
    : "";

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div
      className={`kpDropdown ${className} ${disabled ? "is-disabled" : ""} ${
        open ? "is-open" : ""
      }`}
      ref={wrapRef}
    >
      <button
        type="button"
        className="kpDropdownBtn"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-expanded={open}
      >
        {withIcon ? <FiFilter className="kpDropdownIcon" /> : null}
        <span
          className={`kpDropdownText ${selectedLabel ? "" : "is-placeholder"}`}
        >
          {selectedLabel || placeholder}
        </span>
        <FiChevronDown
          className={`kpDropdownChevron ${open ? "is-open" : ""}`}
        />
      </button>

      {open && !disabled ? (
        <div className="kpDropdownMenu" role="listbox">
          {(options || []).map((opt) => {
            const isActive = String(opt.value) === String(value);

            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`kpDropdownItem ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isActive ? <FiCheck className="kpDropdownCheck" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function ManajemenAkun() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [kabupatenId, setKabupatenId] = useState("");
  const [kecamatanId, setKecamatanId] = useState("");

  const [kabupatenOpts, setKabupatenOpts] = useState([]);
  const [kecamatanOpts, setKecamatanOpts] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [editingEmailBefore, setEditingEmailBefore] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [fNama, setFNama] = useState("");
  const [fKabupatenId, setFKabupatenId] = useState("");
  const [fKecamatanId, setFKecamatanId] = useState("");
  const [fKecamatanOpts, setFKecamatanOpts] = useState([]);
  const [fEmail, setFEmail] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    (async () => {
      setErr("");
      const { data, error } = await supabase
        .from("kabupaten")
        .select("id_kabupaten,nama")
        .order("nama", { ascending: true });

      if (error) {
        setErr(error.message);
        return;
      }

      setKabupatenOpts(data ?? []);
    })();
  }, []);

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

      if (error) {
        setErr(error.message);
        return;
      }

      setKecamatanOpts(data ?? []);
    })();
  }, [kabupatenId]);

  useEffect(() => {
    (async () => {
      setFKecamatanOpts([]);
      if (!fKabupatenId) {
        setFKecamatanId("");
        return;
      }

      const { data, error } = await supabase
        .from("kecamatan")
        .select("id_kecamatan,nama")
        .eq("id_kabupaten", fKabupatenId)
        .order("nama", { ascending: true });

      if (error) {
        setErr(error.message);
        return;
      }

      const options = data ?? [];
      setFKecamatanOpts(options);

      setFKecamatanId((prev) => {
        if (!prev) return "";
        return options.some((item) => item.id_kecamatan === prev) ? prev : "";
      });
    })();
  }, [fKabupatenId]);

  useEffect(() => {
    setPage(1);
  }, [kabupatenId, kecamatanId, debouncedQ]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        let query = supabase
          .from("posbankum")
          .select("id_posbankum,nama,id_kabupaten,id_kecamatan,email_akun", {
            count: "exact",
          })
          .order("nama", { ascending: true });

        if (kabupatenId) query = query.eq("id_kabupaten", kabupatenId);
        if (kecamatanId) query = query.eq("id_kecamatan", kecamatanId);
        if (debouncedQ) query = query.ilike("nama", `%${debouncedQ}%`);

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data: pos, error: posErr, count } = await query.range(from, to);
        if (posErr) throw posErr;

        const list = pos ?? [];
        setTotal(count ?? 0);

        const kabIds = Array.from(
          new Set(list.map((r) => r.id_kabupaten).filter(Boolean)),
        );
        const kecIds = Array.from(
          new Set(list.map((r) => r.id_kecamatan).filter(Boolean)),
        );

        const [kabRes, kecRes] = await Promise.all([
          kabIds.length
            ? supabase
                .from("kabupaten")
                .select("id_kabupaten,nama")
                .in("id_kabupaten", kabIds)
            : Promise.resolve({ data: [], error: null }),
          kecIds.length
            ? supabase
                .from("kecamatan")
                .select("id_kecamatan,nama")
                .in("id_kecamatan", kecIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (kabRes.error) throw kabRes.error;
        if (kecRes.error) throw kecRes.error;

        const kabMap = new Map(
          (kabRes.data ?? []).map((k) => [k.id_kabupaten, k.nama]),
        );
        const kecMap = new Map(
          (kecRes.data ?? []).map((k) => [k.id_kecamatan, k.nama]),
        );

        setRows(
          list.map((r) => ({
            ...r,
            kabupaten_nama: kabMap.get(r.id_kabupaten) ?? "-",
            kecamatan_nama: kecMap.get(r.id_kecamatan) ?? "-",
          })),
        );
      } catch (e) {
        setErr(e?.message || "Gagal memuat data posbankum");
      } finally {
        setLoading(false);
      }
    })();
  }, [kabupatenId, kecamatanId, debouncedQ, page, reloadKey]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const pageNums = useMemo(() => {
    const maxShown = 4;
    const shown = Math.min(totalPages, maxShown);
    return Array.from({ length: shown }, (_, i) => i + 1);
  }, [totalPages]);

  const resetForm = () => {
    setFNama("");
    setFKabupatenId("");
    setFKecamatanId("");
    setFEmail("");
    setFPassword("");
    setShowPassword(false);
  };

  const openTambah = () => {
    setErr("");
    setMode("add");
    setEditingId(null);
    setEditingEmailBefore("");
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (row) => {
    setErr("");
    setMode("edit");
    setEditingId(row.id_posbankum);
    setEditingEmailBefore(row.email_akun ?? "");

    setFNama(stripPosbankumPrefix(row.nama ?? ""));
    setFKabupatenId(row.id_kabupaten ?? "");
    setFKecamatanId(row.id_kecamatan ?? "");
    setFEmail(row.email_akun ?? "");
    setFPassword("");
    setShowPassword(false);

    setOpenForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setOpenForm(false);
    setSaving(false);
  };

  useEffect(() => {
    if (!openForm && !deleteTarget) return undefined;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        if (openForm) closeForm();
        if (deleteTarget && !deleting) setDeleteTarget(null);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openForm, deleteTarget, deleting, saving]);

  const callSupabaseFunction = async (functionName, body) => {
    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr) throw sErr;
    if (!s?.session?.access_token) {
      throw new Error("Session hilang. Login ulang.");
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error(
        "ENV Supabase belum lengkap. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.",
      );
    }

    const url = `${supabaseUrl}/functions/v1/${functionName}`;

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${s.session.access_token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError) {
      throw new Error(
        `Gagal menghubungi Edge Function ${functionName}. Pastikan file supabase/functions/${functionName}/index.ts sudah ditambahkan dan sudah di-deploy.`,
      );
    }

    const out = await res.json().catch(() => ({}));
    if (!res.ok || out?.ok !== true) {
      throw new Error(
        out?.message ||
          `Gagal menjalankan Edge Function ${functionName} (HTTP ${res.status})`,
      );
    }

    return out;
  };

  const onSimpan = async () => {
    if (saving) return;
    setErr("");

    if (!fNama.trim()) return setErr("Nama Posbankum wajib diisi.");
    if (!fKabupatenId) return setErr("Kabupaten wajib dipilih.");
    if (!fKecamatanId) return setErr("Kecamatan wajib dipilih.");
    if (!fEmail.trim()) return setErr("Email wajib diisi.");
    if (mode === "add" && !fPassword.trim()) {
      return setErr("Password wajib diisi untuk akun baru.");
    }

    setSaving(true);

    try {
      const payload = {
        nama: stripPosbankumPrefix(fNama.trim()),
        id_kabupaten: fKabupatenId,
        id_kecamatan: fKecamatanId,
        email_akun: fEmail.trim(),
      };

      if (mode === "add") {
        await callSupabaseFunction("create-posbankum-account", {
          nama: payload.nama,
          id_kabupaten: fKabupatenId,
          id_kecamatan: fKecamatanId,
          email: fEmail.trim(),
          password: fPassword.trim(),
        });

        setSuccessMessage("Akun posbankum berhasil ditambah!");
      } else {
        const passwordBaru = fPassword.trim();
        const emailBerubah = fEmail.trim() !== editingEmailBefore;

        if (passwordBaru || emailBerubah) {
          await callSupabaseFunction("update-posbankum-account", {
            id_posbankum: editingId,
            nama: payload.nama,
            id_kabupaten: fKabupatenId,
            id_kecamatan: fKecamatanId,
            email: fEmail.trim(),
            password: passwordBaru || undefined,
          });
        } else {
          const { error } = await supabase
            .from("posbankum")
            .update(payload)
            .eq("id_posbankum", editingId);

          if (error) throw error;
        }

        setSuccessMessage("Data Posbankum berhasil diperbarui!");
      }

      setOpenForm(false);
      setReloadKey((x) => x + 1);
    } catch (e) {
      setErr(e?.message || "Gagal menyimpan posbankum");
    } finally {
      setSaving(false);
    }
  };

  const onHapus = (row) => {
    setErr("");
    setDeleteTarget(row);
  };

  const confirmHapus = async () => {
    if (!deleteTarget || deleting) return;

    setErr("");
    setDeleting(true);

    try {
      await callSupabaseFunction("delete-posbankum-account", {
        id_posbankum: deleteTarget.id_posbankum,
        email: String(deleteTarget.email_akun || "")
          .trim()
          .toLowerCase(),
      });

      setSuccessMessage("Akun Posbankum berhasil dihapus!");
      setReloadKey((x) => x + 1);
      setDeleteTarget(null);
    } catch (e) {
      setErr(e?.message || "Gagal menghapus akun Posbankum");
    } finally {
      setDeleting(false);
    }
  };

  const modalTitle =
    mode === "add" ? "Tambah Posbankum Baru" : "Edit Posbankum";
  const passwordPlaceholder =
    mode === "add"
      ? "••••••••••"
      : "Kosongkan jika tidak ingin mengganti password";

  return (
    <section className="kpShell">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />

      <div className="kpHeaderRow">
        <div className="kpHeadingWrap">
          <h1 className="kpHeading">Kelola Posbankum</h1>
        </div>

        <button className="kpAddTop" type="button" onClick={openTambah}>
          <FiPlus />
          <span>Tambah Posbankum</span>
        </button>
      </div>

      <div className="kpPanel">
        <div className="kpToolbar">
          <div className="kpSearch">
            <FiSearch className="kpSearchIco" />
            <input
              className="kpSearchInput"
              placeholder="Pencarian..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q ? (
              <button
                className="kpClear"
                type="button"
                onClick={() => setQ("")}
                aria-label="Bersihkan pencarian"
              >
                <FiX />
              </button>
            ) : null}
          </div>

          <div className="kpFilters">
            <KpDropdown
              className="kpFilterDropdown"
              value={kabupatenId}
              onChange={setKabupatenId}
              placeholder="Pilih Kabupaten"
              options={[
                { value: "", label: "Semua" },
                ...kabupatenOpts.map((k) => ({
                  value: k.id_kabupaten,
                  label: k.nama,
                })),
              ]}
            />

            <KpDropdown
              className="kpFilterDropdown"
              value={kecamatanId}
              onChange={setKecamatanId}
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
          </div>
        </div>
      </div>

      {err ? <div className="kpError">{err}</div> : null}

      <div className="kpTableCard">
        <table className="kpTable">
          <thead>
            <tr>
              <th>Posbankum</th>
              <th>Email Akun</th>
              <th>Lokasi</th>
              <th className="kpActionHead">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="kpEmpty">
                  Memuat data...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id_posbankum}>
                  <td>
                    <div className="kpPosCell">
                      <span className="kpPosIconBox" aria-hidden="true">
                        <img src={posbankumIcon} alt="" />
                      </span>
                      <span className="kpPosName">
                        {formatPosbankumName(r.nama)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="kpInfoCell">
                      <FiMail />
                      <span>{r.email_akun ?? "-"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="kpInfoCell">
                      <FiMapPin />
                      <span>{`${r.kecamatan_nama}, ${r.kabupaten_nama}`}</span>
                    </div>
                  </td>
                  <td>
                    <div className="kpActions">
                      <button
                        className="kpIcoBtn is-edit"
                        type="button"
                        onClick={() => openEdit(r)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <FiEdit2 />
                      </button>

                      <button
                        className="kpIcoBtn is-delete"
                        type="button"
                        onClick={() => onHapus(r)}
                        aria-label="Hapus"
                        title="Hapus"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="kpEmptyCell">
                  <div className="kpEmptyState">
                    <div className="kpEmptyIcon" aria-hidden="true">
                      <img src={posbankumIcon} alt="" />
                    </div>
                    <h2>Tidak Ada Akun Ditemukan</h2>
                    <p>
                      Tidak ada akun posbankum yang sesuai dengan pencarian atau
                      filter yang dipilih.
                    </p>
                    <button
                      className="kpEmptyBtn"
                      type="button"
                      onClick={() => {
                        setQ("");
                        setKabupatenId("");
                        setKecamatanId("");
                        setPage(1);
                      }}
                    >
                      Reset Filter
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 ? (
          <div className="kpPager">
            <button
              className="kpNavBtn"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
            >
              <FiChevronLeft />
            </button>

            {pageNums.map((n) => (
              <button
                key={n}
                className={`kpPageBtn ${page === n ? "is-active" : ""}`}
                type="button"
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}

            <button
              className="kpNavBtn"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
            >
              <FiChevronRight />
            </button>
          </div>
        ) : null}
      </div>

      {deleteTarget ? (
        <div
          className="kpDeleteOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="kpDeleteModal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="kpDeleteBody">
              <div className="kpDeleteIcon" aria-hidden="true">
                <FiAlertTriangle />
              </div>

              <h2 className="kpDeleteTitle">Hapus Posbankum?</h2>
              <p className="kpDeleteText">
                Anda yakin ingin menghapus
                <br />
                <strong>{formatPosbankumName(deleteTarget.nama)}?</strong>
              </p>
              <p className="kpDeleteDesc">
                Data yang dihapus tidak dapat dikembalikan.
              </p>
            </div>

            <div className="kpDeleteFoot">
              <button
                className="kpBtnGhost"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                className="kpBtnDanger"
                type="button"
                onClick={confirmHapus}
                disabled={deleting}
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openForm ? (
        <div
          className="kpModalOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={closeForm}
        >
          <div className="kpModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="kpModalHead">
              <div className="kpModalTitle">{modalTitle}</div>
              <button
                className="kpModalClose"
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Tutup modal"
              >
                <FiX />
              </button>
            </div>

            <div className="kpModalBody">
              <div className="kpFormGroup">
                <label className="kpLabel" htmlFor="nama-posbankum">
                  Nama Posbankum
                </label>
                <input
                  id="nama-posbankum"
                  className="kpInput"
                  placeholder="Contoh: Air Hitam"
                  value={fNama}
                  onChange={(e) => setFNama(e.target.value)}
                />
              </div>

              <div className="kpGrid2">
                <div className="kpFormGroup">
                  <label className="kpLabel" htmlFor="kabupaten-posbankum">
                    Kabupaten
                  </label>
                  <KpDropdown
                    className="kpFormDropdown"
                    value={fKabupatenId}
                    onChange={setFKabupatenId}
                    placeholder="Pilih Kabupaten"
                    withIcon={false}
                    options={kabupatenOpts.map((k) => ({
                      value: k.id_kabupaten,
                      label: k.nama,
                    }))}
                  />
                </div>

                <div className="kpFormGroup">
                  <label className="kpLabel" htmlFor="kecamatan-posbankum">
                    Kecamatan
                  </label>
                  <KpDropdown
                    className="kpFormDropdown"
                    value={fKecamatanId}
                    onChange={setFKecamatanId}
                    placeholder="Pilih Kecamatan"
                    disabled={!fKabupatenId}
                    withIcon={false}
                    options={fKecamatanOpts.map((kc) => ({
                      value: kc.id_kecamatan,
                      label: kc.nama,
                    }))}
                  />
                </div>
              </div>

              <div className="kpGrid2">
                <div className="kpFormGroup">
                  <label className="kpLabel" htmlFor="email-posbankum">
                    Email
                  </label>
                  <input
                    id="email-posbankum"
                    className="kpInput"
                    placeholder="airhitam@gmail.com"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                  />
                </div>

                <div className="kpFormGroup">
                  <label className="kpLabel" htmlFor="password-posbankum">
                    {mode === "edit" ? "Password Baru" : "Password"}
                  </label>
                  <div className="kpPasswordWrap">
                    <input
                      id="password-posbankum"
                      className="kpInput kpPasswordInput"
                      type={showPassword ? "text" : "password"}
                      placeholder={passwordPlaceholder}
                      value={fPassword}
                      onChange={(e) => setFPassword(e.target.value)}
                      autoComplete="new-password"
                      spellCheck="false"
                    />
                    <button
                      className="kpEyeBtn"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="kpModalFoot">
              <button
                className="kpBtnGhost"
                type="button"
                onClick={closeForm}
                disabled={saving}
              >
                Batal
              </button>
              <button
                className="kpBtnPrimary"
                type="button"
                onClick={onSimpan}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
