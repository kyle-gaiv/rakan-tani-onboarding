import React, { useState } from "react";

export default function MessageInput({
  onSendMessage,
}: {
  onSendMessage: (message: string) => void;
}) {
  const [messageToSend, setMessageToSend] = useState("");

  const handleSend = () => {
    onSendMessage(messageToSend);
    setMessageToSend("");
  };

  return (
    <div className="flex flex-row self-center items-center justify-between gap-4 absolute z-5 w-9/10 bottom-0 mb-4 pr-4 text-[12px] sm:text-[16px]">
      <input
        type="text"
        onChange={(e) => setMessageToSend(e.target.value)}
        value={messageToSend}
        placeholder="Enter message to send"
        className="w-full p-2 rounded-xl bg-white"
      />
      <button
        onClick={handleSend}
        disabled={!messageToSend}
        className={`${messageToSend ? "cursor-pointer" : "cursor-not-allowed"}`}
      >
        Send
      </button>
    </div>
  );
}
