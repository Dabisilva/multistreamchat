import { ChatMessage, Emote } from '../types';

// HTML encode function
export function htmlEncode(text: string): string {
  return text.replace(/[<>"^]/g, function (char) {
    return "&#" + char.charCodeAt(0) + ";";
  });
}

// Generate color from username (similar to MD5 hash approach)
export function generateColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.abs(hash).toString(16).substring(0, 6);
  return "#" + color.padEnd(6, '0');
}

// Attach emotes to message text
export function attachEmotes(message: ChatMessage, provider: 'twitch' | 'kick' = 'twitch'): string {
  let text = htmlEncode(message.text);
  const emotes = message.emotes;

  if (!emotes || emotes.length === 0) {
    return text;
  }

  // Separate Twitch native emotes (with positions) from third-party emotes (BTTV, etc.)
  const nativeEmotes = emotes.filter(e => e.type === 'twitch' && e.start !== undefined && e.end !== undefined);
  const thirdPartyEmotes = emotes.filter(e => e.type !== 'twitch' || e.start === undefined);

  // First, replace Twitch native emotes using their position data (before HTML encoding affected positions)
  // We need to do this on the ORIGINAL text, not the encoded one
  let processedText = message.text;
  
  // Sort native emotes by position (descending) to replace from end to beginning
  const sortedNativeEmotes = [...nativeEmotes].sort((a, b) => (b.start || 0) - (a.start || 0));
  
  for (const emote of sortedNativeEmotes) {
    if (emote.start !== undefined && emote.end !== undefined) {
      const emoteHtml = createEmoteHtml(emote, provider);
      processedText = processedText.substring(0, emote.start) + emoteHtml + processedText.substring(emote.end + 1);
    }
  }

  // Now HTML encode the result (but preserve the HTML tags we just inserted)
  // We need to encode carefully to not break our emote img tags
  processedText = processedText.replace(/(<img[^>]+>)|([^<]+)/g, function(match, imgTag, textContent) {
    if (imgTag) {
      return imgTag; // Keep img tags as-is
    }
    return htmlEncode(textContent || match); // Encode text content
  });

  // Finally, use regex to replace third-party emotes (BTTV, FFZ, etc.) by name
  if (thirdPartyEmotes.length > 0) {
    processedText = processedText.replace(/([^\s<]+)/g, function(word) {
      // Find if this word matches any third-party emote
      const emote = thirdPartyEmotes.find(e => htmlEncode(e.name) === word || e.name === word);
      if (emote) {
        return createEmoteHtml(emote, provider);
      }
      return word;
    });
  }

  return processedText;
}

// Create HTML for emote
function createEmoteHtml(emote: Emote, provider: 'twitch' | 'kick'): string {
  const url = emote.urls['2'] || emote.urls['1'] || Object.values(emote.urls)[0]; // Prefer 2x for better quality
  
  if (provider === 'twitch' || emote.type === 'bttv') {
    // Both native Twitch and BTTV emotes use simple img tags
    return `<img class="emote" src="${url}" alt="${emote.name}" title="${emote.name}"/>`;
  } else {
    // Kick/Mixer style emote with background positioning
    const coords = emote.coords || { x: 0, y: 0 };
    const width = emote.coords?.width ? `${emote.coords.width}px` : '28px';
    const height = emote.coords?.height ? `${emote.coords.height}px` : '28px';
    
    return `<div class="emote" style="width: ${width}; height: ${height}; display: inline-block; background-image: url(${url}); background-position: -${coords.x}px -${coords.y}px; background-size: contain; background-repeat: no-repeat;"></div>`;
  }
}

// Badge utility functions - simplified approach
export function getValidBadges(badges: any[]): any[] {
  if (!badges || badges.length === 0) {
    return [];
  }
  
  // Validate and sort badges
  const validBadges = validateBadges(badges);
  const sortedBadges = sortBadgesByPriority(validBadges);
  
  return sortedBadges;
}

// Badge validation and filtering
export function validateBadges(badges: any[]): any[] {
  if (!badges || !Array.isArray(badges)) {
    return [];
  }
  
  return badges.filter(badge => {
    return badge && 
           badge.url && 
           typeof badge.url === 'string' && 
           badge.url.startsWith('http');
  });
}

// Badge sorting by priority (moderator, subscriber, etc.)
export function sortBadgesByPriority(badges: any[]): any[] {
  const priorityOrder = [
    'broadcaster',
    'moderator', 
    'vip',
    'subscriber',
    'partner',
    'premium',
    'bits',
    'turbo',
    'prime'
  ];
  
  return badges.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.type);
    const bIndex = priorityOrder.indexOf(b.type);
    
    // If both are in priority list, sort by priority
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in priority list, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither is in priority list, maintain original order
    return 0;
  });
}

// Create username HTML with color
export function createUsernameHtml(
  displayName: string, 
  displayColor: string, 
  nickColor: 'user' | 'custom' = 'user',
  customNickColor: string = '#ffffff'
): string {
  let color = displayColor;
  
  if (nickColor === 'user') {
    color = displayColor || generateColor(displayName);
  } else if (nickColor === 'custom') {
    color = customNickColor;
  }
  
  return `<span style="color: ${color}">${displayName}:</span>`;
}

// Check if message should be hidden
export function shouldHideMessage(
  text: string, 
  hideCommands: boolean, 
  ignoredUsers: string[], 
  displayName: string
): boolean {
  // Hide commands if enabled
  if (hideCommands && text.startsWith('!')) {
    return true;
  }
  
  // Hide ignored users
  if (ignoredUsers.includes(displayName.toLowerCase())) {
    return true;
  }
  
  return false;
}
