/**
 * ChatInput Component
 * Text input with send button for chat messages
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  isLoading,
  placeholder,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled && !isLoading) {
      onSend(trimmed);
      setValue('');
    }
  }, [value, disabled, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className="chat-input-container">
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask a question about this asset...'}
        disabled={disabled || isLoading}
        rows={1}
      />
      <button
        className="chat-send-btn"
        onClick={handleSubmit}
        disabled={disabled || isLoading || !value.trim()}
      >
        {isLoading ? <Loader size={18} className="spin" /> : <Send size={18} />}
      </button>
    </div>
  );
}
