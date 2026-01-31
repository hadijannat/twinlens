/**
 * ChatMessage Component
 * Displays a single chat message with optional citations
 */

import { User, Bot, ExternalLink } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@lib/ai/types';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick?: (path: string) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-message-avatar">
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className="chat-message-content">
        <div className="chat-message-text">
          {message.content}
          {message.isStreaming && <span className="chat-cursor" />}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="chat-citations">
            {message.citations.map((citation, index) => (
              <button
                key={index}
                className="chat-citation"
                onClick={() => onCitationClick?.(citation.path)}
              >
                <ExternalLink size={10} />
                <span>{citation.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
