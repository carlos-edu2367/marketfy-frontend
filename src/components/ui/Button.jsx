import { twMerge } from 'tailwind-merge';

/**
 * Button unico do design system. Use `as={Link}` (react-router-dom) para
 * renderizar como link mantendo a mesma aparencia, em vez de aninhar
 * <Link><Button/></Link> (HTML invalido, dois alvos de foco).
 */
export const Button = ({
  as: Component = 'button',
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading,
  ...props
}) => {
  const baseStyle = "font-medium rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-brand-yellow hover:bg-brand-yellowHover text-gray-900 shadow-sm border border-yellow-500/20",
    success: "bg-brand-green hover:bg-brand-greenHover text-white shadow-md",
    secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
    brand: "bg-brand-yellow text-brand-ink border-2 border-brand-ink shadow-sticker hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#141414] active:shadow-none",
    ink: "bg-brand-ink text-white border-2 border-brand-ink shadow-[4px_4px_0_0_#FDD403] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FDD403] active:shadow-none",
    outline:"border-2 border-gray-200 hover:border-gray-900 text-gray-900 bg-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg font-bold",
    xl: "px-8 py-4 text-xl font-bold"
  };

  const isNativeButton = Component === 'button';
  const disabledProps = isLoading
    ? (isNativeButton ? { disabled: true } : { 'aria-disabled': true, tabIndex: -1 })
    : {};

  return (
    <Component
      className={twMerge(baseStyle, variants[variant], sizes[size], className)}
      {...disabledProps}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
      ) : children}
    </Component>
  );
};
