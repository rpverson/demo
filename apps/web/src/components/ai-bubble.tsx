'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface AIBubbleProps {
  documentId?: string;
  callId?: string;
  scopeKey?: string;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export function AIBubble({ documentId, callId, scopeKey }: AIBubbleProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTypingAnswer, setIsTypingAnswer] = useState(false);
  const [typingAnswer, setTypingAnswer] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const storageKey = `ai-bubble-chat:${scopeKey || 'global'}:${callId || 'no-call'}:${documentId || 'no-doc'}`;

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isLoading, isTypingAnswer, typingAnswer, open]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) {
        setMessages([]);
        return;
      }
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) {
        setMessages(parsed.slice(-60));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-60)));
    } catch {
      // Ignore storage errors in private mode/quota exceeded.
    }
  }, [messages, storageKey]);

  function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      role,
      content,
      createdAt: Date.now(),
    };
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  async function typeAssistantAnswer(answer: string) {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    setIsTypingAnswer(true);
    setTypingAnswer('');

    const chars = Array.from(answer);
    let index = 0;
    const step = Math.max(1, Math.ceil(chars.length / 80));

    await new Promise<void>((resolve) => {
      typingTimerRef.current = setInterval(() => {
        index = Math.min(chars.length, index + step);
        setTypingAnswer(chars.slice(0, index).join(''));

        if (index >= chars.length) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
          resolve();
        }
      }, 24);
    });

    setMessages((prev) => [...prev, createMessage('assistant', answer)]);
    setTypingAnswer('');
    setIsTypingAnswer(false);
  }

  async function ask() {
    const message = question.trim();
    if (!message || isLoading || isTypingAnswer) return;

    setMessages((prev) => [...prev, createMessage('user', message)]);
    setQuestion('');
    setIsLoading(true);

    try {
      const result = await api.aiChat(message, { documentId, callId });
      const answer = result.answer || 'Sin respuesta.';
      await typeAssistantAnswer(answer);
    } catch {
      await typeAssistantAnswer('No pude responder en este momento. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      ask();
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[390px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">IA</span>
                <div>
                  <h3 className="font-heading text-sm font-semibold">Asistente Conversacional</h3>
                  <p className="text-[11px] text-slate-200">Contexto de convocatoria y anteproyecto</p>
                </div>
              </div>
              <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">
                {isLoading || isTypingAnswer ? 'Respondiendo' : 'En linea'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
            {['Resumen rapido', 'Mejorar redaccion', 'Validar brechas'].map((hint) => (
              <button
                key={hint}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 transition-colors hover:bg-slate-100"
                onClick={() => setQuestion(hint)}
              >
                {hint}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 transition-colors hover:bg-rose-100"
              onClick={() => {
                setMessages([]);
                setTypingAnswer('');
                setIsTypingAnswer(false);
                try {
                  sessionStorage.removeItem(storageKey);
                } catch {
                  // Ignore storage errors.
                }
              }}
            >
              Limpiar chat
            </button>
          </div>

          <div className="max-h-[46vh] space-y-3 overflow-auto bg-slate-50 p-3">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                Inicia una conversación. Puedes pedir resumen de requisitos, validación de brechas o mejorar redacción.
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'rounded-br-sm bg-slate-900 text-white'
                    : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'
                }`}
              >
                  <p>{message.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      message.role === 'user' ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {isLoading || isTypingAnswer ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  {typingAnswer ? <p className="whitespace-pre-wrap">{typingAnswer}</p> : <p>Pensando respuesta...</p>}
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                </div>
              </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <textarea
            className="m-3 h-20 w-[calc(100%-24px)] rounded-xl border border-slate-300 p-2 text-sm"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading || isTypingAnswer}
          />
          <button
            className="mx-3 mb-2 w-[calc(100%-24px)] rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={ask}
            disabled={isLoading || isTypingAnswer || !question.trim()}
          >
            Enviar
          </button>
          <p className="px-3 pb-3 text-[11px] text-slate-500">Enter para enviar, Shift + Enter para salto de linea.</p>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
        title={open ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
        className="fixed bottom-6 right-6 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 p-0 text-white shadow-lg transition-colors hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </>
  );
}
