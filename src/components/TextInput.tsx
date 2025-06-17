import React from "react";

export default function TextInput({
  id,
  placeholder,
  value,
  label,
  onChange,
  error = false,
  errorText = "",
}: {
  id: string;
  placeholder: string;
  value: string;
  label: string;
  error?: boolean;
  errorText?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 p-2 w-full">
      <p className="font-bold">{label}</p>
      <input
        type="text"
        id={id}
        placeholder={placeholder}
        className={`border p-2 bg-white rounded w-full ${error ? "border-red-500" : ""}`}
        value={value}
        onChange={onChange}
      />
      {error && <p className="text-sm text-red-500">{errorText}</p>}
    </div>
  );
}
