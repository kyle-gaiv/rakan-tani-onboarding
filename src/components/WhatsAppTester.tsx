"use client";

import React, { useEffect, useState } from "react";
import { useMqttContext } from "@/api/MqttContext";
import { toast } from "react-toastify";
import {
  ClientMessage,
  RakanTaniMessage,
  WhatsAppMessage,
} from "@/utils/types";
import { generateFakeWamid, getMessagesFromChatHistory } from "@/utils/helpers";
import ChatBubble from "./ChatBubble";
import ChatFeedback from "./ChatFeedback";
import FarmerSchedule from "./FarmerSchedule";
import MessageInput from "./MessageInput";
import { useID } from "@/api/IDContext";

export default function WhatsAppTester() {
  const [loading, setLoading] = useState<boolean>(true);
  const [chatHistoryLoaded, setChatHistoryLoaded] = useState<boolean>(false);
  const [rakanTaniMessages, setRakanTaniMessages] = useState<
    RakanTaniMessage[]
  >([]);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [clientMessages, setClientMessages] = useState<ClientMessage[]>([]);
  const {
    messages,
    subscribe,
    isClientReady,
    publish,
    isConnected,
    loading: mqttLoading,
  } = useMqttContext();
  const { phoneNumber: clientPhoneNumber, id: requestId, farmerId } = useID();

  useEffect(() => {
    if (!isClientReady) return;
    const initializeMqtt = async () => {
      if (isConnected) {
        try {
          setLoading(true);
          // Subscribe to the whatsapp-gw-reply topic to receive messages from Rakan Tani
          // and to history to load previous chat history
          if (subscribe) {
            subscribe(`whatsapp-gw-reply`);
            subscribe(`history/${requestId}`);
          }
          publish(
            "history",
            JSON.stringify({
              request_id: requestId,
              data: {
                farmerId: farmerId,
              },
            }),
          );
        } catch (error) {
          console.error("Error subscribing to whatsapp-gw:", error);
          toast.error(
            `Error subscribing to whatsapp-gw: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      } else if (!isConnected) {
        setLoading(false);
      }
    };
    initializeMqtt();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClientReady, isConnected]);

  useEffect(() => {
    if (!clientPhoneNumber) return;
    // Filter messages to find those on the `whatsapp-gw-reply` topic
    // and that match the client phone number
    if (messages && messages.length > 0) {
      const chatHistoryMessages = messages.filter((msg) => {
        return msg.topic === `history/${requestId}`;
      });

      const rakanTaniReplyMessages = messages.filter((msg) => {
        try {
          const messageContents = JSON.parse(msg.message);
          return (
            msg.topic === "whatsapp-gw-reply" &&
            messageContents.client_phone &&
            messageContents.client_phone === clientPhoneNumber
          );
          //eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          return false; // Ignore messages that cannot be parsed
        }
      });

      let previousRakanTaniMessages: RakanTaniMessage[] = [];
      let previousClientMessages: ClientMessage[] = [];
      // Only load chat history once
      if (!chatHistoryLoaded && chatHistoryMessages.length > 0) {
        setChatHistoryLoaded(true);
        const chatHistoryObject: WhatsAppMessage[] = JSON.parse(
          chatHistoryMessages[chatHistoryMessages.length - 1].message,
        ).history;
        // Convert chat history to previous messages in the correct format
        const {
          previousRakanTaniMessages: prevRakanTani,
          previousClientMessages: prevClient,
        } = getMessagesFromChatHistory(
          chatHistoryObject,
          clientPhoneNumber,
          farmerId,
        );
        previousRakanTaniMessages = prevRakanTani;
        previousClientMessages = prevClient;
        setClientMessages((prev) => [...prev, ...previousClientMessages]);
        setRakanTaniMessages((prev) => [...prev, ...previousRakanTaniMessages]);

        // Track the IDs of loaded messages
        const loadedIds = new Set(
          prevRakanTani.map((msg) => `${msg.context_id}`),
        );
        setProcessedMessageIds(loadedIds);
      }

      if (rakanTaniReplyMessages.length > 0) {
        const newMessages = rakanTaniReplyMessages
          .map((msg) => {
            const parsedMessage = JSON.parse(msg.message);
            return parsedMessage as RakanTaniMessage;
          })
          .filter((msg) => {
            return !processedMessageIds.has(`${msg.context_id}`);
          });

        // Skip if messages are the same
        // if (JSON.stringify(newMessages) !== JSON.stringify(rakanTaniMessages)) {
        if (newMessages.length > 0) {
          setRakanTaniMessages((prev) => [...prev, ...newMessages]);
          setProcessedMessageIds((prev) => {
            const newSet = new Set(prev);
            newMessages.forEach((msg) => {
              newSet.add(`${msg.context_id}`);
            });
            return newSet;
          });

          toast.success("Chat updated!");
        }
      }

      setLoading(false);
    }
  }, [
    messages,
    clientPhoneNumber,
    chatHistoryLoaded,
    farmerId,
    requestId,
    processedMessageIds,
  ]);

  function WhatsAppChatHistory() {
    return (
      <div className="flex flex-col gap-4 p-1 pb-[64px] sm:p-4 sm:pb-[64px] w-full min-h-[300px]">
        {/* interleave messages from client with messages from rakan tani */}
        {[
          ...Array(Math.max(clientMessages.length, rakanTaniMessages.length)),
        ].map((_, index) => (
          <div key={index} className="flex flex-col gap-2 w-full">
            {clientMessages[index] && (
              <ChatBubble
                date={new Date(Number(clientMessages[index].timestamp) * 1000)}
                message={clientMessages[index].m}
                isUser
              />
            )}
            {rakanTaniMessages[index] && (
              <ChatBubble
                date={
                  new Date(Number(rakanTaniMessages[index].timestamp) * 1000)
                }
                message={rakanTaniMessages[index].m}
                isUser={false}
                collectFeedback
              >
                <ChatFeedback
                  key={`${rakanTaniMessages[index].context_id}-${rakanTaniMessages[index].timestamp}`}
                  response={rakanTaniMessages[index]}
                  query={clientMessages[index]}
                />
              </ChatBubble>
            )}
          </div>
        ))}
      </div>
    );
  }

  // publish to whatsapp-gw in the following format:
  // {
  //    "message_type":"text",
  //    "phone_number_id":"603884736138857",
  //    "context_id":"wamid.HBgLMTUxMDgxNjI2NTgVAgASGBQzQTI5QjlCQTM4MjM4MDBCMjg2RAA=",
  //    "client_phone":"15108162658",
  //    "timestamp":"1750320079",
  //    "client_name":"Kyle R",
  //    "m":"This is a test message"
  //}
  const handleSendMessage = async (messageToSend: string) => {
    const message = JSON.stringify({
      message_type: "text",
      phone_number_id: "603884736138857", //default rakan tani phone number
      context_id: generateFakeWamid(), // generates fake wamid
      client_phone: clientPhoneNumber, // user's input phone number
      timestamp: Math.floor(Date.now() / 1000).toString(), // current timestamp to 10 digits
      client_name: "",
      m: messageToSend,
    });

    try {
      publish("whatsapp-gw", message);
      setClientMessages((prev) => [
        ...prev,
        JSON.parse(message) as ClientMessage,
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(
        `Error sending message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <>
      {loading || mqttLoading ? (
        <div className="flex items-center justify-center w-full h-full">
          <p className="text-gray-500 font-semibold">Loading...</p>
        </div>
      ) : isClientReady && !isConnected ? (
        <div className="flex flex-col gap-4 items-center justify-center w-full h-full text-black">
          <p className="font-semibold text-center">Your access has expired</p>
          <p className="text-sm font-normal text-center">
            Please send a message to Rakan Tani on WhatsApp for the latest
            access link
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-start justify-start gap-4 w-full">
          <h1 className="text-2xl font-bold">Test WhatsApp Messages</h1>
          {farmerId && <FarmerSchedule farmerId={farmerId} />}
          <div
            className="flex flex-col gap-2 bg-gray-300 p-4 w-full rounded-md max-h-[500px] overflow-y-auto relative"
            // Auto-scrolls to bottom so that the latest messages are always visible
            ref={(el) => {
              if (el) {
                el.scrollTop = el.scrollHeight;
              }
            }}
          >
            {!clientPhoneNumber ? (
              <div className="min-h-[300px] flex items-center justify-center">
                <p className="text-red-500 font-semibold">
                  Phone number not found, please message Rakan Tani on WhatsApp
                  to receive a new access link.
                </p>
              </div>
            ) : (
              <div className="flex flex-col justify-end items-stretch w-full h-full relative">
                <WhatsAppChatHistory />
                <MessageInput onSendMessage={handleSendMessage} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
