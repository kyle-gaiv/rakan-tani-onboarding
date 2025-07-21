import Paho from "paho-mqtt";
import { useCallback, useState, useRef, useEffect } from "react";
import { useID } from "./IDContext";
import { MQTTMessage } from "../utils/types";

export const useUATMqtt = (username: string, password: string) => {
  // Configuration for the MQTT client
  const [isClientReady, setIsClientReady] = useState<boolean>(false);
  const { id } = useID();
  const clientId = "uat-" + id; // Unique client ID for the MQTT client
  const clientRef = useRef<Paho.Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMqttConnected, setIsMqttConnected] = useState<boolean>(false);

  // States to hold messages and subscribed topics
  const messagesRef = useRef<MQTTMessage[]>([]);
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const subscribedTopicsRef = useRef<Set<string>>(new Set());

  // Populate states once the user has been prompted / local storage has been set
  useEffect(() => {
    if (clientRef.current) return;

    try {
      clientRef.current = new Paho.Client(
        `wss://dev.gaiv.my:4000/ws`,
        clientId,
      );
      setIsClientReady(true);
    } catch (error) {
      console.error("Error creating MQTT client:", error);
    }
  }, [clientId]);

  // Ref to keep track of the MQTT client connection
  const connectedRef = useRef<boolean>(false);

  // Resubscribe to all topics if connection is lost
  const resubscribeToTopics = () => {
    const client = clientRef.current!;
    if (!client) return;

    subscribedTopicsRef.current.forEach((topic) => {
      client.subscribe(topic, {
        onSuccess: () => {},
        onFailure: (error: unknown) => {
          console.error(`Failed to resubscribe to ${topic}:`, error);
        },
      });
    });
  };

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
          console.warn(
            "Connection lost, reconnecting:",
            responseObject.errorMessage,
          );
          // Retry connection with a delay
          setTimeout(() => {
            connect(); // Retry connection after a delay
          }, 3000); // Delay before reconnecting (3 seconds)
          return;
        }
      };

      // Handle incoming messages
      client.onMessageArrived = (message) => {
        // Process the message
        const newMessage: MQTTMessage = {
          topic: message.destinationName,
          message: message.payloadString,
        };
        messagesRef.current.push(newMessage);
        setMessages([...messagesRef.current]);
      };

      const connectionSettings = {
        userName: username,
        password: password,
        onSuccess: () => {
          console.log("UAT MQTT connected");
          resubscribeToTopics();
          connectedRef.current = true;
          setLoading(false);
          setIsMqttConnected(true);
        },
        onFailure: (error: unknown) => {
          console.warn("MQTT connection failed:", error);
          setLoading(false);
          setIsMqttConnected(false);
        },
        reconnect: false,
        keepAliveInterval: 120,
      };

      client.connect(connectionSettings);
    } catch (error) {
      console.error("Connection error:", error);
    }
  }, [password, username]);

  // Disconnect the MQTT client
  const disconnect = useCallback(() => {
    const client = clientRef.current!;
    if (!client) {
      console.error("MQTT client is not initialized");
      return;
    }

    client.disconnect();
    connectedRef.current = false;
    setIsMqttConnected(false);
    console.log("MQTT disconnected");
  }, []);

  // Subscribe to a topic
  const subscribe = useCallback((topic: string) => {
    const client = clientRef.current!;
    if (!client) {
      // console.error("MQTT client is not initialized");
      return;
    }

    client.subscribe(topic, {
      onSuccess: () => {},
      onFailure: (error: unknown) => {
        console.error(`Failed to subscribe to topic ${topic}:`, error);
      },
    });
    // Add to subscribed topics list
    subscribedTopicsRef.current.add(topic);
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

  return {
    connect,
    disconnect,
    publish,
    isConnected: isMqttConnected,
    isClientReady,
    messages,
    loading,
    subscribe,
  };
};
