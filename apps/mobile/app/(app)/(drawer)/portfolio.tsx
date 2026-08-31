import { Ionicons } from "@expo/vector-icons";
import type { PDPGoal } from "@umbil/shared";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChromeHeader } from "@/components/ChromeHeader";
import { useCenteredContentStyle } from "@/components/ScreenSafe";
import { getMyProfile } from "@/lib/profile";
import {
  createMsfCycle,
  createPsqSurvey,
  deleteMsfCycle,
  deletePsqSurvey,
  listMsfCycles,
  listPsqSurveys,
  type MsfCycle,
  type PsqSurvey,
} from "@/lib/store/appraisals";
import { getCPD } from "@/lib/store/cpd";
import { addPDP, deletePDP, getPDP } from "@/lib/store/pdp";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type Tab = "pdp" | "psq" | "msf";

const parseTab = (value: string | string[] | undefined): Tab | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "pdp" || raw === "psq" || raw === "msf" ? raw : null;
};

const TIMELINE_OPTIONS = ["1 month", "3 months", "6 months", "12 months"] as const;

const formatHubDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB");

const PortfolioScreen = () => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const contentStyle = useCenteredContentStyle();

  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => parseTab(tabParam) ?? "pdp");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [goals, setGoals] = useState<PDPGoal[]>([]);
  const [psq, setPsq] = useState<PsqSurvey[]>([]);
  const [msf, setMsf] = useState<MsfCycle[]>([]);
  const [cpdTags, setCpdTags] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [timeline, setTimeline] = useState<string>("3 months");
  const [activities, setActivities] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<"psq" | "msf">("psq");
  const [cycleTitle, setCycleTitle] = useState("");
  const [threshold, setThreshold] = useState(34);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, p, m, cpd] = await Promise.all([
      getPDP(),
      listPsqSurveys(),
      listMsfCycles(),
      getCPD(),
    ]);
    setGoals(g);
    setPsq(p);
    setMsf(m);

    const tagCounts = cpd
      .flatMap((entry) => entry.tags || [])
      .reduce(
        (acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    setCpdTags(
      Object.entries(tagCounts)
        .filter(([, count]) => count >= 7)
        .map(([tag]) => `Strengthen knowledge in ${tag}`)
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    const next = parseTab(tabParam);
    if (next) setTab(next);
  }, [tabParam]);

  useEffect(() => {
    void getMyProfile().then((p) => {
      setIsPro(!!p?.is_pro || p?.subscription_status === "active");
    });
  }, []);

  const suggestedGoals = useMemo(() => cpdTags, [cpdTags]);

  const hubSubtitle =
    tab === "pdp"
      ? "Set and track personal development goals for appraisal."
      : tab === "psq"
        ? "Manage your patient (PSQ) feedback cycles for revalidation."
        : "Gather anonymous feedback from colleagues (MSF) for your appraisal.";

  const openCreate = (kind: "psq" | "msf") => {
    setCreateKind(kind);
    if (kind === "psq") {
      setCycleTitle(`PSQ Cycle ${new Date().getFullYear()}`);
      setThreshold(34);
    } else {
      setCycleTitle(`MSF Appraisal ${new Date().getFullYear()}`);
      setThreshold(15);
    }
    setCreateOpen(true);
  };

  const saveGoal = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await addPDP({
      title: title.trim(),
      timeline,
      activities: activities
        .split("\n")
        .map((a) => a.trim())
        .filter(Boolean),
    });
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message || "Failed to save goal.");
      return;
    }
    setTitle("");
    setTimeline("3 months");
    setActivities("");
    await load();
  };

  const removeGoal = (id: string) => {
    Alert.alert("Delete this goal?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void deletePDP(id).then(load);
        },
      },
    ]);
  };

  const confirmDeletePsq = (id: string) => {
    Alert.alert(
      "Delete PSQ cycle?",
      "This will delete the survey AND all patient responses.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deletePsqSurvey(id).then(load);
          },
        },
      ]
    );
  };

  const confirmDeleteMsf = (id: string) => {
    Alert.alert(
      "Delete MSF cycle?",
      "This will delete the cycle AND all colleague responses.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteMsfCycle(id).then(load);
          },
        },
      ]
    );
  };

  const createCycle = async () => {
    if (!cycleTitle.trim()) return;
    setCreating(true);
    const result =
      createKind === "psq"
        ? await createPsqSurvey(cycleTitle.trim(), threshold)
        : await createMsfCycle(cycleTitle.trim(), threshold);
    setCreating(false);
    if (result.error) {
      Alert.alert(
        "Error",
        result.error.message ||
          `Failed to create ${createKind === "psq" ? "PSQ" : "MSF"} cycle.`
      );
      return;
    }
    setCreateOpen(false);
    await load();
  };

  const adjustThreshold = (delta: number) => {
    const min = createKind === "psq" ? 34 : 15;
    const max = 50;
    setThreshold((t) => Math.min(max, Math.max(min, t + delta)));
  };

  const openPsq = (id: string) => {
    router.push({ pathname: "/(app)/psq/[id]", params: { id } });
  };

  const openMsf = (id: string) => {
    router.push({ pathname: "/(app)/msf/[id]", params: { id } });
  };

  const renderCycleCard = ({
    kind,
    id,
    title: cycleName,
    createdAt,
    count,
    need,
    isClosed,
    isReady,
  }: {
    kind: "psq" | "msf";
    id: string;
    title: string;
    createdAt: string;
    count: number;
    need: number;
    isClosed: boolean;
    isReady: boolean;
  }) => {
    const onOpen = () => (kind === "psq" ? openPsq(id) : openMsf(id));
    const onDelete = () =>
      kind === "psq" ? confirmDeletePsq(id) : confirmDeleteMsf(id);
    const iconName =
      kind === "psq" ? "document-text-outline" : "chatbubble-ellipses-outline";

    return (
      <View key={id} style={styles.cycleCard}>
        <Pressable style={styles.cycleMain} onPress={onOpen}>
          <View style={styles.cycleIcon}>
            <Ionicons name={iconName} size={24} color={colors.primary} />
          </View>
          <View style={styles.cycleBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {cycleName}
              </Text>
              {isClosed ? (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedBadgeText}>Closed</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.cycleMetaRow}>
              <Text style={styles.meta}>{formatHubDate(createdAt)}</Text>
              <View
                style={[
                  styles.responsesPill,
                  isReady && styles.responsesPillReady,
                ]}
              >
                <Text
                  style={[
                    styles.responsesPillText,
                    isReady && styles.responsesPillTextReady,
                  ]}
                >
                  {count} / {need} Responses
                </Text>
              </View>
            </View>
          </View>
        </Pressable>

        <View style={styles.cycleActions}>
          {isReady ? (
            isPro ? (
              <Pressable style={styles.reportBtn} onPress={onOpen}>
                <Text style={styles.reportBtnText}>View Final Report</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.upgradeBtn}
                onPress={() => router.push("/(app)/pro")}
              >
                <Ionicons name="lock-closed" size={14} color={colors.surface} />
                <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
              </Pressable>
            )
          ) : (
            <Pressable style={styles.manageLinkWrap} onPress={onOpen}>
              <Text style={styles.manageLink}>Manage & Share Link</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [
              styles.trashBtn,
              pressed && styles.trashBtnPressed,
            ]}
            hitSlop={8}
            accessibilityLabel="Delete cycle"
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <ChromeHeader />
      <View style={styles.hubHeader}>
        <Text style={styles.hubTitle}>
          {tab === "pdp" ? "Personal Development Plan" : "Appraisals Hub"}
        </Text>
        <Text style={styles.hubSubtitle}>{hubSubtitle}</Text>
        {tab !== "pdp" ? (
          <Pressable
            style={styles.hubNewBtn}
            onPress={() => openCreate(tab)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.hubNewBtnText}>
              New {tab === "psq" ? "PSQ" : "MSF"} Cycle
            </Text>
          </Pressable>
        ) : null}
      </View>

      {tab !== "pdp" ? (
        <View style={styles.tabsRow}>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setTab("psq")}
              style={[
                styles.segmentBtn,
                tab === "psq" && styles.segmentBtnActive,
              ]}
            >
              <Ionicons
                name="people-outline"
                size={18}
                color={tab === "psq" ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  tab === "psq" && styles.segmentTextActive,
                ]}
                numberOfLines={1}
              >
                My PSQ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("msf")}
              style={[
                styles.segmentBtn,
                tab === "msf" && styles.segmentBtnActive,
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={tab === "msf" ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  tab === "msf" && styles.segmentTextActive,
                ]}
                numberOfLines={1}
              >
                My MSF
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
          {tab === "pdp" ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Add a New Goal</Text>
                <Text style={styles.label}>Goal title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Strengthen COPD management"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  editable={!saving}
                />
                <Text style={styles.label}>Timeline</Text>
                <View style={styles.row}>
                  {TIMELINE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setTimeline(opt)}
                      style={[
                        styles.chip,
                        timeline === opt && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          timeline === opt && styles.chipTextActive,
                        ]}
                      >
                        {opt.replace(" months", "m").replace(" month", "m")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>
                  Planned activities (one per line)
                </Text>
                <TextInput
                  style={[styles.input, styles.tall]}
                  placeholder={
                    "Attend COPD guideline update webinar\nShadow respiratory clinic\nAudit rescue packs"
                  }
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={activities}
                  onChangeText={setActivities}
                  editable={!saving}
                />
                <Pressable
                  style={[styles.primaryBtn, saving && styles.disabled]}
                  onPress={() => void saveGoal()}
                  disabled={saving}
                >
                  <Text style={styles.primaryBtnText}>
                    {saving ? "Saving…" : "Add goal"}
                  </Text>
                </Pressable>
              </View>

              {suggestedGoals.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    Suggested Goals (Based on your CPD)
                  </Text>
                  <View style={styles.suggestWrap}>
                    {suggestedGoals.map((sg) => (
                      <Pressable
                        key={sg}
                        onPress={() => setTitle(sg)}
                        style={styles.suggestChip}
                      >
                        <Text style={styles.suggestText}>{sg}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>Current Goals</Text>
              {goals.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    You haven't added any goals yet.
                  </Text>
                </View>
              ) : (
                goals.map((goal) => (
                  <View key={goal.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{goal.title}</Text>
                    <Text style={styles.meta}>Target: {goal.timeline}</Text>
                    {(goal.activities?.length ?? 0) > 0 ? (
                      <>
                        <Text style={styles.activitiesHeading}>
                          Planned Activities:
                        </Text>
                        {goal.activities.map((a) => (
                          <Text key={a} style={styles.body}>
                            • {a}
                          </Text>
                        ))}
                      </>
                    ) : null}
                    <Pressable onPress={() => removeGoal(goal.id)}>
                      <Text style={styles.danger}>Remove</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </>
          ) : null}

          {tab === "psq" ? (
            <>
              <View style={styles.banner}>
                <View style={styles.bannerCheck}>
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                </View>
                <View style={styles.bannerCopy}>
                  <Text style={styles.bannerTitle}>
                    Patient Satisfaction Questionnaires (PSQ)
                  </Text>
                  <Text style={styles.bannerBody}>
                    Create your cycle and collect your required responses
                    completely{" "}
                    <Text style={styles.bannerStrong}>for free</Text>. Unlock
                    your final GMC-compliant PDF report and AI summary with an
                    Umbil Pro subscription.
                  </Text>
                </View>
              </View>

              {psq.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="people-outline"
                      size={32}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>No PSQ cycles yet</Text>
                  <Text style={styles.emptyText}>
                    Start a new collection cycle to get a unique patient survey
                    link.
                  </Text>
                  <Pressable
                    style={styles.outlineBtn}
                    onPress={() => openCreate("psq")}
                  >
                    <Text style={styles.outlineBtnText}>Start First Cycle</Text>
                  </Pressable>
                </View>
              ) : (
                psq.map((survey) => {
                  const count = survey.psq_responses?.[0]?.count ?? 0;
                  const need = survey.required_responses ?? 34;
                  const isReady = count >= need;
                  return renderCycleCard({
                    kind: "psq",
                    id: survey.id,
                    title: survey.title || "PSQ Cycle",
                    createdAt: survey.created_at,
                    count,
                    need,
                    isClosed: isReady,
                    isReady,
                  });
                })
              )}
            </>
          ) : null}

          {tab === "msf" ? (
            <>
              <View style={styles.banner}>
                <View style={styles.bannerCheck}>
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                </View>
                <View style={styles.bannerCopy}>
                  <Text style={styles.bannerTitle}>
                    Colleague Multi-Source Feedback (MSF)
                  </Text>
                  <Text style={styles.bannerBody}>
                    Frictionless feedback collection. Start your cycle and
                    gather all responses{" "}
                    <Text style={styles.bannerStrong}>for free</Text>. Unlock
                    your full appraisal report and automated reflection draft
                    with an Umbil Pro subscription.
                  </Text>
                </View>
              </View>

              {msf.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={32}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>No MSF cycles yet</Text>
                  <Text style={styles.emptyText}>
                    Start a new cycle to get a unique colleague survey link.
                  </Text>
                  <Pressable
                    style={styles.outlineBtn}
                    onPress={() => openCreate("msf")}
                  >
                    <Text style={styles.outlineBtnText}>Start First Cycle</Text>
                  </Pressable>
                </View>
              ) : (
                msf.map((cycle) => {
                  const count = cycle.msf_responses?.[0]?.count ?? 0;
                  const need = cycle.required_responses ?? 15;
                  const isReady = count >= need;
                  const isClosed = cycle.status === "closed" || isReady;
                  return renderCycleCard({
                    kind: "msf",
                    id: cycle.id,
                    title: cycle.title || "MSF Cycle",
                    createdAt: cycle.created_at,
                    count,
                    need,
                    isClosed,
                    isReady,
                  });
                })
              )}
            </>
          ) : null}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCreateOpen(false)}
        >
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Start New {createKind === "psq" ? "PSQ" : "MSF"} Cycle
            </Text>

            <Text style={styles.label}>Cycle Name</Text>
            <TextInput
              style={styles.input}
              value={cycleTitle}
              onChangeText={setCycleTitle}
              placeholder={
                createKind === "psq"
                  ? "e.g. PSQ 2026"
                  : "e.g. MSF Appraisal 2026"
              }
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <View style={styles.thresholdHeader}>
              <Text style={styles.label}>
                {createKind === "psq"
                  ? "Target Responses"
                  : "Anonymity Threshold"}
              </Text>
              <Text style={styles.thresholdValue}>
                {threshold} Responses
              </Text>
            </View>
            <Text style={styles.hint}>
              {createKind === "psq"
                ? "GMC usually recommends 34, but you can adjust this based on appraiser agreement."
                : "Results will remain locked until this many colleagues have submitted feedback to protect their identity."}
            </Text>
            <View style={styles.thresholdRow}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => adjustThreshold(-1)}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.thresholdBig}>{threshold}</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => adjustThreshold(1)}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
            <View style={styles.thresholdRange}>
              <Text style={styles.hint}>
                {createKind === "psq" ? "34" : "15"}
              </Text>
              <Text style={styles.hint}>50</Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setCreateOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, creating && styles.disabled]}
                onPress={() => void createCycle()}
                disabled={creating}
              >
                <Text style={styles.primaryBtnText}>
                  {creating
                    ? createKind === "psq"
                      ? "Creating…"
                      : "Starting…"
                    : createKind === "psq"
                      ? "Create Cycle"
                      : "Start Cycle"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    hubHeader: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    hubTitle: {
      fontFamily: fonts.bold,
      fontSize: 26,
      color: colors.text,
      marginBottom: 8,
    },
    hubSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    hubNewBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    hubNewBtnText: {
      color: "#fff",
      fontFamily: fonts.bold,
      fontSize: 14,
    },
    tabsRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: 4,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: radii.sm,
    },
    segmentBtnActive: {
      backgroundColor: colors.hoverBg,
    },
    segmentText: {
      fontFamily: fonts.bold,
      color: colors.textMuted,
      fontSize: 14,
    },
    segmentTextActive: { color: colors.primary },
    content: { padding: spacing.md },
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    label: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      padding: 12,
      backgroundColor: colors.background,
      color: colors.text,
      marginBottom: spacing.sm,
      fontFamily: fonts.regular,
      outlineWidth: 0,
    },
    tall: { minHeight: 90, textAlignVertical: "top" },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: spacing.sm,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    chipText: { fontFamily: fonts.bold, color: colors.textMuted },
    chipTextActive: { color: colors.primary },
    primaryBtn: {
      alignSelf: "flex-end",
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: spacing.md,
    },
    primaryBtnText: { color: "#fff", fontFamily: fonts.bold },
    disabled: { opacity: 0.6 },
    outlineBtn: {
      alignSelf: "center",
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginTop: spacing.sm,
    },
    outlineBtnText: { color: colors.primary, fontFamily: fonts.bold },
    banner: {
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    bannerCheck: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    bannerCopy: { flex: 1 },
    bannerTitle: {
      fontFamily: fonts.bold,
      fontSize: 15,
      color: colors.text,
      marginBottom: 6,
    },
    bannerBody: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
    },
    bannerStrong: {
      fontFamily: fonts.bold,
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: 6,
    },
    cycleCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: 12,
    },
    cycleMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    cycleIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    cycleBody: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    cycleMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    cycleActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    reportBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    reportBtnText: {
      color: "#fff",
      fontFamily: fonts.bold,
      fontSize: 14,
    },
    upgradeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.text,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    upgradeBtnText: {
      color: colors.surface,
      fontFamily: fonts.bold,
      fontSize: 14,
    },
    manageLinkWrap: {
      flex: 1,
      paddingVertical: 12,
    },
    manageLink: {
      color: colors.primary,
      fontFamily: fonts.bold,
      fontSize: 13,
    },
    trashBtn: {
      padding: 8,
      borderRadius: radii.sm,
    },
    trashBtnPressed: {
      backgroundColor: colors.dangerMuted,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.border,
      padding: spacing.lg,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.hoverBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontFamily: fonts.regular,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
    closedBadge: {
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    closedBadgeText: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: colors.primary,
    },
    responsesPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.hoverBg,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    responsesPillReady: {
      backgroundColor: colors.primaryMuted,
    },
    responsesPillText: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: colors.textMuted,
    },
    responsesPillTextReady: {
      color: colors.primary,
    },
    meta: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.regular },
    activitiesHeading: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
    },
    body: {
      color: colors.text,
      lineHeight: 20,
      fontFamily: fonts.regular,
    },
    danger: {
      color: colors.danger,
      fontFamily: fonts.semiBold,
      marginTop: 4,
    },
    suggestWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    suggestChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    suggestText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.text,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    modalTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: colors.text,
      marginBottom: spacing.md,
    },
    thresholdHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    thresholdValue: {
      fontFamily: fonts.bold,
      color: colors.primary,
      fontSize: 13,
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      lineHeight: 17,
    },
    thresholdRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      marginVertical: spacing.sm,
    },
    stepperBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    stepperText: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.text,
    },
    thresholdBig: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: colors.primary,
      minWidth: 48,
      textAlign: "center",
    },
    thresholdRange: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 12,
      marginTop: spacing.sm,
    },
    modalCancel: { paddingHorizontal: 12, paddingVertical: 10 },
    modalCancelText: {
      fontFamily: fonts.bold,
      color: colors.text,
    },
  });

export default PortfolioScreen;
