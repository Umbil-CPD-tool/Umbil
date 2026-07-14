import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Pill } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { saveCpdEntry } from '@/features/cpd/service';
import { streamClinicalAnswer } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { AnswerStyle, ChatMessage } from '@/types/app';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const styleOptions: Array<{ id: AnswerStyle; label: string }> = [
  { id: 'clinic', label: 'Clinic' },
  { id: 'standard', label: 'Standard' },
  { id: 'deepDive', label: 'Deep dive' },
];

export default function AskUmbilScreen() {
  const { session, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('standard');
  const [loading, setLoading] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const conversationId = useRef(createId('conversation'));

  const greeting = useMemo(() => {
    const firstName = profile?.full_name?.trim().split(/\s+/)[0];
    return firstName ? `Hi ${firstName}, what can I help with?` : 'What can I help with?';
  }, [profile?.full_name]);

  const ask = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading || !session?.access_token) return;

    const userMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      content: trimmedQuestion,
    };
    const assistantId = createId('assistant');
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      sourceQuestion: trimmedQuestion,
    };
    const requestMessages = [...messages, userMessage];

    setQuestion('');
    setError(null);
    setLoading(true);
    setMessages([...requestMessages, assistantMessage]);

    try {
      await streamClinicalAnswer({
        token: session.access_token,
        messages: requestMessages,
        profile,
        answerStyle,
        conversationId: conversationId.current,
        onChunk: (chunk) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: `${message.content}${chunk}` }
                : message,
            ),
          );
          requestAnimationFrame(() =>
            scrollRef.current?.scrollToEnd({ animated: false }),
          );
        },
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to contact Umbil.';
      setMessages((current) => current.filter((item) => item.id !== assistantId));
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!message.sourceQuestion || !message.content) return;

    setSavingMessageId(message.id);
    try {
      await saveCpdEntry({
        question: message.sourceQuestion,
        answer: message.content,
      });
      setSavedMessageIds((current) => new Set(current).add(message.id));
      Alert.alert('Saved', 'This answer has been added to your Learning Log.');
    } catch (caught) {
      Alert.alert(
        'Could not save learning',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
    } finally {
      setSavingMessageId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.flex}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Umbil</Text>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>
          {profile?.is_pro ? <Pill label="PRO" tone="success" /> : <Pill label="FREE" tone="muted" />}
        </View>

        <View style={styles.safetyBanner}>
          <Text style={styles.safetyTitle}>Clinical safety</Text>
          <Text style={styles.safetyText}>
            Do not enter names, dates of birth, NHS numbers or other identifiable patient information. Verify guidance before acting.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          ref={scrollRef}
        >
          {messages.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Ask a clinical question</Text>
              <Text style={styles.emptyText}>
                Umbil can help you explore UK clinical guidance, draft safer explanations and capture learning as you work.
              </Text>
            </Card>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            const isSaved = savedMessageIds.has(message.id);
            return (
              <View
                key={message.id}
                style={[
                  styles.messageWrap,
                  isUser ? styles.messageWrapUser : styles.messageWrapAssistant,
                ]}
              >
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                    {message.content || (loading ? 'Consulting clinical guidance…' : '')}
                  </Text>
                </View>
                {!isUser && message.content ? (
                  <Button
                    disabled={isSaved}
                    label={isSaved ? 'Saved to Learning Log' : 'Save to Learning Log'}
                    loading={savingMessageId === message.id}
                    onPress={() => void saveMessage(message)}
                    variant="secondary"
                  />
                ) : null}
              </View>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.composer}>
          <ScrollView
            contentContainerStyle={styles.stylesRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {styleOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => setAnswerStyle(option.id)}
                style={[
                  styles.styleChip,
                  answerStyle === option.id && styles.styleChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.styleChipText,
                    answerStyle === option.id && styles.styleChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              editable={!loading}
              multiline
              onChangeText={setQuestion}
              placeholder="Ask Umbil…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={question}
            />
            <Pressable
              accessibilityLabel="Send question"
              disabled={!question.trim() || loading}
              onPress={() => void ask()}
              style={({ pressed }) => [
                styles.send,
                (!question.trim() || loading) && styles.sendDisabled,
                pressed && styles.sendPressed,
              ]}
            >
              <Text style={styles.sendText}>{loading ? '…' : '↑'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  logo: {
    color: colors.teal,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  greeting: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  safetyBanner: {
    backgroundColor: colors.warningSoft,
    borderColor: '#F3D68A',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 3,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  safetyTitle: { color: colors.warning, fontSize: 13, fontWeight: '800' },
  safetyText: { color: colors.warning, fontSize: 12, lineHeight: 17 },
  messages: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  emptyCard: { gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  messageWrap: { gap: spacing.sm, maxWidth: '92%' },
  messageWrapUser: { alignSelf: 'flex-end' },
  messageWrapAssistant: { alignSelf: 'flex-start' },
  bubble: { borderRadius: radius.lg, padding: spacing.md },
  userBubble: { backgroundColor: colors.teal },
  assistantBubble: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  userMessageText: { color: colors.white },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    padding: spacing.md,
  },
  composer: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  stylesRow: { gap: spacing.sm },
  styleChip: {
    backgroundColor: colors.subtle,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  styleChipActive: { backgroundColor: colors.tealSoft },
  styleChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  styleChipTextActive: { color: colors.tealDark },
  inputRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 16,
    maxHeight: 130,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  send: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  sendDisabled: { opacity: 0.45 },
  sendPressed: { transform: [{ scale: 0.96 }] },
  sendText: { color: colors.white, fontSize: 24, fontWeight: '900' },
});
