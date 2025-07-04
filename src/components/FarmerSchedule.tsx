import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  generateUserFarmerSchedule,
  hltToNodeId,
  nodeIdToHlt,
} from "@/utils/helpers";
import { MermaidDiagram } from "@lightenna/react-mermaid-diagram";
import { useMqttContext } from "@/api/MqttContext";
import { MQTTMessage, UserScheduleDay } from "@/utils/types";
import { useID } from "@/api/IDContext";

export default function FarmerSchedule({ farmerId }: { farmerId: number }) {
  const [mermaidChartText, setMermaidChartText] = useState<string>("");
  const [scheduleDays, setScheduleDays] = useState<UserScheduleDay[]>([]);
  const [mermaidLoading, setMermaidLoading] = useState<boolean>(true);
  const [mermaidSuccessful, setMermaidSuccessful] = useState<boolean>(false);
  const scheduleGeneratedRef = useRef<boolean>(false); // Flag to track if schedule has been generated
  const { subscribe, publish, isClientReady, messages } = useMqttContext();
  const { id: requestId, jwt } = useID(); // id for unique request IDs
  const [storedUpdateMessages, setStoredUpdateMessages] = useState<
    MQTTMessage[]
  >([]);
  const [storedScheduleMessages, setStoredScheduleMessages] = useState<
    MQTTMessage[]
  >([]);

  useEffect(() => {
    if (isClientReady && farmerId && !scheduleGeneratedRef.current) {
      const initializeMqtt = async () => {
        try {
          // Subscribe to the uat topics to receive schedule info and update schedule
          if (subscribe) {
            subscribe(`uatschedule/${requestId}`);
            subscribe(`uatupdatestep/${requestId}`);
          }
          publish(
            `uatschedule`,
            JSON.stringify({
              request_id: requestId,
              data: {
                farmer_id: farmerId,
                jwt: jwt,
              },
            }),
          ); // Send a message to generate the schedule
          scheduleGeneratedRef.current = true; // Set flag to true after first initialization to prevent re-initialization
          setMermaidLoading(false);
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
  }, [isClientReady, farmerId, requestId, jwt]);

  // Listen to incoming messages and filter for schedule updates
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Filter to store messages only from uatschedule and uatupdatestep topics
      const scheduleMessages = messages.filter((msg) => {
        return msg.topic === `uatschedule/${requestId}`;
      });

      const updateMessages = messages.filter((msg) => {
        return msg.topic === `uatupdatestep/${requestId}`;
      });

      // Generate schedule if there are any messages
      if (scheduleMessages.length > storedScheduleMessages.length) {
        try {
          setStoredScheduleMessages(scheduleMessages);
          const mostRecentMessage =
            scheduleMessages[scheduleMessages.length - 1];
          const messageContents = JSON.parse(mostRecentMessage.message)
            .result as UserScheduleDay[];
          // Check if the schedule has changed, then only update mermaid chart
          if (
            JSON.stringify(scheduleDays) !== JSON.stringify(messageContents)
          ) {
            setScheduleDays(messageContents);
            const mermaidText = generateUserFarmerSchedule(messageContents);
            if (!mermaidText) {
              setMermaidSuccessful(false);
              return;
            }
            setMermaidSuccessful(true);
            setMermaidChartText(mermaidText);
            setMermaidLoading(false);
          }
        } catch (error) {
          console.error("Error generating schedule:", error);
        }
      }

      // Handle respones to schedule updates
      if (updateMessages.length > storedUpdateMessages.length) {
        setStoredUpdateMessages(updateMessages);
        const mostRecentUpdateMessage =
          updateMessages[updateMessages.length - 1];
        const success: boolean = JSON.parse(
          mostRecentUpdateMessage.message,
        ).success;
        const messageContents = JSON.parse(
          mostRecentUpdateMessage.message,
        ).result;
        if (success) {
          toast.success(`Current day updated to ${messageContents.hlt}`);
          // Remove any previous 'selected' class assignment
          const cleanedMermaidText = mermaidChartText.replace(
            /class\s+d_\d{1,4}\s+selected/g,
            "",
          );
          // Add the new 'selected' class assignment to the clicked node
          const newMermaidText =
            cleanedMermaidText +
            `\n  class ${hltToNodeId(messageContents.hlt)} selected\n`;
          setMermaidChartText(newMermaidText);
          setMermaidSuccessful(true);
        } else {
          // No update needed for current day
        }
      }
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, farmerId]);

  // Handler for click events in mermaid diagram
  useEffect(() => {
    (window as any).handleDayNodeClick = async function (nodeId: string) {
      const dayHlt = nodeIdToHlt(nodeId);
      try {
        publish(
          `uatupdatestep`,
          JSON.stringify({
            request_id: requestId,
            data: {
              farmer_id: farmerId,
              new_hlt: dayHlt,
              jwt: jwt,
            },
          }),
        ); // Send a message to update the current day
      } catch (error) {
        console.error("Error updating farmer day:", error);
      }
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-start w-full h-full bg-white rounded rounded-md p-4">
      {!farmerId ? (
        <div>
          <p>Schedule only loads after you send a message</p>
        </div>
      ) : mermaidLoading ? (
        <div className="flex items-center justify-center text-center w-full h-full">
          <p className="text-gray-500 font-semibold">Loading schedule...</p>
        </div>
      ) : !mermaidSuccessful ? (
        <div className="flex items-center justify-center text-center w-full h-full">
          <p className="text-red-500 font-semibold">
            No farmer schedule found for this user
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[4500px] sm:min-w-[7000px] shrink-0 min-h-fit max-h-[300px]">
            <MermaidDiagram
              className="h-full text-center"
              securityLevel="loose"
            >
              {mermaidChartText}
            </MermaidDiagram>
          </div>
        </div>
      )}
    </div>
  );
}
