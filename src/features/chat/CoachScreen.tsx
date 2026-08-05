/**
 * CoachScreen — AI Fitness Chat with SSE streaming.
 *
 * Layout:
 *   Header → FlatList (inverted) → Quick Chips → Usage Pill → Input Bar
 *
 * Features:
 *   - Real-time SSE streaming (chunk by chunk)
 *   - Typing indicator (3-dot pulse) while waiting for first chunk
 *   - Chat history pre-populated from GET /api/v1/chat/history
 *   - Usage tracking (GET /api/v1/chat/usage)
 *   - Feature gating: FREE plan shows locked upgrade prompt
 *   - Quick prompt chips for common questions
 *   - Error handling with retry button
 *   - Keyboard-aware layout
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { usePlan } from '../../shared/hooks/usePlan';
import { Button } from '../../shared/components/Button';
import {
  getChatHistory,
  getChatUsage,
  streamChatMessage,
  type ChatMessage,
} from '../../shared/api/chat.api';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';

// ─── Quick Prompt Chips ───

const QUICK_PROMPTS = [
  'Why am I not losing weight?',
  "Swap today's leg day",
  'Is paneer ok for fat loss?',
  'What should I eat post workout?',
  'How much protein do I need?',
];

// ─── Local Message Type ───

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  error?: boolean;
  /** Original message text for retry (only on user messages) */
  originalMessage?: string;
  createdAt: Date;
}

let messageIdCounter = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

// ─── Typing Indicator Component ───

function TypingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={typingStyles.container}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            typingStyles.dot,
            { backgroundColor: color, opacity: dot },
          ]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

// ─── Main Component ───

