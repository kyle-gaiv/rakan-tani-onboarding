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
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  farmerId: number;
  setFarmerId: (farmerId: number) => void;
  jwt: string;
  setJwt: (jwt: string) => void;
}

const IDContext = createContext<IDContextType | undefined>(undefined);

export const IDProvider = ({ children }: { children: ReactNode }) => {
  const [id, setId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [farmerId, setFarmerId] = useState<number>(-1);
  const [jwt, setJwt] = useState<string>("");

  useEffect(() => {
    if (id === "") {
      setId(generateNumericUUID());
    }
  }, [id]);

  return (
    <IDContext.Provider
      value={{
        id,
        setId,
        phoneNumber,
        setPhoneNumber,
        farmerId,
        setFarmerId,
        jwt,
        setJwt,
      }}
    >
      {children}
    </IDContext.Provider>
  );
};

export const useID = () => {
  const context = useContext(IDContext);
  if (!context) {
    throw new Error("useID must be used within an IDProvider");
  }
  return context;
};
