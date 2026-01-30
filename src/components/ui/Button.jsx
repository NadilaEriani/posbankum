import PropTypes from "prop-types";

/**
 * Button Component - Base untuk semua tombol
 * Variants: primary, secondary, outline, ghost, danger
 * Sizes: sm, md, lg
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  ...props
}) {
  // Base styles
  const baseStyles =
    "inline-flex items-center justify-center font-normal transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  // Size variants
  const sizeStyles = {
    sm: "px-4 py-2 text-btn-sm rounded-lg",
    md: "px-6 py-3 text-btn-md rounded-xl",
    lg: "px-8 py-4 text-btn rounded-xl",
  };

  // Color variants
  const variantStyles = {
    primary:
      "bg-brand-blue-1 text-white hover:bg-brand-blue-2 focus:ring-brand-blue-2 active:bg-brand-blue-d shadow-sm",
    secondary:
      "bg-brand-yellow-1 text-neutral-secBlack hover:bg-brand-yellow-2 focus:ring-brand-yellow-2 active:bg-brand-yellow-d shadow-sm",
    outline:
      "border-2 border-brand-blue-1 text-brand-blue-1 hover:bg-brand-blue-1 hover:text-white focus:ring-brand-blue-1",
    ghost:
      "text-brand-blue-1 hover:bg-secondary-3 focus:ring-secondary-2",
    danger:
      "bg-danger-2 text-white hover:bg-danger-1 focus:ring-danger-2 active:bg-danger-d shadow-sm",
  };

  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "outline", "ghost", "danger"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  onClick: PropTypes.func,
  className: PropTypes.string,
};
