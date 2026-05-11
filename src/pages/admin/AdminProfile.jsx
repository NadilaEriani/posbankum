import { FiBriefcase } from "react-icons/fi";
import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  FiEdit,
  FiSave,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiEyeOff,
} from "react-icons/fi";
import { BiShield } from "react-icons/bi";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { FiKey } from "react-icons/fi";
import { IoAlertCircleOutline } from "react-icons/io5";
import { MdOutlineShield } from "react-icons/md";
import "./adminProfile.css";
import posbankum from "../../assets/icon.png";
import SuccessToast from "../../components/ui/SuccessToast";

const INITIAL_FORM = {
  full_name: "",
  nip: "",
  email_kantor: "",
  nomor_telepon: "",
  nomor_kantor: "",
  jabatan: "",
  unit_kerja: "",
  alamat_kantor: "",
  foto_profile: "",
};

const INITIAL_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const BUCKET_PROFILE = "profile-photos";

const cleanFilename = (name) =>
  String(name || "file")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isExternalUrl = (value) => /^https?:\/\//i.test(String(value || ""));
const isDataOrBlob = (value) => /^(data:|blob:)/i.test(String(value || ""));

function getProfilePhotoUrl(value) {
  const path = safeTrim(value);
  if (!path) return "";
  if (isExternalUrl(path) || isDataOrBlob(path)) return path;
  const { data } = supabase.storage.from(BUCKET_PROFILE).getPublicUrl(path);
  return data?.publicUrl || "";
}

function getFriendlyError(error) {
  return error?.message || "Terjadi kesalahan. Silakan coba lagi.";
}

function isMissingColumnError(error) {
  const text = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return text.includes("column") && text.includes("does not exist");
}

