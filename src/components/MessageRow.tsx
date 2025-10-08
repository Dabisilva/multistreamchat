import React, { useEffect, useRef } from 'react';
import { MessageRowProps } from '../types';
import { attachEmotes, createUsernameHtml, getValidBadges } from '../utils/messageUtils';

export const MessageRow: React.FC<MessageRowProps> = ({
  message,
  hideAfter,
  onRemove
}) => {
  const messageRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set up auto-hide if hideAfter is not 120 (infinite)
    if (hideAfter !== 180) {
      timeoutRef.current = setTimeout(() => {
        onRemove(message.id);
      }, hideAfter * 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message.id, hideAfter, onRemove]);

  const processedText = attachEmotes(message, message.provider);
  const usernameHtml = createUsernameHtml(
    message.displayName,
    message.displayColor,
    'user'
  );

  const actionClass = message.isAction ? 'action' : '';

  return (
    <div
      ref={messageRef}
      data-sender={message.userId}
      data-msgid={message.msgId}
      className="my-1 p-0 rounded-none max-w-[90%] break-words bg-transparent border-0"
      id={`msg-${message.id}`}
    >
      <div className={`flex items-center gap-1.5 font-bold text-base bg-purple-950 px-2 py-1 rounded-md w-fit ${actionClass}`}>
        <div className="flex items-center gap-0.5 flex-wrap">
          {getValidBadges(message.badges).map((badge, index) => (
            <img
              key={`${badge.type}-${badge.version}-${index}`}
              alt=""
              src={badge.url}
              className="w-4 h-4 object-contain align-middle border-0 rounded-sm mr-0.5 inline-block transition-all duration-200 ease-in-out"
              title={badge.description || `${badge.type} badge`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.opacity = '1';
              }}
              style={{ opacity: 0 }}
            />
          ))}
        </div>
        <span
          className="username"
          dangerouslySetInnerHTML={{ __html: usernameHtml }}
        />
      </div>
      <div
        className={`text-white bg-purple-500 px-3 py-2 rounded-[10px] leading-[1.4] m-0 ml-1.5 w-fit inline-block ${actionClass}`}
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    </div>
  );
};
