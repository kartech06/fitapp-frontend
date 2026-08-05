/**
 * Chat API — AI Fitness Coach endpoints.
 *
 * Endpoints:
 *   GET  /api/v1/chat/history  → conversation history (last 10 msgs from Redis)
 *   GET  /api/v1/chat/usage    → daily usage stats
 *   POST /api/v1/chat          → send message, receive SSE stream
 *
 * The POST endpoint returns Server-Sent Events, so we use raw fetch()
 * with a ReadableStream text decoder instead of axios (which buffers).
 */

import { fetch } from 'expo/fetch';
import { api } from './axios';
import { API_URL } from '../constants';
import { useAuthStore } from '../store/authStore';

// ─── Types ───

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface ChatUsage {
  messagesUsedToday: number;
  dailyLimit: number;
  remaining: number;
}

// ─── REST Endpoints (via axios, envelope auto-unwrapped) ───

export async function getChatHistory(): Promise<ChatHistoryResponse> {
  const { data } = await api.get<ChatHistoryResponse>('/chat/history');
  return data;
}

export async function getChatUsage(): Promise<ChatUsage> {
  const { data } = await api.get<ChatUsage>('/chat/usage');
  return data;
}

// ─── SSE Streaming (via raw fetch + ReadableStream) ───

export interface StreamCallbacks {
  /** Called with each text chunk as it arrives */
  onChunk: (text: string) => void;
  /** Called when the stream is complete */
  onDone: () => void;
  /** Called on any error (network, parse, server error event) */
  onError: (error: Error) => void;
}

/**
 * Send a message to the AI coach and stream the response via SSE.
 *
 * Returns an AbortController so the caller can cancel the stream
 * (e.g. on unmount or user navigation).
 *
 * SSE format from backend:
 *   data: {"chunk":"Hello","done":false}
 *   data: {"chunk":"","done":true}
 *   event: error
 *   data: {"error":true,"message":"...","error_code":"..."}
 */
export function streamChatMessage(
  message: string,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  const token = useAuthStore.getState().accessToken;
  const url = `${API_URL}/chat`;

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Try to parse error body
        let errMsg = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          errMsg = errBody?.message || errBody?.data?.message || errMsg;
        } catch {
          // ignore parse failure
        }
        callbacks.onError(new Error(errMsg));
        return;
      }

      if (!response.body) {
        callbacks.onError(new Error('No response body'));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE frames (delimited by \n\n)
        const frames = buffer.split('\n\n');
        // Keep the last incomplete frame in the buffer
        buffer = frames.pop() || '';

        for (const frame of frames) {
          if (!frame.trim()) continue;

          // Handle "event: error\ndata: {...}" frames
          const lines = frame.split('\n');
          let eventType = 'message';
          let dataLine = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLine = line.slice(5).trim();
            }
          }

          if (!dataLine) continue;

          try {
            const parsed = JSON.parse(dataLine);

            if (eventType === 'error' || parsed.error) {
              callbacks.onError(
                new Error(parsed.message || 'Stream error'),
              );
              return;
            }

            if (parsed.done) {
              callbacks.onDone();
              return;
            }

            if (parsed.chunk) {
              callbacks.onChunk(parsed.chunk);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Stream ended without a done signal — treat as complete
      callbacks.onDone();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Caller cancelled — don't fire onError
        return;
      }
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return controller;
}
