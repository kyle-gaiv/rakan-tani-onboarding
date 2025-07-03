import React, { useEffect, useState } from "react";
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import Button from "./Button";
import { ClientMessage, RakanTaniMessage } from "@/utils/types";
import { toast } from "react-toastify";
import { useMqttContext } from "@/api/MqttContext";
import { useID } from "@/api/IDContext";

const globalProcessedFeedbackMessages = new Map<string, Set<string>>();

const ChatFeedback = React.memo(
  function ChatFeedback({
    response,
    query,
  }: {
    response: RakanTaniMessage;
    query: ClientMessage;
  }) {
    const [feedback, setFeedback] = useState<string>("");
    const [idealResponse, setIdealResponse] = useState<string>("");
    const [goodFeedback, setGoodFeedback] = useState<string>("");
    const [showFeedbackInputs, setShowFeedbackInputs] =
      useState<boolean>(false);
    const [showGoodFeedbackInputs, setShowGoodFeedbackInputs] =
      useState<boolean>(false);
    const { publish, messages, subscribe, isClientReady } = useMqttContext();
    const requestId = response.context_id.split(".")[1].split("=")[0];
    const { jwt } = useID();

    // Create a unique key for this ChatFeedback instance
    const instanceKey = `${response.context_id}-${response.timestamp}`;

    // Get or create the processed messages set for this instance
    if (!globalProcessedFeedbackMessages.has(instanceKey)) {
      globalProcessedFeedbackMessages.set(instanceKey, new Set<string>());
    }
    const processedMessages = globalProcessedFeedbackMessages.get(instanceKey)!;

    useEffect(() => {
      if (isClientReady) {
        const initializeMqtt = async () => {
          try {
            // Subscribe to the uat topics to receive schedule info and update schedule
            if (subscribe) {
              subscribe(`uatfeedback/*`);
            }
          } catch (error) {
            console.error("Error initializing mqtt:", error);
            toast.error(
              `Error initializing mqtt: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            );
          }
        };
        initializeMqtt();
      }
    }, [isClientReady]);

    const handleSubmitGoodFeedback = async () => {
      try {
        const message = JSON.stringify({
          request_id: requestId,
          data: {
            farmer_id: response.farmer_id,
            wam_id: response.context_id,
            query: query.m,
            answer: response.m,
            feedback:
              goodFeedback === ""
                ? `User ${response.farmer_name} was satisfied with response`
                : goodFeedback,
            idealResponse: "",
            jwt: jwt,
          },
        });
        publish(`uatfeedback`, message);
      } catch (error) {
        console.error("Error submitting good feedback:", error);
        toast.error(
          `Error submitting feedback: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    };

    const handleSubmitFeedback = async () => {
      try {
        const message = JSON.stringify({
          request_id: requestId,
          data: {
            farmer_id: response.farmer_id,
            wam_id: response.context_id,
            query: query.m,
            answer: response.m,
            feedback:
              feedback === ""
                ? `User ${response.farmer_name} was dissatisfied with response`
                : feedback,
            idealResponse:
              idealResponse === ""
                ? `User ${response.farmer_name} was dissatisfied with response`
                : idealResponse,
            jwt: jwt,
          },
        });
        publish(`uatfeedback`, message);
      } catch (error) {
        console.error("Error submitting feedback:", error);
        toast.error(
          `Error submitting feedback: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    };

    useEffect(() => {
      if (!messages || messages.length === 0) {
        return;
      }

      const relevantMessages = messages.filter((msg) => {
        return msg.topic === `uatfeedback/${requestId}`;
      });

      if (relevantMessages.length === 0) {
        return; // No relevant messages to process
      }

      const mostRecentMessage = relevantMessages[relevantMessages.length - 1];

      // Create unique message identifier
      const messageId = `${mostRecentMessage.topic}-${JSON.stringify(mostRecentMessage.message)}`;

      // Check if this message was already processed by THIS instance
      if (processedMessages.has(messageId)) {
        return;
      }

      let messageContents;
      try {
        messageContents = JSON.parse(mostRecentMessage.message);
      } catch (error) {
        console.error("Failed to parse feedback message:", error);
        return;
      }

      // Verify this message is for this specific feedback instance
      const isForThisInstance =
        mostRecentMessage.topic === `uatfeedback/${requestId}`;

      if (!isForThisInstance) {
        return;
      }

      // Mark as processed BEFORE handling
      processedMessages.add(messageId);

      const result = messageContents.success as boolean;

      if (result) {
        toast.success("Feedback submitted successfully!");
        setShowGoodFeedbackInputs(false);
        setGoodFeedback("");
        setShowFeedbackInputs(false);
        setFeedback("");
        setIdealResponse("");
      } else if (!result) {
        console.error("Failed to submit feedback, please try again.");
      }
    }, [messages, requestId, response.context_id, processedMessages]);

    return (
      <div className="flex flex-col gap-2 items-start justify-start w-full">
        <p className="text-[10px] sm:text-xs text-gray-500 self-end">
          Are you satisfied with this response?
        </p>
        <div className="flex flex-row gap-4 sm:gap-8 items-center justify-end w-full">
          <FaThumbsUp
            className={`m-1 hover:cursor-pointer ${showGoodFeedbackInputs ? "fill-black" : "fill-gray-500"}`}
            onClick={() => {
              // handleSubmitGoodFeedback(true);
              setShowGoodFeedbackInputs(!showGoodFeedbackInputs);
              setShowFeedbackInputs(false);
            }}
          />
          <FaThumbsDown
            className={`m-1 hover:cursor-pointer ${showFeedbackInputs ? "fill-black" : "fill-gray-500"}`}
            onClick={() => {
              // handleSubmitFeedback(true);
              setShowFeedbackInputs(!showFeedbackInputs);
              setShowGoodFeedbackInputs(false);
            }}
          />
        </div>
        {showGoodFeedbackInputs && (
          <div className="flex flex-col sm:flex-row w-full gap-2">
            <textarea
              placeholder="What did you like about this response? (You may leave this blank)"
              value={goodFeedback}
              onChange={(e) => setGoodFeedback(e.target.value)}
              className="w-full p-2 rounded-lg bg-white text-[10px] sm:text-[14px]"
            />
            <Button
              label="Submit Feedback"
              onClick={() => handleSubmitGoodFeedback()}
              small
            />
          </div>
        )}
        {showFeedbackInputs && (
          <>
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 w-full">
              <textarea
                placeholder="Enter your feedback here (You may leave this blank)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full p-2 rounded-lg bg-white text-[10px] sm:text-[14px]"
              />
              <textarea
                placeholder="Enter an ideal response here (You may leave this blank)"
                value={idealResponse}
                onChange={(e) => setIdealResponse(e.target.value)}
                className="w-full p-2 rounded-lg bg-white text-[10px] sm:text-[14px]"
              />
            </div>
            <Button
              label="Submit Feedback"
              onClick={() => handleSubmitFeedback()}
              small
            />
          </>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Prevent re-render if response and query have the same properties
    return (
      prevProps.response.context_id === nextProps.response.context_id &&
      prevProps.response.timestamp === nextProps.response.timestamp &&
      prevProps.query.timestamp === nextProps.query.timestamp &&
      prevProps.query.context_id === nextProps.query.context_id
    );
  },
);

export default ChatFeedback;
