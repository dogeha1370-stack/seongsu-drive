'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { ChatMessage } from './multiplayer';
export function RoomChat({
  messages,
  send,
  typing,
  online,
}: {
  messages: ChatMessage[];
  send: (text: string) => Promise<void>;
  typing: (value: boolean) => void;
  online: boolean;
}) {
  const [opened, setOpened] = useState(false),
    [text, setText] = useState(''),
    [sending, setSending] = useState(false),
    [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, opened]);
  useEffect(() => {
    if (opened) input.current?.focus();
    else typing(false);
    return () => typing(false);
  }, [opened, typing]);
  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await send(text.trim());
      setText('');
      input.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : '메시지를 보내지 못했습니다.');
    } finally {
      setSending(false);
    }
  }
  return (
    <section
      className={'room-chat ' + (opened ? 'expanded' : '')}
      aria-label="같은 방 채팅"
    >
      <button className="chat-toggle" onClick={() => setOpened(!opened)}>
        <MessageCircle size={18} />
        <span>방 채팅</span>
        {opened ? (
          <X size={16} />
        ) : (
          <small>
            {messages.length
              ? messages[messages.length - 1].name
              : '친구와 이야기하기'}
          </small>
        )}
      </button>
      {opened && (
        <>
          <div className="chat-log" role="log" aria-live="polite">
            {!messages.length && (
              <p className="chat-empty">같은 방의 친구에게 인사해 보세요.</p>
            )}
            {messages.map((m) => (
              <p key={m.id}>
                <b>{m.name}</b>
                <span>{m.text}</span>
              </p>
            ))}
            <div ref={end} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              ref={input}
              value={text}
              maxLength={180}
              disabled={!online}
              aria-label="채팅 메시지"
              placeholder={online ? '메시지 · Enter 전송' : '접속 중…'}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => typing(true)}
              onBlur={() => typing(false)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  setOpened(false);
                  typing(false);
                }
              }}
            />
            <button
              aria-label="메시지 보내기"
              disabled={!online || sending || !text.trim()}
            >
              <Send size={17} />
            </button>
          </form>
          {error && <output>{error}</output>}
        </>
      )}
    </section>
  );
}
