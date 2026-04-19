import { FiBriefcase } from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import burung5 from "../../assets/burung5.png";
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
import { BiLockAlt, BiShield } from "react-icons/bi";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { FiKey } from "react-icons/fi";
import { IoAlertCircleOutline } from "react-icons/io5";
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
};

const INITIAL_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

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

        const next = buildFormData(data, adminName, sessionUser.email);

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

  const displayEmail = useMemo(
    () =>
      sanitizeText(form.email_kantor) ||
      sanitizeText(sessionUser?.email) ||
      "-",
    [form.email_kantor, sessionUser?.email],
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setForm(initialForm);
    setEditing(false);
    setSubmitError("");
  };

  const handleSave = async () => {
    if (!sessionUser?.id || saving) return;

    setSaving(true);
    setSubmitError("");

    try {
      const payload = {
        full_name: safeTrim(form.full_name),
      };

      if (hasExtendedSchema) {
        payload.nip = safeTrim(form.nip);
        payload.email_kantor = safeTrim(form.email_kantor);
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

      const next = buildFormData(form, adminName, sessionUser?.email);
      setForm(next);
      setInitialForm(next);
      setEditing(false);
      setSuccessMessage("Profil admin berhasil diperbarui!");
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
            <div className="apf-avatarWrap">
              <img src={burung5} alt="Logo SIBAPAK" className="apf-avatar" />
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
                  <BiShield /> Keamanan Akun
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
                      <IoAlertCircleOutline />
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
                <div className="apf-infoHead">
                  <IoAlertCircleOutline /> Informasi Penting
                </div>
                <p>
                  Data profil ini digunakan untuk keperluan administrasi sistem.
                  Pastikan semua informasi yang Anda masukkan akurat dan
                  terkini. Perubahan data akan langsung tersimpan dalam sistem.
                </p>
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
                    <BiLockAlt />
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
                    <BiLockAlt />
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
                <li>Minimal 8 karakter</li>
                <li>Mengandung huruf besar</li>
                <li>Mengandung huruf kecil</li>
                <li>Mengandung angka</li>
              </ul>

              <label className="apf-field is-full">
                <span className="apf-label">
                  Konfirmasi Password Baru{" "}
                  <span className="apf-required">*</span>
                </span>
                <span className="apf-inputWrap">
                  <span className="apf-inputIcon">
                    <BiLockAlt />
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