function sanitizeText(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function safeTrim(value) {
  return sanitizeText(value).trim();
}

function buildFormData(data, adminName, sessionEmail) {
  return {
    full_name: sanitizeText(data?.full_name) || adminName || "",
    nip: sanitizeText(data?.nip),
    email_kantor: sanitizeText(data?.email_kantor) || sessionEmail || "",
    nomor_telepon: sanitizeText(data?.nomor_telepon),
    nomor_kantor: sanitizeText(data?.nomor_kantor),
    jabatan: sanitizeText(data?.jabatan),
    unit_kerja:
      sanitizeText(data?.unit_kerja) || "Kantor Wilayah Kementerian Hukum Riau",
    alamat_kantor: sanitizeText(data?.alamat_kantor),
    foto_profile: sanitizeText(data?.foto_profile),
  };
}

function validateAdminPassword(values) {
  const errors = {};
  const next = values.newPassword || "";

  if (!values.currentPassword) {
    errors.currentPassword = "Password saat ini wajib diisi.";
  }
  if (!next) {
    errors.newPassword = "Password baru wajib diisi.";
  } else {
    if (next.length < 8) errors.newPassword = "Minimal 8 karakter.";
    else if (!/[A-Z]/.test(next))
      errors.newPassword = "Harus mengandung huruf besar.";
    else if (!/[a-z]/.test(next))
      errors.newPassword = "Harus mengandung huruf kecil.";
    else if (!/[0-9]/.test(next))
      errors.newPassword = "Harus mengandung angka.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Konfirmasi password wajib diisi.";
  } else if (values.confirmPassword !== next) {
    errors.confirmPassword = "Konfirmasi password belum sama.";
  }

  return errors;
}

function normalizeEmail(value) {
  return safeTrim(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function getEmailUpdateError(error) {
  const message = safeTrim(error?.message);
  if (!message) return "Gagal mengubah email login.";

  const lower = message.toLowerCase();
  if (lower.includes("invalid") && lower.includes("email")) {
    return "Email login tidak valid. Periksa kembali penulisan email.";
  }

  if (lower.includes("already") || lower.includes("registered")) {
    return "Email login sudah digunakan oleh akun lain.";
  }

  return message;
}

function getPasswordRules(password) {
  const value = password || "";
  return [
    { key: "min", label: "Minimal 8 karakter", valid: value.length >= 8 },
    {
      key: "upper",
      label: "Mengandung huruf besar",
      valid: /[A-Z]/.test(value),
    },
    {
      key: "lower",
      label: "Mengandung huruf kecil",
      valid: /[a-z]/.test(value),
    },
    { key: "number", label: "Mengandung angka", valid: /[0-9]/.test(value) },
  ];
}

export default function AdminProfile({ sessionUser, adminName, onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [schemaNotice, setSchemaNotice] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [initialForm, setInitialForm] = useState(INITIAL_FORM);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD);
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [hasExtendedSchema, setHasExtendedSchema] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoInputRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      if (!sessionUser?.id) {
        if (alive) setLoading(false);
        return;
      }

      setLoading(true);
      setSubmitError("");
      setSchemaNotice("");

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "full_name, nip, email_kantor, nomor_telepon, nomor_kantor, jabatan, unit_kerja, alamat_kantor",
          )
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (error) {
          if (!isMissingColumnError(error)) throw error;

          setHasExtendedSchema(false);
          setSchemaNotice(
            "Sebagian field profil admin membutuhkan kolom tambahan pada tabel profiles. Jalankan SQL tambahan agar semua field bisa tersimpan.",
          );

          const fallback = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", sessionUser.id)
            .maybeSingle();

          if (fallback.error) throw fallback.error;

          const next = buildFormData(
            fallback.data,
            adminName,
            sessionUser.email,
          );

          if (!alive) return;
          setForm(next);
          setInitialForm(next);
          return;
        }

        let optionalPhoto = "";
        const photoResponse = await supabase
          .from("profiles")
          .select("foto_profile")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (!photoResponse.error) {
          optionalPhoto = photoResponse.data?.foto_profile || "";
        }

        const next = buildFormData(
          { ...data, foto_profile: optionalPhoto },
          adminName,
          sessionUser.email,
        );

        if (!alive) return;
        setHasExtendedSchema(true);
        setForm(next);
        setInitialForm(next);
      } catch (error) {
        if (!alive) return;
        setSubmitError(getFriendlyError(error));
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, [sessionUser?.id, sessionUser?.email, adminName]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const displayEmail = useMemo(
    () =>
      sanitizeText(form.email_kantor) ||
      sanitizeText(sessionUser?.email) ||
      "-",
    [form.email_kantor, sessionUser?.email],
  );

  const displayPhoto = useMemo(
    () => photoPreview || getProfilePhotoUrl(form.foto_profile),
    [form.foto_profile, photoPreview],
  );

  const passwordRules = useMemo(
    () => getPasswordRules(passwordForm.newPassword),
    [passwordForm.newPassword],
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetSelectedPhoto = () => {
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleCancel = () => {
    setForm(initialForm);
    resetSelectedPhoto();
    setEditing(false);
    setSubmitError("");
  };

  const handlePhotoClick = () => {
    if (!editing || saving) return;
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setSubmitError("Format foto harus PNG, JPG, atau JPEG.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Ukuran foto maksimal 5MB.");
      event.target.value = "";
      return;
    }

    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setSubmitError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadProfilePhoto = async () => {
    if (!photoFile) return safeTrim(form.foto_profile);

    const ext = photoFile.name.includes(".")
      ? photoFile.name.split(".").pop()
      : "jpg";
    const name = cleanFilename(photoFile.name.replace(/\.[^.]+$/, ""));
    const filePath = `admin/${sessionUser.id}/${Date.now()}-${name || "foto-profile"}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_PROFILE)
      .upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    if (!sessionUser?.id || saving) return;

    setSaving(true);
    setSubmitError("");

    try {
      const nextEmail = normalizeEmail(form.email_kantor);

      if (!nextEmail) {
        throw new Error("Email wajib diisi.");
      }

      if (!isValidEmail(nextEmail)) {
        throw new Error(
          "Format email tidak valid. Periksa kembali penulisan email.",
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const currentEmail = normalizeEmail(user?.email || sessionUser?.email);
      const isEmailChanged = nextEmail !== currentEmail;

      if (isEmailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: nextEmail,
        });

        if (emailError) {
          throw new Error(getEmailUpdateError(emailError));
        }
      }

      const nextPhoto = await uploadProfilePhoto();
      const payload = {
        full_name: safeTrim(form.full_name),
        foto_profile: nextPhoto,
      };

      if (hasExtendedSchema) {
        payload.nip = safeTrim(form.nip);
        payload.email_kantor = nextEmail;
        payload.nomor_telepon = safeTrim(form.nomor_telepon);
        payload.nomor_kantor = safeTrim(form.nomor_kantor);
        payload.jabatan = safeTrim(form.jabatan);
        payload.unit_kerja = safeTrim(form.unit_kerja);
        payload.alamat_kantor = safeTrim(form.alamat_kantor);
      }

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", sessionUser.id);

      if (error) throw error;

      const next = buildFormData(
        { ...form, email_kantor: nextEmail, foto_profile: nextPhoto },
        adminName,
        nextEmail || currentEmail,
      );
      setForm(next);
      setInitialForm(next);
      resetSelectedPhoto();
      setEditing(false);
      setSuccessMessage(
        isEmailChanged
          ? "Profil admin diperbarui. Jika konfirmasi email aktif, buka email baru untuk mengaktifkan email login."
          : "Profil admin berhasil diperbarui!",
      );
    } catch (error) {
      setSubmitError(getFriendlyError(error));
    } finally {
      setSaving(false);
    }
  };

  const closePasswordModal = () => {
    if (passwordSaving) return;
    setPasswordOpen(false);
    setPasswordForm(INITIAL_PASSWORD);
    setPasswordError("");
    setPasswordFieldErrors({});
    setShowPassword({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };

  const handlePasswordChange = async () => {
    if (!sessionUser?.email || passwordSaving) return;

    const errors = validateAdminPassword(passwordForm);
    setPasswordFieldErrors(errors);
    setPasswordError("");

    if (Object.keys(errors).length) return;

    setPasswordSaving(true);

    try {
      const reAuth = await supabase.auth.signInWithPassword({
        email: sessionUser.email,
        password: passwordForm.currentPassword,
      });

      if (reAuth.error) throw new Error("Password saat ini tidak sesuai.");

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      closePasswordModal();
      setSuccessMessage("Password berhasil diperbarui!");
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordError(getFriendlyError(error));
    } finally {
      setPasswordSaving(false);
    }
  };

  const renderField = (
    label,
    field,
    {
      required = false,
      icon = null,
      helper = "",
      textarea = false,
      type = "text",
      placeholder = "",
      full = false,
    } = {},
  ) => {
    const Comp = textarea ? "textarea" : "input";

    return (
      <label className={`apf-field ${full ? "is-full" : ""}`}>
        <span className="apf-label">
          {label}
          {required ? <span className="apf-required">*</span> : null}
        </span>

        <span className={`apf-inputWrap ${textarea ? "is-textarea" : ""}`}>
          {icon ? <span className="apf-inputIcon">{icon}</span> : null}
          <Comp
            className="apf-input"
            type={textarea ? undefined : type}
            value={sanitizeText(form[field])}
            placeholder={placeholder}
            readOnly={!editing}
            disabled={!editing}
            rows={textarea ? 4 : undefined}
            onChange={(event) => handleChange(field, event.target.value)}
          />
        </span>

        {helper ? <span className="apf-helper">{helper}</span> : null}
      </label>
    );
  };

  return (
    <section className="apf-page ad-pagePad">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      <div className="apf-headRow">
        <button className="apf-backBtn" type="button" onClick={onBack}>
          <AiOutlineArrowLeft />
        </button>

        <div className="apf-headCopy">
          <h2>Profil Admin</h2>
          <p>Kelola informasi akun administrator</p>
        </div>

        <div className="apf-headActions">
          {editing ? (
            <>
              <button
                className="apf-btn apf-btnGhost"
                type="button"
                onClick={handleCancel}
              >
                <FiX /> Batal
              </button>
              <button
                className="apf-btn apf-btnPrimary"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                <FiSave /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </>
          ) : (
            <button
              className="apf-btn apf-btnBlue apf-headEditBtn"
              type="button"
              onClick={() => setEditing(true)}
            >
              <FiEdit /> Edit Profil
            </button>
          )}
        </div>
      </div>

      {submitError ? (
        <div className="apf-alert is-danger">{submitError}</div>
      ) : null}

      {schemaNotice ? (
        <div className="apf-alert is-warning">{schemaNotice}</div>
      ) : null}

      <div className="apf-cardShell">
        <div className="apf-hero">
          <span className="apf-badge">
            <BiShield /> Administrator
          </span>

          <div className="apf-heroInner">
            <div className={`apf-avatarEditBox ${editing ? "is-editing" : ""}`}>
              <div className="apf-avatarWrap">
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt="Foto profil admin"
                    className="apf-avatar"
                  />
                ) : null}
              </div>

              {editing ? (
                <>
                  <input
                    ref={photoInputRef}
                    className="apf-photoInput"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handlePhotoChange}
                  />
                  <button
                    className="apf-photoBtn"
                    type="button"
                    onClick={handlePhotoClick}
                    disabled={saving}
                  >
                    {displayPhoto ? "Ganti Foto" : "Tambah Foto"}
                  </button>
                  <div className="apf-photoHint">PNG atau JPG maksimal 5MB</div>
                </>
              ) : null}
            </div>

            <h3>
              {sanitizeText(form.full_name) || adminName || "Administrator"}
            </h3>

            <div className="apf-roleText">
              {sanitizeText(form.jabatan) || "Administrator Sistem"}
            </div>

            <div className="apf-unitText">
              {sanitizeText(form.unit_kerja) ||
                "Kantor Wilayah Kementerian Hukum Riau"}
            </div>

            <div className="apf-mailText">
              <FiMail /> {displayEmail}
            </div>
          </div>
        </div>

        <div className="apf-body">
          {loading ? (
            <div className="apf-loading">Memuat profil admin...</div>
          ) : (
            <>
              <div className="apf-grid">
                {renderField("Nama Lengkap", "full_name", {
                  required: true,
                  icon: <FiUser />,
                  placeholder: "Masukkan nama lengkap",
                  full: true,
                })}

                {renderField("NIP", "nip", {
                  required: true,
                  icon: <BiShield />,
                  helper: "18 digit Nomor Induk Pegawai",
                  placeholder: "Masukkan NIP",
                })}

                {renderField("Email", "email_kantor", {
                  required: true,
                  icon: <FiMail />,
                  type: "email",
                  placeholder: "Masukkan email",
                })}

                {renderField("Nomor Telepon", "nomor_telepon", {
                  required: true,
                  icon: <FiPhone />,
                  placeholder: "Masukkan nomor telepon",
                })}

                {renderField("Nomor Kantor", "nomor_kantor", {
                  required: true,
                  icon: <FiPhone />,
                  placeholder: "Masukkan nomor kantor",
                })}

                {renderField("Jabatan", "jabatan", {
                  required: true,
                  icon: <FiBriefcase />,
                  placeholder: "Masukkan jabatan",
                })}

                {renderField("Unit Kerja", "unit_kerja", {
                  required: true,
                  icon: (
                    <span
                      className="ad-navMaskIcon"
                      style={{ "--mask-url": `url(${posbankum})` }}
                      aria-hidden="true"
                    />
                  ),
                  placeholder: "Masukkan unit kerja",
                })}

                {renderField("Alamat Kantor", "alamat_kantor", {
                  required: true,
                  icon: <FiMapPin />,
                  textarea: true,
                  placeholder: "Masukkan alamat kantor",
                  full: true,
                })}
              </div>

              <div className="apf-divider" />

              <div className="apf-security">
                <div className="apf-securityHead">
                  <MdOutlineShield /> Keamanan Akun
                </div>

                <div className="apf-securityCard">
                  <div className="apf-securityCopy">
                    <div className="apf-securityTitle">Password</div>
                    <p>
                      Ubah password secara berkala untuk menjaga keamanan akun
                      Anda. Password harus minimal 8 karakter dengan kombinasi
                      huruf besar, huruf kecil, dan angka.
                    </p>

                    <div className="apf-securityMeta">
                      <IoAlertCircleOutline className="apf-lastChangedIcon" />
                      <span>
                        Terakhir diubah: mengikuti sistem autentikasi aktif
                      </span>
                    </div>
                  </div>

                  <div className="apf-securityAction">
                    <button
                      className="apf-btn apf-btnOrange apf-passwordBtn"
                      type="button"
                      onClick={() => setPasswordOpen(true)}
                    >
                      <FiKey /> Ubah Password
                    </button>
                  </div>
                </div>
              </div>

              <div className="apf-infoCard">
                <IoAlertCircleOutline className="apf-infoIcon" />
                <div className="apf-infoTextWrap">
                  <div className="apf-infoHead">Informasi Penting</div>
                  <p>
                    Data profil ini digunakan untuk keperluan administrasi
                    sistem. Pastikan semua informasi yang Anda masukkan akurat
                    dan terkini. Perubahan data akan langsung tersimpan dalam
                    sistem.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {passwordOpen ? (
        <div className="apf-modalOverlay" role="presentation">
          <div className="apf-modal" role="dialog" aria-modal="true">
            <div className="apf-modalHead">
              <div className="apf-modalTitle">
                <FiKey /> Ubah Password
              </div>
              <button
                className="apf-modalClose"
                type="button"
                onClick={closePasswordModal}
              >
                ×
              </button>
            </div>

            <div className="apf-modalBody">
              <label className="apf-field is-full">
                <span className="apf-label">
                  Password Saat Ini <span className="apf-required">*</span>
                </span>
                <span className="apf-inputWrap">
                  <span className="apf-inputIcon">
                    <FiKey />
                  </span>
                  <input
                    className="apf-input"
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
                    className="apf-eyeBtn"
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
                  <span className="apf-errorText">
                    {passwordFieldErrors.currentPassword}
                  </span>
                ) : null}
              </label>

              <label className="apf-field is-full">
                <span className="apf-label">
                  Password Baru <span className="apf-required">*</span>
                </span>
                <span className="apf-inputWrap">
                  <span className="apf-inputIcon">
                    <FiKey />
                  </span>
                  <input
                    className="apf-input"
                    type={showPassword.newPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    placeholder="Minimal 8 karakter"
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="apf-eyeBtn"
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
                {passwordFieldErrors.newPassword ? (
                  <span className="apf-errorText">
                    {passwordFieldErrors.newPassword}
                  </span>
                ) : null}
              </label>

              <ul className="apf-ruleList">
                {passwordRules.map((rule) => (
                  <li key={rule.key} className={rule.valid ? "is-valid" : ""}>
                    {rule.label}
                  </li>
                ))}
              </ul>

              <label className="apf-field is-full">
                <span className="apf-label">
                  Konfirmasi Password Baru{" "}
                  <span className="apf-required">*</span>
                </span>
                <span className="apf-inputWrap">
                  <span className="apf-inputIcon">
                    <FiKey />
                  </span>
                  <input
                    className="apf-input"
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
                    className="apf-eyeBtn"
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
                  <span className="apf-errorText">
                    {passwordFieldErrors.confirmPassword}
                  </span>
                ) : null}
              </label>

              {passwordError ? (
                <div className="apf-alert is-danger">{passwordError}</div>
              ) : null}

              <div className="apf-passwordInfo">
                <div className="apf-passwordInfoTitle">
                  <IoAlertCircleOutline /> Keamanan Password
                </div>
                <p>
                  Pastikan password Anda kuat dan tidak mudah ditebak. Jangan
                  gunakan password yang sama dengan akun lain. Anda akan diminta
                  login ulang setelah mengubah password.
                </p>
              </div>
            </div>

            <div className="apf-modalFoot">
              <button
                className="apf-btn apf-btnGhost apf-btnModal"
                type="button"
                onClick={closePasswordModal}
              >
                Batal
              </button>
              <button
                className="apf-btn apf-btnOrange apf-btnModal"
                type="button"
                onClick={handlePasswordChange}
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

AdminProfile.propTypes = {
  sessionUser: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string,
  }),
  adminName: PropTypes.string,
  onBack: PropTypes.func,
};

AdminProfile.defaultProps = {
  sessionUser: null,
  adminName: "Administrator",
  onBack: () => {},
};
