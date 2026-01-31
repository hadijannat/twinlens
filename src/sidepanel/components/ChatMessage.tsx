/**
 * ChatMessage Component
 * Displays a single chat message with optional citations
 */

import { useState } from 'react';
import { User, Bot, ExternalLink } from 'lucide-react';
import type { ChatMessage as ChatMessageType, Citation } from '@lib/ai/types';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick?: (path: string) => void;
}

interface CitationTooltipProps {
  citation: Citation;
  onClick?: () => void;
}

function CitationBadge({ citation, onClick }: CitationTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="chat-citation-wrapper">
      <button
        className="chat-citation"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-describedby={showTooltip ? `tooltip-${citation.path}` : undefined}
      >
        <ExternalLink size={10} aria-hidden="true" />
        <span>{citation.label}</span>
      </button>
      {showTooltip && (
        <div
          className="chat-citation-tooltip"
          id={`tooltip-${citation.path}`}
          role="tooltip"
        >
          <div className="chat-citation-tooltip-row">
            <span className="chat-citation-tooltip-label">Path:</span>
            <span className="chat-citation-tooltip-value">{citation.path}</span>
          </div>
          <div className="chat-citation-tooltip-row">
            <span className="chat-citation-tooltip-label">Value:</span>
            <span className="chat-citation-tooltip-value">{citation.value}</span>
          </div>
          {citation.semanticId && (
            <div className="chat-citation-tooltip-row">
              <span className="chat-citation-tooltip-label">Semantic ID:</span>
              <span className="chat-citation-tooltip-value chat-citation-tooltip-mono">
                {citation.semanticId}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
              <CitationBadge
                key={index}
                citation={citation}
                onClick={() => onCitationClick?.(citation.path)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
