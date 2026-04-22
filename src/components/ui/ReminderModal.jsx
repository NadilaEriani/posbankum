import { FiInfo } from "react-icons/fi";
import "./reminderModal.css";

export default function ReminderModal({
  open,
  title = "Pengingat",
  subtitle = "Periksa kembali informasi berikut",
  description = "",
  buttonLabel = "Mengerti",
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      className="rmOverlay"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="rmCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rmHead">
          <div className="rmIconWrap" aria-hidden="true">
            <FiInfo />
          </div>
          <div className="rmHeadText">
            <div className="rmTitle">{title}</div>
            <div className="rmSubtitle">{subtitle}</div>
          </div>
        </div>

        <div className="rmDescription">{description}</div>

        <div className="rmActions">
          <button className="rmBtn rmBtnPrimary" type="button" onClick={onClose}>
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
