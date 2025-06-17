import React from "react";

export default function Button({
  label,
  onClick,
  red = false,
  small = false,
  styles = "",
}: {
  label: string;
  onClick: () => void;
  red?: boolean;
  styles?: string;
  small?: boolean;
}) {
  return (
    <button
      className={`${red ? "bg-red-500 hover:bg-red-700" : "bg-blue-500 hover:bg-blue-700"} ${small ? "text-sm py-1 px-2" : "py-2 px-4"} text-white text-center font-bold  rounded cursor-pointer text-center ${styles}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
