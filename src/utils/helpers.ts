import schedule from "../data/schedule.json";

export function generateNumericUUID(): string {
  const uuid = crypto.randomUUID();
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

function hltToNodeId(hlt: number): string {
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
