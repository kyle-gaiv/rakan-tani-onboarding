"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useOnboardMqtt } from "@/api/useOnboardMqtt";
import { useUATMqtt } from "./useUATMqtt";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MQTTMessage } from "@/utils/types";
import { decryptPacket } from "@/utils/helpers";
import { useID } from "./IDContext";
import { jwtDecode } from "jwt-decode";

const MqttContext = createContext<
  ReturnType<typeof useOnboardMqtt> | ReturnType<typeof useUATMqtt> | null
>(null);

export const MqttProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const packet = searchParams.get("packet");
  const [decryptedPacket, setDecryptedPacket] = useState<any>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(true);
  const { setPhoneNumber, setFarmerId, setJwt } = useID();

  const isOnboardPage = pathname.includes("/onboard");
  const isUATPage = pathname.includes("/uat");

  // Handle decrypting of packet into JWT token and phone number
  useEffect(() => {
    const decryptPacketFromUrl = async (packet: string | null) => {
      setIsDecrypting(true);
      try {
        // console.log("Packet from URL: ", packet);
        // console.log("Encoded packet:", encodeURIComponent(packet!));
        // console.log("Decoded packet:", decodeURIComponent(packet!));
        const decryptedPacket = (await decryptPacket(
          decodeURIComponent(packet!),
          "your-secret-key-here-make-it-long",
        )) as { phone?: string; jwt?: string };
        // console.log("Decrypted packet: ", decryptedPacket);
        setPhoneNumber(decryptedPacket?.phone || "");
        setDecryptedPacket(decryptedPacket);
        const decryptedJwt = jwtDecode(decryptedPacket?.jwt || "");
        // console.log("Decrypted JWT: ", decryptedJwt);
        setJwt(decryptedPacket?.jwt || "");
        setFarmerId(Number(decryptedJwt.sub) || -1);
      } catch (error) {
        console.error("Failed to decrypt packet:", error);
      } finally {
        setIsDecrypting(false);
      }
    };

    decryptPacketFromUrl(packet);
  }, [packet]);

  // Set the credentials based on the current page
  const username = isOnboardPage ? "onboard" : "";
  const jwtToken = decryptedPacket?.jwt || "";
  const password = isOnboardPage ? "onboard" : jwtToken;

  const onboardMqtt = useOnboardMqtt(username, password!);
  const uatMqtt = useUATMqtt(username, password!);

  const mqtt = isOnboardPage ? onboardMqtt : uatMqtt;
  const { connect, disconnect, isClientReady, isConnected } = mqtt;

  // Route user back to home if no packet param in URL
  // useEffect(() => {
  //   if (isUATPage && !packet && !isDecrypting) {
  //     router.push("/");
  //     return;
  //   }
  // }, [packet, router, isUATPage]);

  if (!isOnboardPage && !isUATPage) {
    return <div>{children}</div>; // Return null if not on /onboard or /uat
  }

  // if (isUATPage && !packet) {
  //   return null;
  // }

  // Connect once when client is ready
  //eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isClientReady && !isConnected && !isDecrypting) {
      const handleConnectToMqtt = async () => {
        try {
          await connect();
        } catch (error) {
          console.error("error caught in MqttProvider:", error);
          // if (isUATPage) router.push("/"); // Redirect to home if connection fails
        }
      };

      handleConnectToMqtt();
    }

    return () => {
      if (isClientReady && isConnected) {
        disconnect(); // Disconnect on unmount
      }
    };
  }, [
    isClientReady,
    isConnected,
    connect,
    disconnect,
    isUATPage,
    router,
    isDecrypting,
    setPhoneNumber,
  ]);

  return <MqttContext.Provider value={mqtt}>{children}</MqttContext.Provider>;
};

type MqttContextType = {
  connect: () => Promise<void>;
  disconnect: () => void;
  publish: (topic: string, message: string) => void;
  isConnected?: boolean;
  isClientReady: boolean;
  subscribe?: (topic: string) => void;
  messages?: MQTTMessage[];
  loading?: boolean;
};

export const useMqttContext = (): MqttContextType => {
  const context = useContext(MqttContext);
  if (!context)
    throw new Error("useMqttContext must be used inside MqttProvider");
  return context;
};
