"use client";

import { generateNumericUUID } from "@/utils/helpers";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

interface IDContextType {
  id: string;
  setId: (id: string) => void;
}

const IDContext = createContext<IDContextType | undefined>(undefined);

export const IDProvider = ({ children }: { children: ReactNode }) => {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    if (id === "") {
      setId(generateNumericUUID());
    }
  }, [id]);

  return (
    <IDContext.Provider value={{ id, setId }}>{children}</IDContext.Provider>
  );
};

export const useID = () => {
  const context = useContext(IDContext);
  if (!context) {
    throw new Error("useID must be used within an IDProvider");
  }
  return context;
};
