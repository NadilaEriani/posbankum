import PropTypes from "prop-types";

/**
 * Card Component - Container dengan shadow & rounded corner
 * Variants: default, bordered, elevated
 */
export default function Card({
  children,
  variant = "default",
  padding = "lg",
  className = "",
  ...props
}) {
  const baseStyles = "bg-white rounded-2xl";

  const variantStyles = {
    default: "shadow-soft",
    bordered: "border-2 border-neutral-softWhite",
    elevated: "shadow-soft hover:shadow-xl transition-shadow duration-300",
  };

  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    xl: "p-10",
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["default", "bordered", "elevated"]),
  padding: PropTypes.oneOf(["none", "sm", "md", "lg", "xl"]),
  className: PropTypes.string,
};
