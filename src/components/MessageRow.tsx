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
      className="message-row"
      id={`msg-${message.id}`}
    >
      <div className={`user-box ${actionClass}`}>
        <div className="badges-container">
          {/* {getValidBadges(message.badges).map((badge, index) => (
            <img
              key={`${badge.type}-${badge.version}-${index}`}
              alt=""
              src={badge.url}
              className="badge"
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
          ))} */}
        </div>
        <span
          className="username"
          dangerouslySetInnerHTML={{ __html: usernameHtml }}
        />
      </div>
      <div
        className={`user-message ${actionClass}`}
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    </div>
  );
};
