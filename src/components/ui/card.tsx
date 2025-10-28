import React from "react";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "" }) => (
  <div className={`shadow-sm ${className}`}>{children}</div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "" }) => (
  <div className={`p-3 ${className}`}>{children}</div>
);

export default Card;