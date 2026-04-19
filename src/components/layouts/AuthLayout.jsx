import PropTypes from "prop-types";
import Card from "../ui/Card";

/**
 * AuthLayout - Layout konsisten untuk halaman Login, Register, Reset Password
 * Features: Split screen (ilustrasi kiri, form kanan), responsive, centered
 */
export default function AuthLayout({
  children,
  title,
  subtitle,
  illustration,
  illustrationAlt = "Ilustrasi",
  showIllustration = true,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-3 via-neutral-white to-secondary-2 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Illustration (hidden on mobile) */}
          {showIllustration && (
            <div className="hidden lg:flex flex-col items-center justify-center p-8">
              {illustration ? (
                <img
                  src={illustration}
                  alt={illustrationAlt}
                  className="w-full max-w-md object-contain"
                />
              ) : (
                <div className="w-full max-w-md aspect-square bg-gradient-to-br from-brand-blue-1 to-brand-blue-2 rounded-3xl flex items-center justify-center shadow-soft">
                  <div className="text-white text-center p-8">
                    <h2 className="text-h2 mb-4">Posbankum</h2>
                    <p className="text-b1 opacity-90">
                      Platform Bantuan Hukum Terpercaya
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right: Form Card */}
          <div className="w-full">
            <Card variant="elevated" padding="xl" className="max-w-md mx-auto">
              {/* Header */}
              {(title || subtitle) && (
                <div className="text-center mb-8">
                  {title && (
                    <h1 className="text-h2 text-neutral-secBlack mb-2">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-b2 text-neutral-grey">{subtitle}</p>
                  )}
                </div>
              )}

              {/* Form Content */}
              <div>{children}</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  illustration: PropTypes.string,
  illustrationAlt: PropTypes.string,
  showIllustration: PropTypes.bool,
};
