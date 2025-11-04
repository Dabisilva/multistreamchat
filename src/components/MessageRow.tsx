import React, { useEffect, useRef } from 'react';
import { MessageRowProps } from '../types';
import { attachEmotes, createUsernameHtml, getValidBadges } from '../utils/messageUtils';

export const MessageRow: React.FC<MessageRowProps> = ({
  message,
  hideAfter,
  onRemove,
  customStyles
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

  const styles = customStyles || {
    usernameBg: '#30034d',
    messageBg: '#8b5cf6',
    messageColor: '#ffffff',
    borderRadius: '4',
    usernameFontSize: '20',
    messageFontSize: '20',
    messagePadding: '0',
    fullWidthMessages: 'false'
  };

  const isFullWidth = styles.fullWidthMessages === 'true';

  // Helper function to check if color is transparent (alpha = 0)
  const isTransparent = (color: string): boolean => {
    if (color.startsWith('rgba')) {
      const alphaMatch = color.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/);
      if (alphaMatch && parseFloat(alphaMatch[1]) === 0) {
        return true;
      }
    }
    return false;
  };

  return (
    <div
      ref={messageRef}
      data-sender={message.userId}
      data-msgid={message.msgId}
      className={`my-1 p-0 rounded-none ${isFullWidth ? 'w-full' : 'max-w-[90%]'} break-words bg-transparent border-0 overflow-hidden flex-shrink-0`}
      id={`msg-${message.id}`}
    >
      <div
        className={`flex items-center gap-1.5 font-bold py-1 ${isFullWidth ? 'w-full' : 'w-fit'} ${actionClass}`}
        style={{
          backgroundColor: isTransparent(styles.usernameBg) ? 'transparent' : styles.usernameBg,
          fontSize: `${styles.usernameFontSize}px`,
          borderRadius: `${styles.borderRadius}px`,
          wordBreak: 'break-word',
          maxWidth: '100%'
        }}
      >
        {getValidBadges(message.badges).length > 0 && (
          <div className="flex items-center gap-0.5 flex-wrap">
            {getValidBadges(message.badges).map((badge, index) => (
              <img
                key={`${badge.type}-${badge.version}-${index}`}
                alt=""
                src={badge.url}
                className="object-contain align-middle border-0 rounded-sm mr-0.5 inline-block transition-all duration-200 ease-in-out"
                title={badge.description || `${badge.type} badge`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.opacity = '1';
                }}
                style={{
                  opacity: 0,
                  width: `${styles.usernameFontSize}px`,
                  height: `${styles.usernameFontSize}px`
                }}
              />
            ))}
          </div>
        )}
        <span
          className="username"
          dangerouslySetInnerHTML={{ __html: usernameHtml }}
        />
      </div>
      <div
        className={`leading-[1.4] m-0 ${isFullWidth ? 'w-full' : 'w-auto'} ${actionClass}`}
        style={{
          backgroundColor: isTransparent(styles.messageBg) ? 'transparent' : styles.messageBg,
          color: styles.messageColor,
          fontSize: `${styles.messageFontSize}px`,
          borderRadius: `${styles.borderRadius}px`,
          padding: `${styles.messagePadding}px`,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%'
        }}
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    </div>
  );
};
