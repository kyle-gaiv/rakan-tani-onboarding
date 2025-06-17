import Paho from "paho-mqtt";
import { useCallback, useState, useRef, useMemo, useEffect } from "react";
import { useID } from "./IDContext";

export const useMqtt = () => {
  // Configuration for the MQTT client
  const [isClientReady, setIsClientReady] = useState<boolean>(false);
  const { id } = useID();
  const clientId = "onboard-" + id; // Unique client ID for the MQTT client
  const clientRef = useRef<Paho.Client | null>(null);

  // Populate states once the user has been prompted / local storage has been set
  useEffect(() => {
    if (clientRef.current) return;

    try {
      clientRef.current = new Paho.Client(
        "35.240.204.179",
        9001,
        "/ws",
        clientId,
      );
      setIsClientReady(true);
    } catch (error) {
      console.error("Error creating MQTT client:", error);
    }
  }, [clientId]);

  // Ref to keep track of the MQTT client connection
  const connectedRef = useRef<boolean>(false);

  // Initialize the MQTT client
  const connect = useCallback(async () => {
    const client = clientRef.current!;
    if (!client) {
      console.error("MQTT client is not initialized");
      return;
    }

    if (connectedRef.current) {
      console.warn("MQTT client is already connected"); // Skips connecting if already connected
      return;
    }

    try {
      // Handle disconnection
      client.onConnectionLost = (responseObject) => {
        connectedRef.current = false;
        if (responseObject.errorCode !== 0) {
          console.error("Connection lost:", responseObject.errorMessage);
          return;
        }
      };

      const connectionSettings = {
        userName: "onboard",
        password: "onboard",
        onSuccess: () => {
          console.log("MQTT connected");
          connectedRef.current = true;
        },
        onFailure: (error: unknown) => {
          console.error("MQTT connection failed:", error);
        },
        reconnect: false,
        keepAliveInterval: 120,
      };

      client.connect(connectionSettings);
    } catch (error) {
      console.error("Connection error:", error);
    }
  }, [clientId]);

  // Disconnect the MQTT client
  const disconnect = useCallback(() => {
    const client = clientRef.current!;
    if (!client) {
      console.error("MQTT client is not initialized");
      return;
    }

    client.disconnect();
    connectedRef.current = false;
    console.log("MQTT disconnected");
  }, []);

  // Publish a message to a topic
  const publish = useCallback((topic: string, message: string) => {
    const client = clientRef.current!;
    if (!client) {
      // console.error("MQTT client is not initialized");
      return;
    }

    if (message.trim().length === 0 || topic.trim().length === 0) {
      throw new Error("Topic or message cannot be empty");
      return;
    }
    const mqttMessage = new Paho.Message(message);
    mqttMessage.destinationName = topic;
    client.send(mqttMessage);
  }, []);

  const isConnected = useMemo(() => {
    const client = clientRef.current!;
    if (!client) {
      // console.error("MQTT client is not initialized");
      return;
    }
    if (client) return client.isConnected();
  }, []);

  return {
    connect,
    disconnect,
    publish,
    isConnected,
    isClientReady,
  };
};
