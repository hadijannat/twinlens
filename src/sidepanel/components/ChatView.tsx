/**
 * ChatView Component
 * Main chat container with messages list, suggestions, and input
 */

import { useRef, useEffect } from 'react';
import { MessageSquare, Settings, Sparkles } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType, AssetContext } from '@lib/ai/types';
import { generateSuggestedQuestions } from '@lib/ai/prompts';

interface ChatViewProps {
  messages: ChatMessageType[];
  context: AssetContext | null;
  isLoading: boolean;
  isConfigured: boolean;
  onSendMessage: (message: string) => void;
  onOpenSettings: () => void;
  onCitationClick?: (path: string) => void;
}

export function ChatView({
  messages,
  context,
  isLoading,
  isConfigured,
  onSendMessage,
  onOpenSettings,
  onCitationClick,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestedQuestions = context ? generateSuggestedQuestions(context) : [];

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="chat-view">
        <div className="chat-setup">
          <div className="chat-setup-icon">
            <MessageSquare size={32} />
          </div>
          <h3>Chat with Asset</h3>
          <p>Configure your AI provider to start asking questions about your assets.</p>
          <button className="btn btn-primary" onClick={onOpenSettings}>
            <Settings size={16} />
            Configure AI
          </button>
        </div>
      </div>
    );
  }

  // No asset loaded state
  if (!context) {
    return (
      <div className="chat-view">
        <div className="chat-setup">
          <div className="chat-setup-icon">
            <MessageSquare size={32} />
          </div>
          <h3>No Asset Loaded</h3>
          <p>Load an AASX file or connect to a registry to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <MessageSquare size={16} />
        <span>Chat with {context.assetIdShort || 'Asset'}</span>
        <button
          className="icon-btn chat-settings-btn"
          onClick={onOpenSettings}
          title="AI Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <Sparkles size={24} className="chat-welcome-icon" />
            <p>Ask me anything about this asset!</p>
            <div className="chat-suggestions">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  className="chat-suggestion"
                  onClick={() => onSendMessage(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onCitationClick={onCitationClick}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={onSendMessage}
        isLoading={isLoading}
        placeholder={`Ask about ${context.assetIdShort || 'this asset'}...`}
      />
    </div>
  );
}
