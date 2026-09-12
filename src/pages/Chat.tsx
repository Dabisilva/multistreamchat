import React, { useEffect } from "react";
import { MessageRow } from "../components/MessageRow";
import { useChat } from "./useChat";

const Chat: React.FC = () => {
  const {
    messages,
    config,
    showScrollButton,
    chatContainerRef,
    scrollToBottom,
    handleScroll,
    customStyles,
  } = useChat();

  useEffect(() => {
    if (window.name !== "ChatWidget") return;
    document.documentElement.classList.add("widget-dark-bg");
    return () => document.documentElement.classList.remove("widget-dark-bg");
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-transparent">
      <div
        className="h-full min-h-0 p-2.5 overflow-y-auto relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {/* Chat Messages */}
        <div
          className={`flex flex-col min-h-full ${config.alignMessages === "block" ? "justify-start" : "justify-end"}`}
        >
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              customStyles={customStyles}
            />
          ))}
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            className="fixed bottom-5 right-5 w-[50px] h-[50px] rounded-full bg-purple-500 text-white border-0 text-xl font-bold cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 z-[1000] flex items-center justify-center"
            onClick={scrollToBottom}
            title="Rolar para o final"
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
};

export default Chat;
