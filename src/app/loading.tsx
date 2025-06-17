import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500 mb-4"></div>
      <h1 className="text-2xl font-bold text-gray-700">Loading...</h1>
    </div>
  );
}
