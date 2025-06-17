import React from "react";

export default function DropdownInput<
  T extends string | number | readonly string[] | undefined,
>({
  id,
  label,
  options,
  value,
  onChange,
  error = false,
  errorText = "",
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: T;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: boolean;
  errorText?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 p-2 w-full">
      <p className="font-bold">{label}</p>
      <select
        id={id}
        className={`border p-2 bg-white rounded w-full ${error ? "border-red-500" : ""}`}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-500">{errorText}</p>}
    </div>
  );
}
