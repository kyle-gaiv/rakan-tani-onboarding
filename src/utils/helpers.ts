import schedule from "../data/schedule.json";
import { v4 as uuidv4 } from "uuid";
import {
  RakanTaniMessage,
  ClientMessage,
  UserScheduleDay,
  WhatsAppMessage,
} from "./types";

export function generateNumericUUID(): string {
  const uuid = uuidv4();
  const numericUuid = uuid.replace(/-/g, "").replace(/[^0-9]/g, "");

  // If the UUID starts with 0, replace the first digit with a random digit from 1-9
  if (numericUuid.startsWith("0")) {
    return Math.floor(Math.random() * 10).toString() + numericUuid.slice(1, 13);
  }
  return numericUuid.slice(0, 12); // Return first 12 digits to ensure its smaller than max value
}

interface ScheduleDay {
  hlt: number;
  nextHlt: number;
  activity: string[];
  activityId: number;
}

export function hltToNodeId(hlt: number): string {
  // node id's cannot start with '-' so for negative hlt values
  // prefix with 'd_99' and use absolute value, and for positive hlt values just prefix with 'd_'
  if (hlt < 0) {
    return `d_99${Math.abs(hlt)}`;
  }
  return `d_${hlt}`;
}

// Remove 'd_' prefix and convert to hlt
export function nodeIdToHlt(nodeId: string): number {
  if (nodeId.startsWith("d_99")) {
    return -Number(nodeId.replace("d_99", ""));
  }
  return Number(nodeId.replace("d_", ""));
}

// Convert JSON schedule to Mermaid format
export function jsonToMermaid(): string {
  const days = schedule.schedule as ScheduleDay[];

  let mermaidText = `flowchart TD
      classDef selected fill:#d9ead3ff,stroke:#333
      
      `;

  // Add nodes for each day and their activities
  // Add edges for each day to next day and each day to their activities
  days.forEach((day) => {
    const nodeId = hltToNodeId(day.hlt);
    mermaidText += `  ${nodeId}["Day ${day.hlt}"]\n`;
    mermaidText += `  click ${nodeId} handleDayNodeClick\n`;

    // Create separate activity nodes if there are multiple activities
    if (day.activity.length > 1) {
      day.activity.forEach((activity, index) => {
        const activityId = day.activityId + "_" + index.toString();
        mermaidText += `  ${activityId}["${activity}"]\n`;
        mermaidText += `  ${nodeId} -->|Performed Activity| ${activityId}\n`;
      });
    } else {
      mermaidText += `  ${day.activityId}["${day.activity.join(", ")}"]\n`;
      mermaidText += `  ${nodeId} -->|Performed Activity| ${day.activityId}\n`;
    }
  });

  return mermaidText;
}

// Helper function to generate a fake WAMID for WhatsApp testing (using ChatGPT)
export const generateFakeWamid = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomId = "";
  for (let i = 0; i < 62; i++) {
    randomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `wamid.${randomId}=`;
};

// Generate static farmer schedule in whatsapp page
// Days are received from MQTT message
export function generateUserFarmerSchedule(days: UserScheduleDay[]): string {
  if (!days || days.length === 0) {
    return "";
  }

  let mermaidText = `flowchart TD
      classDef currentDay fill:#d9ead3ff,stroke:#333
      classDef selected fill:#f9cb9cff,stroke:#333
      `;

  // Add nodes for each day and their activities
  // Add edges for each day to next day and each day to their activities
  days.forEach((day: UserScheduleDay) => {
    const hlt: number = day.hlt;
    const activities: string[] = day.activities;
    const activityIds: number[] = day.activityIds;
    const currentHlt: number = day.currentDayHlt;
    const activityDate: string = day.activityDate;
    const nodeId = hltToNodeId(hlt);
    mermaidText += `  ${nodeId}["Day ${hlt} (${activityDate})"]\n`;
    if (Number(currentHlt) === Number(hlt)) {
      mermaidText += `  class ${nodeId} currentDay;\n`;
    }
    mermaidText += `  click ${nodeId} handleDayNodeClick\n`;

    // Create separate activity nodes if there are multiple activities
    if (activities.length > 1) {
      activities.forEach((activity, index) => {
        const activityId =
          activityIds[index].toString() + "_" + index.toString();
        mermaidText += `  ${activityId}["${activity}"]\n`;
        mermaidText += `  ${nodeId} -->|Performed Activity| ${activityId}\n`;
      });
    } else {
      mermaidText += `  ${activityIds[0].toString()}["${activities.join(", ")}"]\n`;
      mermaidText += `  ${nodeId} -->|Performed Activity| ${activityIds[0]}\n`;
    }
  });

  return mermaidText;
}

// Function to decrypt JWT string using key
export async function decryptPacket(
  encryptedData: string,
  key: string,
): Promise<JSON | null> {
  if (!encryptedData) {
    return null;
  }
  encryptedData = encryptedData.replace(/ /g, "+");

  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0),
    );

    // Extract nonce (first 12 bytes) and ciphertext
    const nonce = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Prepare key
    const keyBytes = new TextEncoder().encode(
      key.padEnd(32, "\0").slice(0, 32),
    );

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      "AES-GCM",
      false,
      ["decrypt"],
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce },
      cryptoKey,
      ciphertext,
    );

    const jsonString = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(
      "Decryption failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export function getMessagesFromChatHistory(
  chatHistoryObject: WhatsAppMessage[],
  phoneNumber: string,
  farmerId: number,
): {
  previousRakanTaniMessages: RakanTaniMessage[];
  previousClientMessages: ClientMessage[];
} {
  const previousRakanTaniMessages: RakanTaniMessage[] = [];
  const previousClientMessages: ClientMessage[] = [];

  // Return empty arrays if chat history is empty
  if (!chatHistoryObject || chatHistoryObject.length === 0) {
    return {
      previousRakanTaniMessages,
      previousClientMessages,
    };
  }

  // Sort messages by modified date
  chatHistoryObject.sort((a, b) => {
    const dateA = new Date(a.modified);
    const dateB = new Date(b.modified);
    return dateA.getTime() - dateB.getTime();
  });

  // Limit to last 5 messages
  if (chatHistoryObject.length > 5) {
    chatHistoryObject = chatHistoryObject.slice(-5);
  }

  // Process each message
  chatHistoryObject.forEach((message) => {
    const timestamp = new Date(message.modified)
      .getTime()
      .toString()
      .slice(0, 10); // convert to 10 digit timestamp

    const clientMessage: ClientMessage = {
      message_type: "text",
      phone_number_id: "603884736138857", // default rakan tani number
      context_id: "", // context_id isn't used to display messages
      client_phone: phoneNumber,
      timestamp: timestamp,
      client_name: "", // client name isn't used to display messages
      m: message.query ?? "",
    };

    const rakanTaniMessage = {
      message_type: "text",
      phone_number_id: "603884736138857", // default rakan tani number
      client_phone: phoneNumber,
      timestamp: timestamp,
      message: message.answer ?? "",
      m: message.answer ?? "",
      farmer_id: farmerId,
      // Properties below are not essential to display messages, but are required by the RakanTaniMessage interface
      context_id: generateFakeWamid(), // generate a fake wamid for tracking purposes, acts as a unique identifier
      history: [],
      client_name: "",
      address: "",
      farmer_name: "",
      command: "",
      query_id: 0,
    };

    previousClientMessages.push(clientMessage);
    previousRakanTaniMessages.push(rakanTaniMessage);
  });

  return {
    previousRakanTaniMessages,
    previousClientMessages,
  };
}
