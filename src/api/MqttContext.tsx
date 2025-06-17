"use client";

import { createContext, useContext, useEffect } from "react";
import { useMqtt } from "@/api/useMqtt";

const MqttContext = createContext<ReturnType<typeof useMqtt> | null>(null);

export const MqttProvider = ({ children }: { children: React.ReactNode }) => {
  const mqtt = useMqtt();
  const { connect, disconnect, isClientReady, isConnected } = mqtt;

  // Connect once when client is ready
  useEffect(() => {
    if (isClientReady && !isConnected) {
      connect();
    }

    if (isClientReady)
      return () => {
        disconnect(); // Disconnect on unmount
      };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClientReady]);

  return <MqttContext.Provider value={mqtt}>{children}</MqttContext.Provider>;
};

export const useMqttContext = () => {
  const context = useContext(MqttContext);
  if (!context)
    throw new Error("useMqttContext must be used inside MqttProvider");
  return context;
};
