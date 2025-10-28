import React from "react";

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input {...props} className={`border rounded px-2 py-1 ${props.className || ""}`} />;
};

export default Input;