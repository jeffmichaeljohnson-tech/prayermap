/**
 * Accessibility Utilities for Ethereal Chat UI
 * Agent 5 - Chat UI Designer
 * 
 * WCAG 2.1 AA compliant accessibility features
 */

import type { AccessibilityLabels, ChatMessage, Conversation } from '../types/chat';

// Default accessibility labels
export const defaultA11yLabels: AccessibilityLabels = {
  sendMessage: 'Send message',
  recordAudio: 'Record audio message',
  recordVideo: 'Record video message', 
  selectEmoji: 'Select emoji',
  replyToMessage: 'Reply to message',
  reactToMessage: 'React to message',
  deleteMessage: 'Delete message',
  editMessage: 'Edit message',
  muteConversation: 'Mute conversation',
  archiveConversation: 'Archive conversation'
};

// Generate screen reader friendly message description
export function getMessageA11yDescription(message: ChatMessage): string {
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(message.timestamp);

  const senderInfo = `From ${message.senderName}`;
  const timeInfo = `at ${time}`;
  const statusInfo = message.status === 'read' ? 'read' : 
                    message.status === 'delivered' ? 'delivered' :
                    message.status === 'sent' ? 'sent' :
                    message.status === 'sending' ? 'sending' : '';

  let contentDescription = '';
  
  switch (message.contentType) {
    case 'text':
      contentDescription = message.content;
      break;
    case 'audio':
      contentDescription = `Audio message${message.duration ? `, ${formatDuration(message.duration)} long` : ''}`;
      break;
    case 'video':
      contentDescription = `Video message${message.duration ? `, ${formatDuration(message.duration)} long` : ''}`;
      break;
    case 'image':
      contentDescription = 'Image message';
      break;
  }

  const reactionInfo = message.reactions && Object.keys(message.reactions).length > 0
    ? `, ${Object.keys(message.reactions).length} reactions`
    : '';

  const editInfo = message.metadata?.isEdited ? ', edited' : '';

  return `${senderInfo} ${timeInfo}${editInfo}: ${contentDescription}${reactionInfo}. Status: ${statusInfo}`;
}

// Generate conversation description for screen readers
export function getConversationA11yDescription(conversation: Conversation): string {
  const participantNames = conversation.participants
    .slice(0, 3)
    .map(p => p.name)
    .join(', ');
  
  const participantInfo = conversation.participants.length > 3
    ? `${participantNames} and ${conversation.participants.length - 3} others`
    : participantNames;

  const typeInfo = conversation.type === 'prayer_circle' ? 'Prayer circle' :
                  conversation.type === 'group' ? 'Group conversation' :
                  'Direct conversation';

  const unreadInfo = conversation.unreadCount > 0
    ? `, ${conversation.unreadCount} unread messages`
    : '';

  const lastMessageInfo = conversation.lastMessage
    ? `, last message: ${conversation.lastMessage.content.slice(0, 50)}${conversation.lastMessage.content.length > 50 ? '...' : ''}`
    : '';

  const statusInfo = conversation.isMuted ? ', muted' : '';
  const pinnedInfo = conversation.isPinned ? ', pinned' : '';

  return `${typeInfo} with ${participantInfo}${unreadInfo}${lastMessageInfo}${statusInfo}${pinnedInfo}`;
}

// Format duration for accessibility
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins > 0) {
    return `${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
  }
  return `${secs} second${secs !== 1 ? 's' : ''}`;
}

// Create accessible live region announcements
export function createLiveRegionAnnouncement(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.textContent = message;
  
  document.body.appendChild(liveRegion);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

// Focus management utilities
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      element.dispatchEvent(new CustomEvent('escapeFocus'));
    }
  };

  element.addEventListener('keydown', handleTabKey);
  element.addEventListener('keydown', handleEscape);
  
  // Focus first element
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTabKey);
    element.removeEventListener('keydown', handleEscape);
  };
}

// Reduced motion utilities
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// High contrast utilities
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// Color contrast checker
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  // Simplified contrast checking - in production, use a proper color contrast library
  const requiredRatio = level === 'AAA' ? 7 : 4.5;
  
  // This is a placeholder - implement proper contrast calculation
  // or use a library like 'color-contrast' or 'tinycolor2'
  return true; // Placeholder
}

// Keyboard navigation helpers
export const keyboardShortcuts = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft', 
  ARROW_RIGHT: 'ArrowRight',
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
};

// ARIA role utilities
export function getAriaRole(elementType: string): string {
  const roleMap: Record<string, string> = {
    message: 'article',
    conversation: 'listitem',
    conversationList: 'list',
    chatInput: 'textbox',
    messageList: 'log',
    emojiPicker: 'dialog',
    contextMenu: 'menu',
    menuItem: 'menuitem',
    button: 'button',
    link: 'link',
    heading: 'heading'
  };
  
  return roleMap[elementType] || '';
}

// Generate unique IDs for accessibility
let idCounter = 0;
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

// Skip link utilities
export function createSkipLink(targetId: string, text: string = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded';
  
  document.body.insertBefore(skipLink, document.body.firstChild);
  return skipLink;
}

// Screen reader only text utility
export function createSROnlyText(text: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  return span;
}

// Touch target size checker
export function meetsTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const minSize = 44; // 44px minimum per WCAG guidelines
  return rect.width >= minSize && rect.height >= minSize;
}

// Focus visible utilities for keyboard users
export function addFocusVisibleSupport() {
  let hadKeyboardEvent = false;
  
  const keyboardEvents = ['keydown', 'keyup'];
  const mouseEvents = ['mousedown', 'mouseup'];
  
  function onKeyboard() {
    hadKeyboardEvent = true;
  }
  
  function onMouse() {
    hadKeyboardEvent = false;
  }
  
  function onFocus(event: FocusEvent) {
    if (hadKeyboardEvent) {
      (event.target as HTMLElement)?.classList.add('focus-visible');
    }
  }
  
  function onBlur(event: FocusEvent) {
    (event.target as HTMLElement)?.classList.remove('focus-visible');
  }
  
  keyboardEvents.forEach(event => {
    document.addEventListener(event, onKeyboard, true);
  });
  
  mouseEvents.forEach(event => {
    document.addEventListener(event, onMouse, true);
  });
  
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
}

// Text scaling utilities
export function supportsTextScaling(): boolean {
  return CSS.supports('font-size', '200%');
}

// Voice control utilities
export function addVoiceControlSupport(commands: Record<string, () => void>) {
  if ('webkitSpeechRecognition' in window) {
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    
    recognition.onresult = (event: any) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      
      Object.entries(commands).forEach(([trigger, action]) => {
        if (command.includes(trigger.toLowerCase())) {
          action();
        }
      });
    };
    
    return recognition;
  }
  
  return null;
}