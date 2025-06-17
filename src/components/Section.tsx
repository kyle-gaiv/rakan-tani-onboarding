import React from "react";

export default function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-start gap-2 border rounded p-4 bg-gray-200 w-full max-h-fit">
      {children}
    </div>
  );
}
