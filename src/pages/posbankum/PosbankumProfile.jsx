import { BiInfoCircle } from "react-icons/bi";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import posbankumIcon from "../../assets/icon.png";
import burung5 from "../../assets/burung5.png";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiUser,
  FiPlus,
  FiTrash2,
  FiX,
  FiEyeOff,
  FiSave,
  FiEdit,
  FiUsers,
  FiCheckCircle,
} from "react-icons/fi";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { FiKey } from "react-icons/fi";
import { BiLockAlt } from "react-icons/bi";
import { IoAlertCircleOutline } from "react-icons/io5";
import { BsTelephone } from "react-icons/bs";
import { HiOutlineCheckCircle } from "react-icons/hi";
import "./posbankumProfile.css";
import SuccessToast from "../../components/ui/SuccessToast";

const EMPTY_FORM = {
  nama: "",
  email_akun: "",
  nomor_tlp: "",
  alamat: "",
  kode_pos: "",
  id_kabupaten: "",
  id_kecamatan: "",
};

const EMPTY_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function friendlyError(error) {
  return error?.message || "Terjadi kesalahan. Silakan coba lagi.";
}

function isRlsPolicyError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();

  return (
    error?.code === "42501" ||
    message.includes("row-level security") ||
    message.includes("violates row-level security policy") ||
    message.includes("permission denied")
  );
}

function profileSaveError(error) {
  if (isRlsPolicyError(error)) {
    return "Data profil utama berhasil diproses, tetapi data paralegal belum bisa disimpan karena RLS tabel paralegal_members belum mengizinkan akun Posbankum menambah/mengubah paralegal. Jalankan SQL policy paralegal_members yang diberikan Jarvis, lalu simpan ulang profil.";
  }

  return friendlyError(error);
}

function normalizeIndonesianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}

function phoneWithIndonesiaPrefix(value) {
  return normalizeIndonesianPhone(value) || "+62";
}

function hasCompletedPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 2;
}

function formatPosbankumDisplayName(value) {
  const name = String(value || "").trim();
  if (!name) return "Posbankum";
  return /^posbankum\b/i.test(name) ? name : `Posbankum ${name}`;
}

function isUuid(value) {
  return UUID_REGEX.test(String(value || "").trim());
}

function buildInitialParalegal() {
  return {
    id: `tmp-${Date.now()}`,
    nama_paralegal: "",
    nomor_telepon: "",
    is_primary: true,
    isTemp: true,
  };
}

function buildTempParalegal(seed, nama = "", nomor = "", isPrimary = false) {
  return {
    id: `tmp-${seed}-${Date.now()}`,
    nama_paralegal: nama,
    nomor_telepon: nomor,
    is_primary: isPrimary,
    isTemp: true,
  };
}

function computeProfileComplete(form, paralegals) {
  const baseComplete = [
    form.nama,
    form.email_akun,
    form.alamat,
    form.kode_pos,
    form.id_kabupaten,
    form.id_kecamatan,
  ].every((item) => String(item || "").trim());

  const validParalegal = (paralegals || []).some(
    (item) =>
      String(item?.nama_paralegal || "").trim() &&
      hasCompletedPhone(item?.nomor_telepon),
  );

  return baseComplete && validParalegal;
}

function validateParalegals(paralegals) {
  const next = [];
  let hasAny = false;

  (paralegals || []).forEach((item, index) => {
    const errors = {};
    const nama = String(item?.nama_paralegal || "").trim();
    const nomor = String(item?.nomor_telepon || "").trim();
    const hasPhone = hasCompletedPhone(nomor);

    if (index === 0) {
      if (!nama) errors.nama_paralegal = "Nama paralegal utama wajib diisi.";
      if (!hasPhone) {
        errors.nomor_telepon = "Nomor telepon wajib diisi.";
      }
    }

    if ((nama && !hasPhone) || (!nama && hasPhone)) {
      if (!nama) errors.nama_paralegal = "Nama paralegal wajib diisi.";
      if (!hasPhone) {
        errors.nomor_telepon = "Nomor telepon wajib diisi.";
      }
    }

    if (nama && hasPhone) hasAny = true;
    next.push(errors);
  });

  return { next, hasAny };
}