export function CoachScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const { isFree } = usePlan();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  // ─── Data Queries ───

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['chat', 'history'],
    queryFn: getChatHistory,
    enabled: !isFree,
    staleTime: Infinity, // Only fetch once on mount
  });

  const { data: usageData } = useQuery({
    queryKey: ['chat', 'usage'],
    queryFn: getChatUsage,
    enabled: !isFree,
    refetchInterval: 60_000, // Refresh every minute
  });

  // Hydrate messages from history on first load
  useEffect(() => {
    if (historyData?.messages && messages.length === 0) {
      const hydrated: LocalMessage[] = historyData.messages.map((m) => ({
        id: nextId(),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));
      setMessages(hydrated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyData]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ─── Sending Logic ───

  const limitReached = usageData ? usageData.remaining <= 0 : false;

  const handleSend = useCallback(
    (text?: string) => {
      const msgText = (text || inputText).trim();
      if (!msgText || isSending || limitReached) return;

      setInputText('');
      setIsSending(true);

      // 1. Add user message
      const userMsgId = nextId();
      const assistantMsgId = nextId();
      streamingIdRef.current = assistantMsgId;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const now = new Date();
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          content: msgText,
          originalMessage: msgText,
          createdAt: now,
        },
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          createdAt: now,
        },
      ]);

      // 2. Start SSE stream
      abortRef.current = streamChatMessage(msgText, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, isStreaming: false }
                : m,
            ),
          );
          streamingIdRef.current = null;
          setIsSending(false);
          // Refresh usage count
          queryClient.invalidateQueries({ queryKey: ['chat', 'usage'] });
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    error: true,
                    content: m.content || 'Failed to get response.',
                  }
                : m,
            ),
          );
          streamingIdRef.current = null;
          setIsSending(false);
        },
      });
    },
    [inputText, isSending, limitReached, queryClient],
  );

  const handleRetry = useCallback(
    (failedAssistantId: string) => {
      // Find the user message right before the failed assistant message
      const idx = messages.findIndex((m) => m.id === failedAssistantId);
      if (idx <= 0) return;

      const userMsg = messages[idx - 1];
      if (!userMsg || userMsg.role !== 'user') return;

      // Remove the failed pair and resend
      setMessages((prev) => prev.filter((m) => m.id !== failedAssistantId && m.id !== userMsg.id));
      // Use setTimeout to let state settle before re-sending
      setTimeout(() => handleSend(userMsg.originalMessage || userMsg.content), 50);
    },
    [messages, handleSend],
  );

  // ─── FREE plan locked state ───

  if (isFree) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.md,
          },
        ]}
      >
        <Text style={[typo.h2, { color: colors.text, paddingHorizontal: spacing.md }]}>
          AI Coach
        </Text>

        <View style={styles.lockedContainer}>
          <View
            style={[
              styles.lockedCard,
              {
                backgroundColor: colors.aiBackground,
                borderColor: colors.aiBorder,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
              },
            ]}
          >
            <Text style={{ fontSize: 48, marginBottom: spacing.md }}>✦</Text>
            <Text
              style={[
                typo.h2,
                { color: colors.aiText, textAlign: 'center', marginBottom: spacing.sm },
              ]}
            >
              AI Fitness Coach
            </Text>
            <Text
              style={[
                typo.body,
                {
                  color: colors.aiText,
                  textAlign: 'center',
                  opacity: 0.8,
                  marginBottom: spacing.lg,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              Get personalized fitness advice, meal swaps, and workout tips from your AI coach — powered by your real data.
            </Text>
            <Button
              title="Upgrade to Basic"
              onPress={() => {
                // TODO: Navigate to upgrade/subscription screen
              }}
              style={{ width: '100%' }}
            />
            <Text
              style={[
                typo.caption,
                { color: colors.textDim, marginTop: spacing.sm, textAlign: 'center' },
              ]}
            >
              20 messages per day • Context-aware responses
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── Chat Bubble Renderer ───

  const markdownStyles = {
    body: {
      ...typo.body,
      color: colors.aiText,
      marginTop: 0,
      marginBottom: 0,
    },
    heading1: {
      ...typo.h1,
      color: colors.aiText,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    heading2: {
      ...typo.h2,
      color: colors.aiText,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    heading3: {
      ...typo.h3,
      color: colors.aiText,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    strong: {
      fontWeight: '700',
    },
    em: {
      fontStyle: 'italic',
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'none',
    },
    list_item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    bullet_list: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    ordered_list: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    paragraph: {
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
  } as any;

  const renderMessage = ({ item, index }: { item: LocalMessage, index: number }) => {
    const isUser = item.role === 'user';
    const isStreamingEmpty = item.isStreaming && !item.content;
    const nextItem = messages[index + 1];
    const isNewTurn = nextItem && nextItem.role !== item.role;

    return (
      <View>
        {isNewTurn && (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md, width: '40%', alignSelf: 'center', opacity: 0.5 }} />
        )}
        <View
          style={[
            styles.bubbleRow,
            { justifyContent: isUser ? 'flex-end' : 'flex-start' },
            { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
          ]}
        >
        <View style={{ maxWidth: '85%' }}>
          {/* AI Coach tag for assistant messages */}
          {!isUser && (
            <View style={[styles.aiTag, { marginBottom: spacing.xs }]}>
              <Text style={{ fontSize: 10, color: colors.secondary }}>✦</Text>
              <Text
                style={[
                  typo.caption,
                  {
                    color: colors.secondary,
                    marginLeft: 3,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  },
                ]}
              >
                AI Coach
              </Text>
            </View>
          )}

          {/* Bubble */}
          <View
            style={[
              styles.bubble,
              {
                borderRadius: borderRadius.lg,
                padding: spacing.ms,
                backgroundColor: isUser ? colors.surface2 : colors.aiBackground,
                borderWidth: isUser ? 0 : 1,
                borderColor: isUser ? 'transparent' : colors.aiBorder,
              },
            ]}
          >
            {isStreamingEmpty ? (
              <TypingDots color={colors.secondary} />
            ) : isUser ? (
              <Text
                style={[
                  typo.body,
                  { color: colors.text },
                ]}
              >
                {item.content}
              </Text>
            ) : (
              <Markdown style={markdownStyles}>
                {item.content + (item.isStreaming ? ' ▊' : '')}
              </Markdown>
            )}
          </View>

          {/* Timestamp */}
          {item.createdAt && (
            <Text style={[typo.caption, { color: colors.textDim, marginTop: 4, alignSelf: isUser ? 'flex-end' : 'flex-start', fontSize: 10, opacity: 0.7 }]}>
              {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}

          {/* Error state with retry */}
          {item.error && (
            <TouchableOpacity
              onPress={() => handleRetry(item.id)}
              style={[styles.retryRow, { marginTop: spacing.xs }]}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text
                style={[
                  typo.caption,
                  { color: colors.error, marginLeft: 4 },
                ]}
              >
                Failed to send.
              </Text>
              <Text
                style={[
                  typo.caption,
                  { color: colors.primary, marginLeft: 6, fontWeight: '700' },
                ]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      </View>
    );
  };

  // ─── Usage Pill ───

  const usagePill = usageData ? (
    <View
      style={[
        styles.usagePill,
        {
          backgroundColor: limitReached ? `${colors.error}18` : `${colors.secondary}15`,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.ms,
          paddingVertical: spacing.xs,
          alignSelf: 'center',
          marginBottom: spacing.sm,
        },
      ]}
    >
      <Text
        style={[
          typo.caption,
          {
            color: limitReached ? colors.error : colors.secondary,
            fontWeight: '600',
          },
        ]}
      >
        {limitReached
          ? 'Daily limit reached. Resets tomorrow.'
          : `${usageData.messagesUsedToday}/${usageData.dailyLimit} messages today`}
      </Text>
    </View>
  ) : null;

  // ─── Main Chat UI ───

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.sm,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[typo.h2, { color: colors.text }]}>AI Coach</Text>
      </View>

      {/* Messages List */}
      {historyLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          style={styles.messagesList}
          contentContainerStyle={{
            paddingTop: spacing.md,
            flexDirection: 'column-reverse',
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: colors.aiBackground,
                    borderRadius: borderRadius.xl,
                  },
                ]}
              >
                <Text style={{ fontSize: 36 }}>✦</Text>
              </View>
              <Text
                style={[
                  typo.h3,
                  { color: colors.text, marginTop: spacing.md, textAlign: 'center' },
                ]}
              >
                Hi! I'm your AI Coach
              </Text>
              <Text
                style={[
                  typo.body,
                  {
                    color: colors.textDim,
                    textAlign: 'center',
                    marginTop: spacing.xs,
                    paddingHorizontal: spacing.xl,
                  },
                ]}
              >
                Ask me about your diet, workouts, or any fitness question. I have full context of your progress.
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Section */}
      <View
        style={[
          styles.bottomSection,
          {
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
          },
        ]}
      >
        {/* Quick Prompt Chips */}
        {messages.length === 0 && !isSending && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: spacing.sm }}
            contentContainerStyle={{
              paddingHorizontal: spacing.md,
              gap: spacing.sm,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                onPress={() => handleSend(prompt)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                    paddingHorizontal: spacing.ms,
                    paddingVertical: spacing.sm,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[typo.bodySmall, { color: colors.text }]}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Usage Pill */}
        {usagePill}

        {/* Character Count Warning */}
        {inputText.length > 800 && (
          <Text style={[typo.caption, { color: inputText.length >= 1000 ? colors.error : colors.textDim, textAlign: 'right', paddingHorizontal: spacing.md, marginBottom: spacing.xs, marginTop: -spacing.xs }]}>
            {inputText.length} / 1000
          </Text>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputRow,
            {
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surface2,
                borderRadius: borderRadius.full,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                limitReached
                  ? 'Daily limit reached'
                  : 'Ask your AI coach...'
              }
              placeholderTextColor={colors.textDim}
              style={[
                typo.body,
                {
                  color: colors.text,
                  flex: 1,
                  paddingVertical: Platform.OS === 'ios' ? spacing.ms : spacing.sm,
                },
              ]}
              multiline
              maxLength={1000}
              editable={!isSending && !limitReached}
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>

          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending || limitReached}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  !inputText.trim() || isSending || limitReached
                    ? colors.surface2
                    : colors.primary,
                borderRadius: borderRadius.full,
                marginLeft: spacing.sm,
              },
            ]}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.textDim} />
            ) : (
              <Ionicons
                name="arrow-up"
                size={22}
                color={
                  !inputText.trim() || limitReached
                    ? colors.textDim
                    : colors.textOnPrimary
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    minWidth: 60,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  chip: {
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockedCard: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    // FlatList is inverted, so this appears "right-side up" in the middle
    transform: [{ scaleY: -1 }],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
