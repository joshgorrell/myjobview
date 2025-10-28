import React from "react";

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }> = ({ children, className = "", variant, size, ...props }) => {
  const base = "px-3 py-1 rounded inline-flex items-center justify-center";
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;