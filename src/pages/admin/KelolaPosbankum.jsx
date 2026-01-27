import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import "./kelolaPosbankum.css";

export default function KelolaPosbankum() {
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
  const PAGE_SIZE = 8;
  const [total, setTotal] = useState(0);

  // trigger refresh setelah CRUD
  const [reloadKey, setReloadKey] = useState(0);

  // ===== MODAL STATE (ADD/EDIT) =====
  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("add"); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [fNama, setFNama] = useState("");
  const [fKabupatenId, setFKabupatenId] = useState("");
  const [fKecamatanId, setFKecamatanId] = useState("");
  const [fKecamatanOpts, setFKecamatanOpts] = useState([]);
  const [fEmail, setFEmail] = useState("");
  const [fPassword, setFPassword] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // load kabupaten
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

  // load kecamatan filter (toolbar)
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

  // load kecamatan (modal)
  useEffect(() => {
    (async () => {
      setFKecamatanId((prev) => (fKabupatenId ? prev : ""));
      setFKecamatanOpts([]);

      if (!fKabupatenId) return;

      const { data, error } = await supabase
        .from("kecamatan")
        .select("id_kecamatan,nama")
        .eq("id_kabupaten", fKabupatenId)
        .order("nama", { ascending: true });

      if (error) {
        setErr(error.message);
        return;
      }
      setFKecamatanOpts(data ?? []);
    })();
  }, [fKabupatenId]);

  // reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [kabupatenId, kecamatanId, debouncedQ]);

  // fetch posbankum list
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

        // lookup kab/kec names for visible rows
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
    return Array.from(
      { length: Math.min(totalPages, maxShown) },
      (_, i) => i + 1,
    );
  }, [totalPages]);

  const resetForm = () => {
    setFNama("");
    setFKabupatenId("");
    setFKecamatanId("");
    setFEmail("");
    setFPassword("");
  };

  const openTambah = () => {
    setErr("");
    setMode("add");
    setEditingId(null);
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (row) => {
    setErr("");
    setMode("edit");
    setEditingId(row.id_posbankum);

    setFNama(row.nama ?? "");
    setFKabupatenId(row.id_kabupaten ?? "");
    setFKecamatanId(row.id_kecamatan ?? "");
    setFEmail(row.email_akun ?? "");
    setFPassword(""); // tidak disimpan

    setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false);
    setSaving(false);
  };

  // lock scroll + esc
  useEffect(() => {
    if (!openForm) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openForm]);

  // CREATE / UPDATE
  const onSimpan = async () => {
    if (saving) return;
    setErr("");

    if (!fNama.trim()) return setErr("Nama Posbankum wajib diisi.");
    if (!fKabupatenId) return setErr("Kabupaten wajib dipilih.");
    if (!fKecamatanId) return setErr("Kecamatan wajib dipilih.");
    if (!fEmail.trim()) return setErr("Email wajib diisi."); // email disimpan ke posbankum.email_akun
    if (mode === "add" && !fPassword.trim())
      return setErr("Password wajib diisi untuk akun baru.");

    setSaving(true);
    try {
      const payload = {
        nama: fNama.trim(),
        id_kabupaten: fKabupatenId,
        id_kecamatan: fKecamatanId,
        email_akun: fEmail.trim(),
      };

      if (mode === "add") {
        const { data: s, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;
        if (!s?.session?.access_token)
          throw new Error("Session hilang. Login ulang.");

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-posbankum-account`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${s.session.access_token}`,
          },
          body: JSON.stringify({
            nama: fNama.trim(),
            id_kabupaten: fKabupatenId,
            id_kecamatan: fKecamatanId,
            email: fEmail.trim(),
            password: fPassword.trim(),
          }),
        });

        const out = await res.json();
        if (!res.ok || out?.ok !== true) {
          throw new Error(
            out?.message || `Gagal membuat akun posbankum (HTTP ${res.status})`,
          );
        }

        alert("Akun posbankum (paralegal) berhasil dibuat.");
      } else {
        // update sementara masih langsung ke tabel
        const { error } = await supabase
          .from("posbankum")
          .update(payload)
          .eq("id_posbankum", editingId);
        if (error) throw error;
        alert("Posbankum berhasil diperbarui.");
      }

      closeForm();
      setReloadKey((x) => x + 1);
    } catch (e) {
      setErr(e?.message || "Gagal menyimpan posbankum");
    } finally {
      setSaving(false);
    }
  };

  // DELETE
  const onHapus = async (row) => {
    setErr("");
    if (!confirm(`Hapus Posbankum "${row.nama}"?`)) return;

    try {
      const { error } = await supabase
        .from("posbankum")
        .delete()
        .eq("id_posbankum", row.id_posbankum);

      if (error) throw error;

      alert("Posbankum berhasil dihapus.");
      setReloadKey((x) => x + 1);
    } catch (e) {
      setErr(e?.message || "Gagal menghapus posbankum");
    }
  };

  return (
    <section className="kpShell">
      <div className="kpHeaderRow">
        <div className="kpHeading">Kelola Posbankum</div>

        <button className="kpAddTop" type="button" onClick={openTambah}>
          Tambah Posbankum
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
            {q && (
              <button
                className="kpClear"
                type="button"
                onClick={() => setQ("")}
              >
                <FiX />
              </button>
            )}
          </div>

          <div className="kpFilters">
            <select
              className="kpSelect"
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

            <select
              className="kpSelect"
              value={kecamatanId}
              onChange={(e) => setKecamatanId(e.target.value)}
              disabled={!kabupatenId}
            >
              <option value="">Pilih Kecamatan</option>
              {kecamatanOpts.map((kc) => (
                <option key={kc.id_kecamatan} value={kc.id_kecamatan}>
                  {kc.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {err && <div className="kpError">{err}</div>}

        <div className="kpTableCard">
          <table className="kpTable">
            <thead>
              <tr>
                <th>Posbankum</th>
                <th>Email Akun</th>
                <th>Lokasi</th>
                <th style={{ textAlign: "center" }}>Aksi</th>
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
                    <td>{`Posbankum ${r.nama}`}</td>
                    <td className="kpMuted">{r.email_akun ?? "-"}</td>
                    <td className="kpMuted">{`${r.kecamatan_nama}, ${r.kabupaten_nama}`}</td>
                    <td>
                      <div className="kpActions">
                        <button
                          className="kpIcoBtn"
                          type="button"
                          onClick={() => openEdit(r)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          className="kpIcoBtn"
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
                  <td colSpan={4} className="kpEmpty">
                    Data tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="kpPager">
          <button
            className="kpNavBtn"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
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
            className="kpNextText"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Selanjutnya
          </button>

          <button
            className="kpNavBtn"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* ===== MODAL ADD/EDIT ===== */}
      {openForm && (
        <div
          className="kpModalOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={closeForm}
        >
          <div className="kpModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="kpModalHead">
              <div className="kpModalTitle">
                {mode === "add" ? "Tambah Posbankum" : "Edit Posbankum"}
              </div>
            </div>

            <div className="kpModalBody">
              <div className="kpFormGroup">
                <label className="kpLabel">Nama Posbankum</label>
                <input
                  className="kpInput"
                  placeholder="Masukkan Nama Posbankum"
                  value={fNama}
                  onChange={(e) => setFNama(e.target.value)}
                />
              </div>

              <div className="kpGrid2">
                <div className="kpFormGroup">
                  <label className="kpLabel">Kabupaten</label>
                  <select
                    className="kpInput"
                    value={fKabupatenId}
                    onChange={(e) => setFKabupatenId(e.target.value)}
                  >
                    <option value="">Pilih Kabupaten</option>
                    {kabupatenOpts.map((k) => (
                      <option key={k.id_kabupaten} value={k.id_kabupaten}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="kpFormGroup">
                  <label className="kpLabel">Kecamatan</label>
                  <select
                    className="kpInput"
                    value={fKecamatanId}
                    onChange={(e) => setFKecamatanId(e.target.value)}
                    disabled={!fKabupatenId}
                  >
                    <option value="">Pilih Kecamatan</option>
                    {fKecamatanOpts.map((kc) => (
                      <option key={kc.id_kecamatan} value={kc.id_kecamatan}>
                        {kc.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="kpGrid2">
                <div className="kpFormGroup">
                  <label className="kpLabel">Email</label>
                  <input
                    className="kpInput"
                    placeholder="Masukkan Email"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                  />
                </div>

                <div className="kpFormGroup">
                  <label className="kpLabel">Password</label>
                  <input
                    className="kpInput"
                    type="password"
                    placeholder="Buat Password (opsional)"
                    value={fPassword}
                    onChange={(e) => setFPassword(e.target.value)}
                  />
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
      )}
    </section>
  );
}