function validatePassword(values) {
  const errors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Password saat ini wajib diisi.";
  }
  if (!values.newPassword) {
    errors.newPassword = "Password baru wajib diisi.";
  } else if (values.newPassword.length < 6) {
    errors.newPassword = "Minimal 6 karakter.";
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = "Konfirmasi password wajib diisi.";
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "Konfirmasi password belum sama.";
  }

  return errors;
}

export default function PosbankumProfile({
  profile,
  forceCompletion,
  onBack,
  onSaved,
  onCompletenessChange,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [schemaNotice, setSchemaNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [showCompletionGate, setShowCompletionGate] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState(EMPTY_FORM);
  const [paralegals, setParalegals] = useState([buildInitialParalegal()]);
  const [initialParalegals, setInitialParalegals] = useState([
    buildInitialParalegal(),
  ]);
  const [paralegalErrors, setParalegalErrors] = useState([{}]);
  const [kabupatenList, setKabupatenList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [hasParalegalTable, setHasParalegalTable] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD);
  const [passwordError, setPasswordError] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const savedProfileComplete = useMemo(
    () => computeProfileComplete(initialForm, initialParalegals),
    [initialForm, initialParalegals],
  );

  useEffect(() => {
    if (loading) return;
    onCompletenessChange(savedProfileComplete);
  }, [loading, savedProfileComplete, onCompletenessChange]);

  useEffect(() => {
    const shouldShowGate = forceCompletion && !savedProfileComplete;
    setShowCompletionGate(shouldShowGate);
    if (shouldShowGate) {
      setEditing(false);
    }
  }, [forceCompletion, savedProfileComplete]);

  useEffect(() => {
    let alive = true;

    async function loadReference() {
      try {
        const { data, error } = await supabase
          .from("kabupaten")
          .select("id_kabupaten, nama")
          .order("nama", { ascending: true });
        if (error) throw error;
        if (alive) setKabupatenList(data || []);
      } catch {
        if (alive) setKabupatenList([]);
      }
    }

    loadReference();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadKecamatanByKabupaten() {
      if (!form.id_kabupaten || !isUuid(form.id_kabupaten)) {
        if (alive) setKecamatanList([]);
        return;
      }

      const { data, error } = await supabase
        .from("kecamatan")
        .select("id_kecamatan, nama")
        .eq("id_kabupaten", form.id_kabupaten)
        .order("nama", { ascending: true });

      if (!alive) return;
      if (error) {
        setKecamatanList([]);
        return;
      }

      setKecamatanList(data || []);
    }

    loadKecamatanByKabupaten();
    return () => {
      alive = false;
    };
  }, [form.id_kabupaten]);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      if (!profile?.id_posbankum) {
        if (alive) setLoading(false);
        return;
      }

      setLoading(true);
      setSubmitError("");
      setSchemaNotice("");

      try {
        const { data: row, error } = await supabase
          .from("posbankum")
          .select(
            "id_posbankum, nama, email_akun, nomor_tlp, alamat, kode_pos, id_kabupaten, id_kecamatan, nama_paralegal, jml_paralegal",
          )
          .eq("id_posbankum", profile.id_posbankum)
          .maybeSingle();

        if (error) throw error;

        let nextParalegals = [buildInitialParalegal()];

        const membersResponse = await supabase
          .from("paralegal_members")
          .select(
            "id_paralegal, nama_paralegal, nomor_telepon, is_primary, created_at",
          )
          .eq("id_posbankum", profile.id_posbankum)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true });

        if (membersResponse.error) {
          setHasParalegalTable(false);
          setSchemaNotice(
            isRlsPolicyError(membersResponse.error)
              ? "Akses membaca data paralegal belum diizinkan oleh RLS tabel paralegal_members. Jalankan SQL policy paralegal_members agar data paralegal bisa dibaca dan disimpan."
              : "Untuk menyimpan banyak paralegal secara penuh, jalankan SQL tambahan tabel paralegal_members.",
          );

          nextParalegals = [
            buildTempParalegal(
              `legacy-${profile.id_posbankum}`,
              row?.nama_paralegal || "",
              normalizeIndonesianPhone(row?.nomor_tlp || ""),
              true,
            ),
          ];
        } else {
          setHasParalegalTable(true);
          const mapped = (membersResponse.data || []).map((item, index) => ({
            id: item.id_paralegal,
            nama_paralegal: item.nama_paralegal || "",
            nomor_telepon: normalizeIndonesianPhone(item.nomor_telepon || ""),
            is_primary: index === 0 ? true : !!item.is_primary,
          }));

          if (mapped.length) {
            nextParalegals = mapped;
          } else {
            nextParalegals = [
              buildTempParalegal(
                `legacy-${profile.id_posbankum}`,
                row?.nama_paralegal || "",
                normalizeIndonesianPhone(row?.nomor_tlp || ""),
                true,
              ),
            ];
          }
        }

        const nextForm = {
          nama: row?.nama || "",
          email_akun: row?.email_akun || profile?.email || "",
          nomor_tlp: normalizeIndonesianPhone(row?.nomor_tlp || ""),
          alamat: row?.alamat || "",
          kode_pos: row?.kode_pos || "",
          id_kabupaten: row?.id_kabupaten || "",
          id_kecamatan: row?.id_kecamatan || "",
        };

        if (!alive) return;
        setForm(nextForm);
        setInitialForm(nextForm);
        setParalegals(nextParalegals);
        setInitialParalegals(nextParalegals);
        setParalegalErrors(nextParalegals.map(() => ({})));
      } catch (error) {
        if (!alive) return;
        setSubmitError(friendlyError(error));
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, [profile?.id_posbankum, profile?.email]);

  const selectedKabupaten = useMemo(
    () => kabupatenList.find((item) => item.id_kabupaten === form.id_kabupaten),
    [kabupatenList, form.id_kabupaten],
  );

  const selectedKecamatan = useMemo(
    () => kecamatanList.find((item) => item.id_kecamatan === form.id_kecamatan),
    [kecamatanList, form.id_kecamatan],
  );

  const paralegalCount = useMemo(
    () =>
      paralegals.filter(
        (item) =>
          String(item?.nama_paralegal || "").trim() &&
          hasCompletedPhone(item?.nomor_telepon),
      ).length,
    [paralegals],
  );

  const primaryParalegalPhone = useMemo(
    () => paralegals[0]?.nomor_telepon || form.nomor_tlp || "",
    [form.nomor_tlp, paralegals],
  );

  const handleParalegalChange = (index, field, value) => {
    setParalegals((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "nomor_telepon"
                  ? phoneWithIndonesiaPrefix(value)
                  : value,
            }
          : item,
      ),
    );
  };

  const addParalegal = () => {
    setParalegals((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}-${prev.length}`,
        nama_paralegal: "",
        nomor_telepon: "+62",
        is_primary: false,
        isTemp: true,
      },
    ]);
    setParalegalErrors((prev) => [...prev, {}]);
  };

  const removeParalegal = (index) => {
    if (index === 0) return;

    setParalegals((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setParalegalErrors((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleCancel = () => {
    setForm(initialForm);
    setParalegals(initialParalegals);
    setParalegalErrors(initialParalegals.map(() => ({})));
    setSubmitError("");

    if (forceCompletion && !savedProfileComplete) {
      setShowCompletionGate(true);
      setEditing(false);
      return;
    }

    setEditing(false);
  };

  const syncParalegalTable = async (rows, posbankumId) => {
    if (!hasParalegalTable) return rows;

    const cleanRows = rows
      .filter(
        (item) =>
          String(item?.nama_paralegal || "").trim() &&
          hasCompletedPhone(item?.nomor_telepon),
      )
      .map((item, index) => ({
        id_paralegal: isUuid(item.id) ? item.id : undefined,
        id_posbankum: posbankumId,
        nama_paralegal: String(item.nama_paralegal || "").trim(),
        nomor_telepon: phoneWithIndonesiaPrefix(item.nomor_telepon),
        is_primary: index === 0,
      }));

    const { data: currentRows, error: currentError } = await supabase
      .from("paralegal_members")
      .select("id_paralegal")
      .eq("id_posbankum", posbankumId);

    if (currentError) throw currentError;

    const keepIds = cleanRows
      .map((item) => item.id_paralegal)
      .filter((id) => isUuid(id));

    const deleteIds = (currentRows || [])
      .map((item) => item.id_paralegal)
      .filter((id) => isUuid(id) && !keepIds.includes(id));

    if (deleteIds.length) {
      const { error: unlinkError } = await supabase
        .from("pengaduan")
        .update({ id_paralegal: null })
        .in("id_paralegal", deleteIds);

      if (unlinkError) throw unlinkError;

      const { error } = await supabase
        .from("paralegal_members")
        .delete()
        .in("id_paralegal", deleteIds);
      if (error) throw error;
    }

    for (const item of cleanRows) {
      if (isUuid(item.id_paralegal)) {
        const { error } = await supabase
          .from("paralegal_members")
          .update({
            nama_paralegal: item.nama_paralegal,
            nomor_telepon: item.nomor_telepon,
            is_primary: item.is_primary,
          })
          .eq("id_paralegal", item.id_paralegal);
        if (error) throw error;
      } else {
        const insertPayload = {
          id_posbankum: item.id_posbankum,
          nama_paralegal: item.nama_paralegal,
          nomor_telepon: item.nomor_telepon,
          is_primary: item.is_primary,
        };
        const { error } = await supabase
          .from("paralegal_members")
          .insert(insertPayload);
        if (error) throw error;
      }
    }

    const { data: refreshedRows, error: refreshedError } = await supabase
      .from("paralegal_members")
      .select(
        "id_paralegal, nama_paralegal, nomor_telepon, is_primary, created_at",
      )
      .eq("id_posbankum", posbankumId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (refreshedError) throw refreshedError;

    return (refreshedRows || []).map((item, index) => ({
      id: item.id_paralegal,
      nama_paralegal: item.nama_paralegal || "",
      nomor_telepon: normalizeIndonesianPhone(item.nomor_telepon || ""),
      is_primary: index === 0 ? true : !!item.is_primary,
    }));
  };

  const handleSave = async () => {
    if (!profile?.id_posbankum || saving) return;

    const { next, hasAny } = validateParalegals(paralegals);
    setParalegalErrors(next);

    const requiredPosbankumFields = [
      form.nama,
      initialForm.email_akun,
      form.alamat,
      form.kode_pos,
      form.id_kabupaten,
      form.id_kecamatan,
    ].every((item) => String(item || "").trim());

    if (!hasAny) {
      setSubmitError("Minimal 1 paralegal wajib diisi.");
      return;
    }

    if (!requiredPosbankumFields) {
      setSubmitError("Lengkapi seluruh informasi Posbankum terlebih dahulu.");
      return;
    }

    if (!isUuid(form.id_kabupaten) || !isUuid(form.id_kecamatan)) {
      setSubmitError(
        "Kabupaten dan kecamatan harus dipilih dari daftar yang tersedia.",
      );
      return;
    }

    if (next.some((item) => Object.keys(item).length)) {
      setSubmitError("Periksa kembali data paralegal yang belum lengkap.");
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      const cleanParalegals = paralegals
        .filter(
          (item) =>
            String(item?.nama_paralegal || "").trim() &&
            hasCompletedPhone(item?.nomor_telepon),
        )
        .map((item, index) => ({
          ...item,
          nama_paralegal: String(item.nama_paralegal || "").trim(),
          nomor_telepon: phoneWithIndonesiaPrefix(item.nomor_telepon),
          is_primary: index === 0,
        }));

      const primaryPhone = cleanParalegals[0]?.nomor_telepon || "";

      const payload = {
        nama: form.nama.trim(),
        email_akun: String(
          initialForm.email_akun || form.email_akun || "",
        ).trim(),
        nomor_tlp: primaryPhone,
        alamat: form.alamat.trim(),
        kode_pos: form.kode_pos.trim(),
        id_kabupaten: form.id_kabupaten,
        id_kecamatan: form.id_kecamatan,
        jml_paralegal: cleanParalegals.length,
        nama_paralegal: cleanParalegals[0]?.nama_paralegal || "",
      };

      const { data: savedRow, error } = await supabase
        .from("posbankum")
        .update(payload)
        .eq("id_posbankum", profile.id_posbankum)
        .select("id_posbankum")
        .maybeSingle();

      if (error) throw error;
      if (!savedRow?.id_posbankum) {
        throw new Error(
          "Data Posbankum tidak ditemukan atau tidak punya izin untuk diperbarui.",
        );
      }

      const syncedParalegals = await syncParalegalTable(
        cleanParalegals,
        profile.id_posbankum,
      );

      const finalParalegals =
        syncedParalegals && syncedParalegals.length
          ? syncedParalegals
          : cleanParalegals.length
            ? cleanParalegals
            : [buildInitialParalegal()];

      const nextForm = { ...form, nomor_tlp: primaryPhone };
      setInitialForm(nextForm);
      setInitialParalegals(finalParalegals);
      setParalegals(finalParalegals);
      setParalegalErrors(finalParalegals.map(() => ({})));
      setEditing(false);
      setShowCompletionGate(false);

      onSaved({
        nama: payload.nama,
        alamat: payload.alamat,
        nomor_tlp: payload.nomor_tlp,
        email_akun: payload.email_akun,
        kabupaten: selectedKabupaten?.nama || "",
        kecamatan: selectedKecamatan?.nama || "",
        jml_paralegal: cleanParalegals.length,
        nama_paralegal: cleanParalegals[0]?.nama_paralegal || "",
      });

      setSuccessMessage("Profil Posbankum berhasil diperbarui!");
    } catch (error) {
      setSubmitError(profileSaveError(error));
    } finally {
      setSaving(false);
    }
  };

  const closePasswordModal = () => {
    if (passwordSaving) return;
    setPasswordOpen(false);
    setPasswordForm(EMPTY_PASSWORD);
    setPasswordError("");
    setPasswordFieldErrors({});
    setShowPassword({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };
  const handlePasswordSave = async () => {
    if (passwordSaving) return;

    const errors = validatePassword(passwordForm);
    setPasswordFieldErrors(errors);
    setPasswordError("");
    if (Object.keys(errors).length) return;

    setPasswordSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.email) {
        throw new Error(
          "Email login akun tidak ditemukan. Silakan login ulang.",
        );
      }

      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      });

      if (reAuthError) {
        throw new Error("Password saat ini tidak sesuai.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) throw updateError;

      closePasswordModal();
      setSuccessMessage("Password berhasil diperbarui!");
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordError(friendlyError(error));
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="ppf-page">
        <div className="ppf-loading">Memuat profil Posbankum...</div>
      </section>
    );
  }

  if (showCompletionGate) {
    return (
      <section className="ppf-page ppf-pageGate">
        <div className="ppf-gateCard">
          <div className="ppf-gateHero">
            <img src={burung5} alt="Logo SIBAPAK" className="ppf-gateLogo" />
            <h2>Selamat Datang!</h2>
            <p>{formatPosbankumDisplayName(form.nama)}</p>
          </div>

          <div className="ppf-gateBody">
            <div className="ppf-gateNotice">
              <div className="ppf-gateNoticeIcon">
                <BiInfoCircle />
              </div>
              <div>
                <div className="ppf-gateNoticeTitle">
                  Lengkapi Profil Posbankum Anda
                </div>
                <p>
                  Untuk memaksimalkan penggunaan sistem, mohon lengkapi data
                  profil terlebih dahulu. Data yang lengkap akan memudahkan
                  pelaporan dan koordinasi dengan instansi terkait.
                </p>
              </div>
            </div>

            <div className="ppf-gateTitle">Apa yang harus dilengkapi?</div>

            <div className="ppf-gateChecklist">
              {[
                {
                  label:
                    "Informasi lengkap Posbankum (alamat, kontak, wilayah)",
                  icon: (
                    <span
                      className="ppf-gateItemIcon"
                      style={{ "--mask-url": `url(${posbankumIcon})` }}
                    />
                  ),
                },
                {
                  label: "Data paralegal dan tim yang bertugas",
                  icon: <FiUsers className="ppf-gateItemSvg" />,
                },
                {
                  label: "Profil kepala Posbankum",
                  icon: <FiUser className="ppf-gateItemSvg" />,
                },
                {
                  label: "Kontak darurat dan koordinasi",
                  icon: <BsTelephone className="ppf-gateItemSvg" />,
                },
              ].map((item) => (
                <div key={item.label} className="ppf-gateItem">
                  <span className="ppf-gateItemIconBox">{item.icon}</span>
                  <span>{item.label}</span>
                  <HiOutlineCheckCircle className="ppf-gateCheck" />
                </div>
              ))}
            </div>

            <button
              className="ppf-mainBtn"
              type="button"
              onClick={() => {
                setShowCompletionGate(false);
                setEditing(true);
              }}
            >
              Lengkapi Profil Sekarang →
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ppf-page">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      <div className="ppf-headRow">
        <button
          className="ppf-backBtn"
          type="button"
          onClick={() => {
            if (forceCompletion && !savedProfileComplete) {
              setShowCompletionGate(true);
              setEditing(false);
              return;
            }
            onBack();
          }}
        >
          <AiOutlineArrowLeft />
        </button>

        <div className="ppf-headCopy">
          <h2>Profil Posbankum</h2>
          <p>Kelola informasi dan data paralegal</p>
        </div>

        <div className="ppf-headActions">
          {editing ? (
            <>
              <button
                className="ppf-btn ppf-btnGhost"
                type="button"
                onClick={handleCancel}
              >
                <FiX /> Batal
              </button>
              <button
                className="ppf-btn ppf-btnPrimary"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                <FiSave /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </>
          ) : (
            <button
              className="ppf-btn ppf-btnBlue ppf-headEditBtn"
              type="button"
              onClick={() => {
                setSubmitError("");
                setEditing(true);
              }}
            >
              <FiEdit /> Edit Profil
            </button>
          )}
        </div>
      </div>

      {submitError ? (
        <div className="ppf-alert is-danger">{submitError}</div>
      ) : null}
      {schemaNotice ? (
        <div className="ppf-alert is-warning">{schemaNotice}</div>
      ) : null}

      <div className="ppf-layout">
        <aside className="ppf-sideCard">
          <div className="ppf-sideIconWrap">
            <span
              className="ppf-sideIcon"
              style={{ "--mask-url": `url(${posbankumIcon})` }}
              aria-hidden="true"
            />
          </div>

          <div className="ppf-sideTitle">{form.nama || "Posbankum"}</div>
          <div className="ppf-sideSub">
            {[selectedKecamatan?.nama, selectedKabupaten?.nama]
              .filter(Boolean)
              .join(", ") || "Lengkapi wilayah Posbankum"}
          </div>

          <div className="ppf-sideDivider" />

          <div className="ppf-sideMeta">
            <span>
              <FiMail /> {form.email_akun || "-"}
            </span>
            <span>
              <FiPhone /> {primaryParalegalPhone || "-"}
            </span>
            <span>
              <FiUser /> {paralegalCount} Paralegal
            </span>
          </div>

          <button
            className="ppf-btn ppf-btnOrange ppf-sidePasswordBtn"
            type="button"
            onClick={() => setPasswordOpen(true)}
          >
            <FiKey /> Ubah Password
          </button>
        </aside>

        <div className="ppf-mainCard">
          <section className="ppf-section">
            <div className="ppf-sectionTitle">Informasi Posbankum</div>

            <div className="ppf-formGrid">
              <label className="ppf-field is-full">
                <span className="ppf-label">
                  Nama Posbankum <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <span
                    className="ppf-inputMask"
                    style={{ "--mask-url": `url(${posbankumIcon})` }}
                  />
                  <input
                    className="ppf-input"
                    value={form.nama}
                    readOnly={!editing}
                    disabled={!editing}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, nama: event.target.value }))
                    }
                    placeholder="Masukkan nama Posbankum"
                  />
                </span>
              </label>

              <label className="ppf-field is-full">
                <span className="ppf-label">
                  Email <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <FiMail className="ppf-inputIcon" />
                  <input
                    className="ppf-input"
                    type="email"
                    value={form.email_akun}
                    readOnly
                    disabled
                    placeholder="Email Posbankum"
                  />
                </span>
              </label>

              <label className="ppf-field">
                <span className="ppf-label">
                  Kabupaten <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <FiMapPin className="ppf-inputIcon" />
                  <select
                    className="ppf-input ppf-select"
                    value={form.id_kabupaten}
                    disabled={!editing}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        id_kabupaten: event.target.value,
                        id_kecamatan: "",
                      }))
                    }
                  >
                    <option value="">Pilih kabupaten</option>
                    {kabupatenList.map((item) => (
                      <option key={item.id_kabupaten} value={item.id_kabupaten}>
                        {item.nama}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="ppf-field">
                <span className="ppf-label">
                  Kecamatan <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <FiMapPin className="ppf-inputIcon" />
                  <select
                    className="ppf-input ppf-select"
                    value={form.id_kecamatan}
                    disabled={!editing}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        id_kecamatan: event.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih kecamatan</option>
                    {kecamatanList.map((item) => (
                      <option key={item.id_kecamatan} value={item.id_kecamatan}>
                        {item.nama}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="ppf-field is-full">
                <span className="ppf-label">
                  Alamat <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap is-textarea">
                  <textarea
                    className="ppf-input"
                    rows="4"
                    value={form.alamat}
                    readOnly={!editing}
                    disabled={!editing}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        alamat: event.target.value,
                      }))
                    }
                    placeholder="Masukkan alamat Posbankum"
                  />
                </span>
              </label>

              <label className="ppf-field is-full">
                <span className="ppf-label">
                  Kode Pos <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <input
                    className="ppf-input"
                    value={form.kode_pos}
                    readOnly={!editing}
                    disabled={!editing}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        kode_pos: event.target.value,
                      }))
                    }
                    placeholder="Masukkan kode pos"
                  />
                </span>
              </label>
            </div>
          </section>

          <section className="ppf-section">
            <div className="ppf-sectionHead">
              <div>
                <div className="ppf-sectionTitle withIcon">
                  <FiUser /> Daftar Paralegal
                </div>
                <div className="ppf-sectionSub">
                  Minimal 1 paralegal wajib diisi
                </div>
              </div>

              {editing ? (
                <button
                  className="ppf-btn ppf-btnBlue"
                  type="button"
                  onClick={addParalegal}
                  disabled={!editing}
                >
                  <FiPlus /> Tambah
                </button>
              ) : null}
            </div>

            <div className="ppf-paralegalList">
              {paralegals.map((item, index) => (
                <div
                  key={item.id || `paralegal-${index}`}
                  className={`ppf-paralegalCard ${index === 0 ? "is-primary" : ""}`}
                >
                  <div className="ppf-paralegalHead">
                    <div className="ppf-paralegalBadges">
                      {index === 0 ? (
                        <span className="ppf-badgeBlue">Paralegal Utama</span>
                      ) : null}
                      {index === 0 ? (
                        <span className="ppf-badgeGreen">
                          <FiCheckCircle /> Wajib
                        </span>
                      ) : null}
                    </div>
                    {editing && index > 0 ? (
                      <button
                        className="ppf-deleteBtn"
                        type="button"
                        onClick={() => removeParalegal(index)}
                        disabled={!editing}
                      >
                        <FiTrash2 />
                      </button>
                    ) : null}
                  </div>

                  <div className="ppf-formGrid single">
                    <label className="ppf-field is-full">
                      <span className="ppf-label">
                        Nama Paralegal <span className="ppf-required">*</span>
                      </span>
                      <span className="ppf-inputWrap">
                        <FiUser className="ppf-inputIcon" />
                        <input
                          className="ppf-input"
                          value={item.nama_paralegal || ""}
                          readOnly={!editing}
                          disabled={!editing}
                          onChange={(event) =>
                            handleParalegalChange(
                              index,
                              "nama_paralegal",
                              event.target.value,
                            )
                          }
                          placeholder="Nama lengkap paralegal..."
                        />
                      </span>
                      {paralegalErrors[index]?.nama_paralegal ? (
                        <span className="ppf-errorText">
                          {paralegalErrors[index].nama_paralegal}
                        </span>
                      ) : null}
                    </label>

                    <label className="ppf-field is-full">
                      <span className="ppf-label">
                        Nomor Telepon <span className="ppf-required">*</span>
                      </span>
                      <span className="ppf-inputWrap">
                        <FiPhone className="ppf-inputIcon" />
                        <input
                          className="ppf-input"
                          value={item.nomor_telepon || ""}
                          readOnly={!editing}
                          disabled={!editing}
                          onChange={(event) =>
                            handleParalegalChange(
                              index,
                              "nomor_telepon",
                              event.target.value,
                            )
                          }
                          onFocus={() => {
                            if (!item.nomor_telepon) {
                              handleParalegalChange(
                                index,
                                "nomor_telepon",
                                "+62",
                              );
                            }
                          }}
                          placeholder="+62 xxx-xxxx-xxxx"
                        />
                      </span>
                      {paralegalErrors[index]?.nomor_telepon ? (
                        <span className="ppf-errorText">
                          {paralegalErrors[index].nomor_telepon}
                        </span>
                      ) : null}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="ppf-noteBox">
              <IoAlertCircleOutline className="ppf-noteIcon" />
              <span>
                <strong>Catatan:</strong> Paralegal pertama (utama) adalah wajib
                dan tidak dapat dihapus. Anda dapat menambahkan paralegal
                tambahan sesuai kebutuhan.
              </span>
            </div>
          </section>
        </div>
      </div>

      {passwordOpen ? (
        <div className="ppf-modalOverlay" role="presentation">
          <div className="ppf-modal" role="dialog" aria-modal="true">
            <div className="ppf-modalHead">
              <div className="ppf-modalTitle">
                <FiKey /> Ubah Password
              </div>
              <button
                className="ppf-modalClose"
                type="button"
                onClick={closePasswordModal}
              >
                ×
              </button>
            </div>

            <div className="ppf-modalBody">
              <label className="ppf-field is-full">
                <span className="ppf-label">
                  Password Saat Ini <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <span className="ppf-inputIcon">
                    <BiLockAlt />
                  </span>
                  <input
                    className="ppf-input"
                    type={showPassword.currentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    placeholder="Masukkan password saat ini"
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="ppf-eyeBtn"
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        currentPassword: !prev.currentPassword,
                      }))
                    }
                  >
                    <FiEyeOff />
                  </button>
                </span>
                {passwordFieldErrors.currentPassword ? (
                  <span className="ppf-errorText">
                    {passwordFieldErrors.currentPassword}
                  </span>
                ) : null}
              </label>

              <label className="ppf-field is-full">
                <span className="ppf-label">
                  Password Baru <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <span className="ppf-inputIcon">
                    <BiLockAlt />
                  </span>
                  <input
                    className="ppf-input"
                    type={showPassword.newPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    placeholder="Minimal 6 karakter"
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="ppf-eyeBtn"
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        newPassword: !prev.newPassword,
                      }))
                    }
                  >
                    <FiEyeOff />
                  </button>
                </span>
                <div className="ppf-helper">Minimal 6 karakter</div>
                {passwordFieldErrors.newPassword ? (
                  <span className="ppf-errorText">
                    {passwordFieldErrors.newPassword}
                  </span>
                ) : null}
              </label>

              <label className="ppf-field is-full">
                <span className="ppf-label">
                  Konfirmasi Password Baru{" "}
                  <span className="ppf-required">*</span>
                </span>
                <span className="ppf-inputWrap">
                  <span className="ppf-inputIcon">
                    <BiLockAlt />
                  </span>
                  <input
                    className="ppf-input"
                    type={showPassword.confirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    placeholder="Ulangi password baru"
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="ppf-eyeBtn"
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        confirmPassword: !prev.confirmPassword,
                      }))
                    }
                  >
                    <FiEyeOff />
                  </button>
                </span>
                {passwordFieldErrors.confirmPassword ? (
                  <span className="ppf-errorText">
                    {passwordFieldErrors.confirmPassword}
                  </span>
                ) : null}
              </label>

              {passwordError ? (
                <div className="ppf-alert is-danger">{passwordError}</div>
              ) : null}

              <div className="ppf-passwordInfo">
                <IoAlertCircleOutline className="ppf-passwordInfoIcon" />
                <span>
                  Pastikan Anda mengingat password baru.
                  <br />
                  Gunakan kombinasi huruf, angka, dan simbol.
                </span>
              </div>
            </div>

            <div className="ppf-modalFoot">
              <button
                className="ppf-btn ppf-btnGhost ppf-btnModal"
                type="button"
                onClick={closePasswordModal}
              >
                Batal
              </button>
              <button
                className="ppf-btn ppf-btnOrange ppf-btnModal"
                type="button"
                onClick={handlePasswordSave}
                disabled={passwordSaving}
              >
                {passwordSaving ? "Memproses..." : "Ubah Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

PosbankumProfile.propTypes = {
  profile: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string,
    id_posbankum: PropTypes.string,
  }),
  forceCompletion: PropTypes.bool,
  onBack: PropTypes.func,
  onSaved: PropTypes.func,
  onCompletenessChange: PropTypes.func,
};

PosbankumProfile.defaultProps = {
  profile: null,
  forceCompletion: false,
  onBack: () => {},
  onSaved: () => {},
  onCompletenessChange: () => {},
};
