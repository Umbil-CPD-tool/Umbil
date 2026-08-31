import type { AnswerStyle } from "@umbil/shared";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AskBar } from "@/components/AskBar";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { ChromeHeader } from "@/components/ChromeHeader";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { useContentWidth } from "@/components/ScreenSafe";
import {
  ProfileCompletionModal,
  isProfileIncomplete,
  shouldShowProfilePrompt,
} from "@/components/ProfileCompletionModal";
import { QuickTourModal } from "@/components/QuickTourModal";
import { StreakPopup } from "@/components/StreakPopup";
import { WeeklySummaryModal } from "@/components/WeeklySummaryModal";
import { streamAsk } from "@/lib/api";
import { appStorage } from "@/lib/appStorage";
import { createId } from "@/lib/ids";
import { getMyProfile, type Profile } from "@/lib/profile";
import { getConversationMessages } from "@/lib/store/chat";
import { clearDraft, getDraft, saveDraft } from "@/lib/store/drafts";
import { parseStreamPrefix, type ChatMessage } from "@/lib/stream";
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

const DASHBOARD_DRAFT_ID = "dashboard_chat";
const TOUR_SEEN_KEY = "umbil_quick_tour_seen";

const paramString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const contentWidth = useContentWidth();
  const params = useLocalSearchParams<{
    tour?: string;
    c?: string;
    cpdSaved?: string;
    streak?: string;
  }>();
  const tour = paramString(params.tour);
  const conversationParam = paramString(params.c);
  const cpdSaved = paramString(params.cpdSaved);
  const streakParam = paramString(params.streak);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("standard");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lastLoggedCount, setLastLoggedCount] = useState(0);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [isStreakPopupOpen, setIsStreakPopupOpen] = useState(false);
  const [streakToDisplay, setStreakToDisplay] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList>(null);
  const answerStyleRef = useRef(answerStyle);
  const skipDraftRestoreRef = useRef(false);
  const draftHydratedRef = useRef(false);
  const processedCRef = useRef<string | null>(null);
  const cpdSavedAppliedRef = useRef(false);
  const seenStreakRef = useRef("");
  const profilePromptCheckedRef = useRef(false);
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
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
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
        const parsed = parseStreamPrefix(row.answer);
        rebuilt.push({
          id: `${row.id}-a`,
          role: "assistant",
          content: parsed.content,
          toolId: parsed.toolId,
          action: parsed.action,
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
    if (!conversationParam || conversationParam === processedCRef.current) {
      return;
    }
    processedCRef.current = conversationParam;
    void openConversation(conversationParam);
  }, [conversationParam, openConversation]);

  useEffect(() => {
    if (!newChatToken) return;
    skipDraftRestoreRef.current = true;
    processedCRef.current = "__new_chat__";
    cpdSavedAppliedRef.current = false;
    setMessages([]);
    setConversationId(null);
    setInput("");
    setLastLoggedCount(0);
    void clearDraft(DASHBOARD_DRAFT_ID);
  }, [newChatToken]);

  useEffect(() => {
    let cancelled = false;
    const loadDraft = async () => {
      if (skipDraftRestoreRef.current || tour === "1") {
        draftHydratedRef.current = true;
        return;
      }
      const savedDraft = await getDraft(DASHBOARD_DRAFT_ID);
      if (cancelled) return;
      if (savedDraft && !skipDraftRestoreRef.current) {
        setInput((current) => (current.trim() ? current : savedDraft));
      }
      draftHydratedRef.current = true;
    };
    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [tour]);

  useEffect(() => {
    if (!draftHydratedRef.current || streaming) return;
    const timer = setTimeout(() => {
      if (input.trim()) {
        void saveDraft(DASHBOARD_DRAFT_ID, input);
        return;
      }
      void clearDraft(DASHBOARD_DRAFT_ID);
    }, 400);
    return () => clearTimeout(timer);
  }, [input, streaming]);

  useEffect(() => {
    if (cpdSaved !== "true") {
      cpdSavedAppliedRef.current = false;
      return;
    }
    if (cpdSavedAppliedRef.current) return;
    if (conversationParam && messages.length === 0) return;
    cpdSavedAppliedRef.current = true;
    setLastLoggedCount(messages.filter((m) => m.role === "user").length);
  }, [cpdSaved, conversationParam, messages]);

  useEffect(() => {
    const n = Number(streakParam);
    if (!streakParam || streakParam === seenStreakRef.current) return;
    if (!Number.isFinite(n) || n <= 0) return;
    seenStreakRef.current = streakParam;
    setStreakToDisplay(n);
    setIsStreakPopupOpen(true);
  }, [streakParam]);

  useEffect(() => {
    if (!profile || tour === "1" || isStreakPopupOpen) return;
    if (!isProfileIncomplete(profile)) return;
    if (profilePromptCheckedRef.current) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const tryShow = async () => {
      const tourSeen = await appStorage.getItem(TOUR_SEEN_KEY);
      if (!tourSeen) return false;
      const allowed = await shouldShowProfilePrompt();
      if (cancelled) return true;
      profilePromptCheckedRef.current = true;
      if (allowed && isProfileIncomplete(profile)) {
        setShowProfilePrompt(true);
      }
      return true;
    };

    const timer = setTimeout(() => {
      void tryShow().then((done) => {
        if (done || cancelled) return;
        interval = setInterval(() => {
          void tryShow().then((finished) => {
            if (finished && interval) clearInterval(interval);
          });
        }, 1000);
      });
    }, 900);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [profile, tour, isStreakPopupOpen]);

  const openCapture = (question: string, answer: string, cid: string) => {
    router.push({
      pathname: "/(app)/cpd/capture",
      params: { question, answer, conversationId: cid },
    });
  };

  const shareConversation = useCallback(async () => {
    const text = messages
      .filter((m) => m.content.trim())
      .map((m) => {
        const prefix = m.role === "user" ? "You" : "Umbil";
        return `${prefix}:\n${m.content}\n\n--------------------\n`;
      })
      .join("\n");
    try {
      await Share.share({ title: "Umbil Conversation", message: text });
    } catch {
      /* user dismissed the share sheet */
    }
  }, [messages]);

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
    let sawCaptureAction = false;

    try {
      const fullText = await streamAsk({
        messages: messagesToSend,
        profile,
        answerStyle: style,
        conversationId: cid,
        onChunk: (full) => {
          const parsed = parseStreamPrefix(full);
          if (parsed.action === "capture_learning") sawCaptureAction = true;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: parsed.content,
                    toolId: parsed.toolId,
                    action: parsed.action,
                    question: questionText,
                  }
                : m
            )
          );
        },
      });
      const parsed = parseStreamPrefix(fullText);
      if (parsed.action === "capture_learning") sawCaptureAction = true;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: parsed.content,
                toolId: parsed.toolId,
                action: parsed.action,
                question: questionText,
              }
            : m
        )
      );
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

    if (sawCaptureAction) {
      const prior = [...history]
        .reverse()
        .find((m) => m.role === "assistant" && m.content.trim());
      openCapture(prior?.question || questionText, prior?.content || "", cid);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const cid = conversationId ?? createId();
    if (!conversationId) setConversationId(cid);

    skipDraftRestoreRef.current = true;
    void clearDraft(DASHBOARD_DRAFT_ID);

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
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastAssistantId = lastAssistant?.id;
  const lastAssistantHasBody = Boolean(
    lastAssistant?.content?.trim() || lastAssistant?.toolId
  );
  const showThinking = streaming && !lastAssistantHasBody;
  const userMsgCount = messages.filter((m) => m.role === "user").length;
  const nudgeDelta = userMsgCount - lastLoggedCount;
  const showNudge =
    !streaming && userMsgCount > 0 && nudgeDelta > 0 && nudgeDelta % 10 === 0;
  const keyboardInset = Platform.OS === "ios" ? keyboardHeight : 0;

  const askBar = (
    <AskBar
      value={input}
      onChangeText={setInput}
      onSend={() => void send()}
      loading={streaming}
      answerStyle={answerStyle}
      onAnswerStyleChange={setAnswerStyle}
      onToolSelect={(toolId) =>
        router.push({ pathname: "/(app)/tools", params: { tool: toolId } })
      }
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ChromeHeader />
      <QuickTourModal forceOpen={tour === "1"} />
      <WeeklySummaryModal />
      <StreakPopup
        isOpen={isStreakPopupOpen}
        streakCount={streakToDisplay}
        onClose={() => setIsStreakPopupOpen(false)}
      />
      <ProfileCompletionModal
        isOpen={showProfilePrompt && !isStreakPopupOpen && tour !== "1"}
        onClose={() => setShowProfilePrompt(false)}
        missingName={!profile?.full_name?.trim()}
        missingGrade={!profile?.grade?.trim()}
      />

      {empty ? (
        <View
          style={[
            styles.hero,
            {
              paddingBottom:
                keyboardInset > 0
                  ? keyboardInset
                  : Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <Text style={[styles.headline, { color: colors.text }]}>
            Smarter medicine starts here.
          </Text>
          <View
            style={[styles.askWrap, { maxWidth: Math.min(contentWidth, 560) }]}
          >
            {askBar}
          </View>
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
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={messages.filter(
              (m) => m.role === "user" || m.content.trim() || m.toolId
            )}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[
              styles.list,
              { maxWidth: contentWidth, alignSelf: "center", width: "100%" },
            ]}
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
                  openCapture(
                    item.question || "",
                    item.content,
                    conversationId || ""
                  )
                }
                onShareConversation={() => void shareConversation()}
                showNudge={showNudge && item.id === lastAssistantId}
                onNudgeCapture={() =>
                  openCapture(
                    item.question || "",
                    item.content,
                    conversationId || ""
                  )
                }
                isLastAssistant={item.id === lastAssistantId}
                onRegenerate={() => void regenerate()}
                onDeepDive={() => void regenerate("deepDive")}
              />
            )}
            ListFooterComponent={
              showThinking ? (
                <ThinkingIndicator message={loadingMsg} />
              ) : null
            }
          />

          <View
            style={[
              styles.sticky,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom:
                  keyboardInset > 0
                    ? keyboardInset
                    : Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <View
              style={[styles.askWrap, { maxWidth: Math.min(contentWidth, 560) }]}
            >
              {askBar}
            </View>
          </View>
        </View>
      )}
    </View>
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
    alignSelf: "center",
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
    paddingTop: spacing.md,
    alignItems: "center",
  },
});
