import type { AnswerStyle } from "@umbil/shared";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AskBar } from "@/components/AskBar";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { ChromeHeader } from "@/components/ChromeHeader";
import { QuickTourModal } from "@/components/QuickTourModal";
import { WeeklySummaryModal } from "@/components/WeeklySummaryModal";
import { streamAsk } from "@/lib/api";
import { createId } from "@/lib/ids";
import { getMyProfile, type Profile } from "@/lib/profile";
import { getConversationMessages } from "@/lib/store/chat";
import { parseToolPrefix, type ChatMessage } from "@/lib/stream";
import { useMenu } from "@/providers/MenuProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { spacing } from "@/theme/colors";
import { fonts, type as typography } from "@/theme/typography";

const LOADING_MESSAGES = [
  "Umbil is thinking...",
  "Consulting the guidelines...",
  "Synthesizing clinical data...",
  "Checking local formularies...",
  "Almost there...",
  "Crafting your response...",
];

export default function ChatScreen() {
  const { colors } = useTheme();
  const { tour } = useLocalSearchParams<{ tour?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("standard");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const listRef = useRef<FlatList>(null);
  const answerStyleRef = useRef(answerStyle);
  const {
    setOnOpenConversation,
    newChatToken,
  } = useMenu();
  useEffect(() => {
    answerStyleRef.current = answerStyle;
  }, [answerStyle]);

  useEffect(() => {
    void getMyProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (!streaming) return;
    let i = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const id = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2200);
    return () => clearInterval(id);
  }, [streaming]);

  const openConversation = useCallback(async (id: string) => {
    setConversationId(id);
    const rows = await getConversationMessages(id);
    const rebuilt: ChatMessage[] = [];
    for (const row of rows) {
      rebuilt.push({
        id: `${row.id}-q`,
        role: "user",
        content: row.question,
      });
      if (row.answer) {
        const parsed = parseToolPrefix(row.answer);
        rebuilt.push({
          id: `${row.id}-a`,
          role: "assistant",
          content: parsed.content,
          toolId: parsed.toolId,
          question: row.question,
        });
      }
    }
    setMessages(rebuilt);
  }, []);

  useEffect(() => {
    setOnOpenConversation(() => openConversation);
    return () => setOnOpenConversation(null);
  }, [openConversation, setOnOpenConversation]);

  useEffect(() => {
    if (!newChatToken) return;
    setMessages([]);
    setConversationId(null);
    setInput("");
  }, [newChatToken]);

  const runAsk = async (
    history: ChatMessage[],
    questionText: string,
    assistantId: string,
    cid: string,
    styleOverride?: AnswerStyle
  ) => {
    setStreaming(true);
    const messagesToSend = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const style = styleOverride ?? answerStyleRef.current;

    try {
      await streamAsk({
        messages: messagesToSend,
        profile,
        answerStyle: style,
        conversationId: cid,
        onChunk: (full) => {
          const parsed = parseToolPrefix(full);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: parsed.content,
                    toolId: parsed.toolId,
                    question: questionText,
                  }
                : m
            )
          );
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `⚠️ ${message}` } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const cid = conversationId ?? createId();
    if (!conversationId) setConversationId(cid);

    const userMsg: ChatMessage = { id: createId(), role: "user", content: text };
    const assistantId = createId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    await runAsk([...messages, userMsg], text, assistantId, cid);
  };

  const regenerate = async (styleOverride?: AnswerStyle) => {
    if (streaming) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    const withoutLastAssistant = [...messages];
    while (
      withoutLastAssistant.length > 0 &&
      withoutLastAssistant[withoutLastAssistant.length - 1].role === "assistant"
    ) {
      withoutLastAssistant.pop();
    }

    const cid = conversationId ?? createId();
    if (!conversationId) setConversationId(cid);
    const assistantId = createId();
    setMessages([
      ...withoutLastAssistant,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    await runAsk(
      withoutLastAssistant,
      lastUser.content,
      assistantId,
      cid,
      styleOverride
    );
  };

  const empty = messages.length === 0;
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  const askBar = (
    <AskBar
      value={input}
      onChangeText={setInput}
      onSend={() => void send()}
      loading={streaming}
      answerStyle={answerStyle}
      onAnswerStyleChange={setAnswerStyle}
      onToolSelect={() => router.push("/(app)/tools")}
    />
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ChromeHeader />
      <QuickTourModal forceOpen={tour === "1"} />
      <WeeklySummaryModal />

      {empty ? (
        <View style={styles.hero}>
          <Text style={[styles.headline, { color: colors.text }]}>
            Smarter medicine starts here.
          </Text>
          <View style={styles.askWrap}>{askBar}</View>
          <View style={styles.disclaimerRow}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              Umbil can make mistakes. Always verify drug doses and guidance. Do
              not enter patient-identifiable information.
            </Text>
          </View>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => (
              <ChatMessageBubble
                message={item}
                streaming={
                  streaming && item.id === messages[messages.length - 1]?.id
                }
                onCaptureLearning={() =>
                  router.push({
                    pathname: "/(app)/cpd/capture",
                    params: {
                      question: item.question || "",
                      answer: item.content,
                      conversationId: conversationId || "",
                    },
                  })
                }
                isLastAssistant={item.id === lastAssistantId}
                onRegenerate={() => void regenerate()}
                onDeepDive={() => void regenerate("deepDive")}
              />
            )}
            ListFooterComponent={
              streaming ? (
                <View style={styles.loadingRow}>
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                    {loadingMsg}
                  </Text>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />

          <View
            style={[
              styles.sticky,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            {askBar}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  headline: {
    ...typography.hero,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  askWrap: {
    width: "100%",
    maxWidth: 560,
    marginTop: spacing.sm,
  },
  disclaimerRow: {
    marginTop: 36,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    maxWidth: 520,
  },
  disclaimer: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
    gap: 8,
  },
  sticky: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
});
