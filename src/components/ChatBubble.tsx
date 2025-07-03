import React from "react";
import ReactMarkdown from "react-markdown";

type ChatBubbleProps = {
  date: Date;
  message: string;
  isUser: boolean;
  senderName?: string;
  collectFeedback?: boolean;
  children?: React.ReactNode;
};

export default function ChatBubble({
  date,
  message,
  isUser,
  senderName = "",
  collectFeedback = false,
  children,
}: ChatBubbleProps) {
  // If message has "As a beta tester" at the end, remove any text after it
  if (message.includes("As a beta tester, ")) {
    const index = message.indexOf("As a beta tester, ");
    if (index !== -1) {
      message = message.substring(0, index).trim();
    }
  }

  return (
    <div
      className={`grid grid-cols-3 gap-2 sm:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Pad left side with empty div to display client message on right side */}
      {isUser && <div className="col-span-1"></div>}
      <div
        className={`flex flex-col gap-1 col-span-2 ${isUser ? "items-end" : "items-start"}`}
      >
        {senderName && (
          <p className="text-[12px] md:text-[14px] text-zinc-700">
            {senderName}
          </p>
        )}
        <div className="flex flex-col gap-2 max-w-full">
          <div
            className={`flex flex-col items-start ${isUser ? "bg-green-100" : "bg-gray-100"} text-black p-2 sm:p-3 gap-1 rounded-lg w-full`}
          >
            {/* Render Markdown correctly to preserve text formatting */}
            <div className="text-[14px] md:text-[16px] max-w-full overflow-x-auto">
              <ReactMarkdown>{message}</ReactMarkdown>
            </div>
            <p className="text-[10px] md:text-[12px] text-gray-500 self-end">
              {date.toLocaleString("en-GB")}
            </p>
            {/* Display thumbs up/down icons to collect feedback */}
          </div>
          {collectFeedback && <>{children}</>}
        </div>
      </div>
      {/* Pad right side to display message from rakan tani on left side */}
      {!isUser && <div></div>}
    </div>
  );
}
