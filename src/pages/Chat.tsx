import React from 'react';
import { MessageRow } from '../components/MessageRow';
import { useChat } from './useChat';

const Chat: React.FC = () => {
  const {
    messages,
    config,
    showScrollButton,
    chatContainerRef,
    removeMessage,
    scrollToBottom,
    handleScroll,
    customStyles
  } = useChat();

  // Show chat interface
  return (
    <div className="h-screen flex flex-col bg-transparent">
      <div
        className="flex flex-col h-full p-2.5 overflow-y-auto relative"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {/* Chat Messages */}
        <div className={`flex flex-col min-h-full ${config.alignMessages === 'block' ? 'justify-start' : 'justify-end flex-grow'}`}>
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              hideAfter={config.hideAfter}
              onRemove={removeMessage}
              customStyles={customStyles}
            />
          ))}
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            className="fixed bottom-5 right-5 w-[50px] h-[50px] rounded-full bg-purple-500 text-white border-0 text-xl font-bold cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 z-[1000] flex items-center justify-center hover:bg-purple-700 hover:scale-110 hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:scale-95"
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
