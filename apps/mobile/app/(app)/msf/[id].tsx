import {
  API_PATHS,
  buildAppraisalPackPdfSections,
  parseAppraisalPack,
  reflectionBodyFromPack,
} from "@umbil/shared";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  CategoryBreakdown,
  DomainBarChart,
  DomainLegend,
} from "@/components/appraisals/AppraisalCharts";
import { getPublicEnv } from "@/lib/env";
import { calculateMsfAnalytics, type MsfAnalyticsResult } from "@/lib/msfAnalytics";
import { getMyProfile } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";
import {
  getMsfCycle,
  updateMsfCustomQuestions,
  type MsfCycleWithResponses,
} from "@/lib/store/appraisals";
import { addCPD } from "@/lib/store/cpd";
import { useTheme } from "@/providers/ThemeProvider";
import { useCenteredContentStyle } from "@/components/ScreenSafe";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const isLimitReached = (message: string): boolean =>
  message === "LIMIT_REACHED" || message.includes("LIMIT_REACHED");

const buildMsfReportHtml = (
  cycle: MsfCycleWithResponses,
  analytics: MsfAnalyticsResult,
  packText: string,
  reflection: string
) => {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const scoresRows = analytics.breakdown
    .map((q) => {
      const scoreDisplay = typeof q.score === "number" ? q.score.toFixed(2) : q.score;
      return `<tr><td>${escape(q.name)}</td><td style="text-align:right;font-weight:700;color:#1fb8cd;">${scoreDisplay}</td></tr>`;
    })
    .join("");

  const roleRows =
    analytics.roleTypes.length > 0
      ? analytics.roleTypes
          .map((t) => `<tr><td>${escape(t.name)}</td><td style="text-align:right;">${t.value}</td></tr>`)
          .join("")
      : `<tr><td colspan="2" style="color:#94a3b8;font-style:italic;text-align:center;">No data recorded</td></tr>`;

  const comment = (label: string, value: string) =>
    value ? `<div class="feedback-card"><strong>${label}:</strong> "${escape(value)}"</div>` : "";

  const commentsHtml = analytics.textFeedback
    .map(
      (fb) =>
        comment("Strengths", fb.strengths) +
        comment("Example", fb.example) +
        comment("Development", fb.improve) +
        comment("Additional", fb.additional)
    )
    .join("");

  const customHtml = analytics.customFeedback
    .map(
      (cf) =>
        `<div class="comment-section"><h4>Q: ${escape(cf.question)}</h4><ul>${cf.answers
          .map((a) => `<li>"${escape(a)}"</li>`)
          .join("")}</ul></div>`
    )
    .join("");

  const livePack = parseAppraisalPack(packText || reflection);
  const appraisalHtml = buildAppraisalPackPdfSections(livePack, { escapeHtml: escape });
  const reflectionHtml =
    appraisalHtml ||
    (reflection
      ? `<div class="print-section"><div class="section-title">Reflection & Action Plan</div><div class="reflection-box">${escape(reflection)}</div></div>`
      : "");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px; color: #1e293b; }
          h1 { color: #0f172a; font-size: 22px; margin-bottom: 4px; }
          .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }
          .summary-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #1e3a8a; border-radius: 0 8px 8px 0; }
          .dashboard { display: flex; gap: 16px; margin-bottom: 24px; }
          .stat { flex: 1; text-align: center; background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 10px; padding: 14px; }
          .stat-val { display: block; font-size: 20px; font-weight: 800; color: #1fb8cd; }
          .stat-label { font-size: 10px; color: #115e59; text-transform: uppercase; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 20px 0 10px; border-left: 3px solid #1fb8cd; padding-left: 8px; break-after: avoid; page-break-after: avoid; }
          .print-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 20px; }
          .feedback-container { display: flex; gap: 16px; margin-bottom: 16px; }
          .feedback-column { flex: 1; }
          .feedback-header { font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
          .feedback-header.good { color: #059669; }
          .feedback-header.improve { color: #d97706; }
          .feedback-card { background: #f1f5f9; border-left: 3px solid #cbd5e1; padding: 10px 12px; margin-bottom: 8px; border-radius: 6px; font-size: 12px; }
          .feedback-card.good { background: #ecfdf5; border-left-color: #10b981; }
          .feedback-card.improve { background: #fffbeb; border-left-color: #f59e0b; }
          .comment-section { margin-bottom: 16px; }
          .reflection-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 13px; }
          .markdown-body { font-size: 13px; color: #431407; }
          @media print {
            .print-section, .reflection-box, .feedback-container, .dashboard { break-inside: avoid; page-break-inside: avoid; }
            .section-title { break-after: avoid; page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${escape(cycle.title || "MSF Cycle")}</h1>
        <div class="subtitle">Multi-Source Feedback Report &bull; Generated by Umbil</div>
        <div class="dashboard">
          <div class="stat"><span class="stat-val">${analytics.stats.totalResponses}</span><span class="stat-label">Total Responses</span></div>
          <div class="stat"><span class="stat-val">${analytics.stats.averageScore}</span><span class="stat-label">Average Score</span></div>
          <div class="stat"><span class="stat-val" style="font-size:14px;">${escape(analytics.stats.topArea)}</span><span class="stat-label">Top Area</span></div>
        </div>
        <div class="print-section"><div class="section-title">Score Breakdown</div><table>${scoresRows}</table></div>
        <div class="print-section"><div class="section-title">Respondent Roles</div><table>${roleRows}</table></div>
        ${reflectionHtml}
        ${commentsHtml ? `<div class="print-section"><div class="section-title">Colleague Comments</div>${commentsHtml}</div>` : ""}
        ${customHtml ? `<div class="print-section"><div class="section-title">Custom Questions</div>${customHtml}</div>` : ""}
      </body>
    </html>
  `;
};

const MsfDetailScreen = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const contentStyle = useCenteredContentStyle();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cycle, setCycle] = useState<MsfCycleWithResponses | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [savingQs, setSavingQs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [packText, setPackText] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [copiedReflection, setCopiedReflection] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [reflection, setReflection] = useState("");
  const hasGeneratedPack = useRef(false);

  const pack = useMemo(() => parseAppraisalPack(packText), [packText]);
  const executiveSummary = pack.executiveSummary;

  const applyPack = (text: string) => {
    setPackText(text);
    setReflection(reflectionBodyFromPack(parseAppraisalPack(text), "colleagues"));
  };

  const { apiUrl } = getPublicEnv();
  const origin = apiUrl.replace(/\/$/, "") || "https://umbil.ai";
  const shareUrl = `${origin}/m/${id}`;

  useEffect(() => {
    void getMsfCycle(id).then(({ data }) => {
      setCycle(data);
      setCustomQuestions(data?.custom_questions || []);
      if (data?.ai_summary) applyPack(data.ai_summary);
      setLoading(false);
    });
    void getMyProfile()
      .then((p) => setIsPro(!!p?.is_pro || p?.subscription_status === "active"))
      .finally(() => setProfileLoading(false));
  }, [id]);

  const analytics: MsfAnalyticsResult | null = useMemo(() => {
    if (!cycle) return null;
    return calculateMsfAnalytics(cycle, cycle.msf_responses || []);
  }, [cycle]);

  const responses = analytics?.stats.totalResponses ?? cycle?.msf_responses?.length ?? 0;
  const required = analytics?.stats.targetThreshold ?? cycle?.required_responses ?? 15;
  const isThresholdMet = analytics?.stats.thresholdMet ?? false;
  const isClosed = cycle?.status === "closed" || isThresholdMet;
  const progress = Math.min(100, (responses / required) * 100);
  const chartWidth = Math.min(width - spacing.lg * 2 - spacing.md * 2, 360);

  const strengthsComments = analytics?.textFeedback.filter((fb) => fb.strengths) ?? [];
  const exampleComments = analytics?.textFeedback.filter((fb) => fb.example) ?? [];
  const improveComments = analytics?.textFeedback.filter((fb) => fb.improve) ?? [];
  const additionalComments = analytics?.textFeedback.filter((fb) => fb.additional) ?? [];
  const hasComments =
    strengthsComments.length > 0 ||
    exampleComments.length > 0 ||
    improveComments.length > 0 ||
    additionalComments.length > 0;

  const generateAiSummary = async (force = true) => {
    if (!cycle || !analytics) return;
    if (!force && cycle.ai_summary) {
      applyPack(cycle.ai_summary);
      return;
    }

    setGeneratingAi(true);
    setPackText("");
    setReflection("");
    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession();

      const averages = {
        domain1:
          Number(
            analytics.breakdown.find((b) => b.id === "Domain 1: Knowledge, Skills and Performance")?.score
          ) || 0,
        domain2:
          Number(analytics.breakdown.find((b) => b.id === "Domain 2: Safety and Quality")?.score) || 0,
        domain3:
          Number(
            analytics.breakdown.find(
              (b) => b.id === "Domain 3: Communication, Partnership and Teamwork"
            )?.score
          ) || 0,
        domain4: Number(analytics.breakdown.find((b) => b.id === "Domain 4: Maintaining Trust")?.score) || 0,
      };

      const res = await fetch(`${origin}${API_PATHS.msfAiSummary}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          cycle_id: id,
          averages,
          stats: analytics.stats,
          domainScores: analytics.breakdown,
          roleTypes: analytics.roleTypes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Server responded with an error");
      if (data?.summary) {
        applyPack(data.summary);
        setCycle((c) => (c ? { ...c, ai_summary: data.summary } : c));
      }
    } catch (err) {
      Alert.alert(
        "Error generating summary",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (isClosed && isPro && analytics && !hasGeneratedPack.current) {
      hasGeneratedPack.current = true;
      void generateAiSummary(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analytics, isPro, isClosed]);

  const copyReflection = async () => {
    if (!reflection) return;
    await Clipboard.setStringAsync(reflection);
    setCopiedReflection(true);
    setTimeout(() => setCopiedReflection(false), 2000);
  };

  const handleSaveToLog = async () => {
    if (!reflection.trim() || !analytics || !cycle) return;
    setSavingLog(true);
    try {
      const { error } = await addCPD({
        timestamp: new Date().toISOString(),
        question: `Multi-Source Feedback (MSF) Review - ${cycle.title || "MSF Cycle"}`,
        answer:
          executiveSummary ||
          `Reviewed feedback from ${responses} colleagues. Overall score: ${analytics.stats.averageScore}/5.0.`,
        reflection: reflection.trim(),
        tags: ["MSF", "Colleague Feedback", "Appraisal", "Domain 3", "Domain 4"],
        duration: 30,
      });

      if (error) {
        if (isLimitReached(error.message || "")) {
          Alert.alert(
            "Upgrade to Pro",
            "You have reached your monthly CPD logging limit. Please upgrade to Pro.",
            [
              { text: "Not now", style: "cancel" },
              { text: "Upgrade", onPress: () => router.push("/(app)/pro") },
            ]
          );
        } else {
          Alert.alert("Save failed", error.message || "Could not save to Capture learning. Please try again.");
        }
        return;
      }
      Alert.alert("Saved", "Saved to Capture learning successfully!");
    } finally {
      setSavingLog(false);
    }
  };

  const exportPdf = async () => {
    if (!cycle || !analytics) return;
    setExportingPdf(true);
    try {
      const html = buildMsfReportHtml(cycle, analytics, packText, reflection);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share MSF report",
        });
      } else {
        Alert.alert("Export ready", "PDF generated but sharing is unavailable on this device.");
      }
    } catch (err) {
      Alert.alert(
        "Export failed",
        err instanceof Error ? err.message : "Could not generate the PDF report."
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const invite = async () => {
    if (!email.trim() || !cycle) return;
    setInviting(true);
    setInviteStatus("idle");
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again to send invites.");

      const res = await fetch(`${origin}${API_PATHS.msfInvite}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          link: shareUrl,
          title: cycle.title || "Appraisal Feedback",
        }),
      });
      if (!res.ok) throw new Error("Invite failed");
      setInviteStatus("success");
      setEmail("");
      Alert.alert("Invite sent", `Invitation sent successfully`);
      setTimeout(() => setInviteStatus("idle"), 3000);
    } catch (err) {
      setInviteStatus("error");
      Alert.alert(
        "Invite error",
        err instanceof Error
          ? err.message
          : "Failed to send invitation. Please check your connection."
      );
    } finally {
      setInviting(false);
    }
  };

  const persistQuestions = async (updated: string[]) => {
    if (isClosed) {
      Alert.alert(
        "Cycle is closed",
        "Questions cannot be edited."
      );
      return;
    }
    setSavingQs(true);
    setCustomQuestions(updated);
    const { error } = await updateMsfCustomQuestions(
      id,
      updated.map((q) => q.trim()).filter(Boolean)
    );
    setSavingQs(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setCycle((c) =>
      c
        ? {
            ...c,
            custom_questions: updated.map((q) => q.trim()).filter(Boolean),
          }
        : c
    );
  };

  const addCustomQuestion = () => {
    if (customQuestions.length >= 2 || isClosed) return;
    void persistQuestions([...customQuestions, ""]);
  };

  const updateCustomQuestion = (idx: number, val: string) => {
    const updated = [...customQuestions];
    updated[idx] = val;
    setCustomQuestions(updated);
  };

  const commitCustomQuestions = () => {
    void persistQuestions(customQuestions);
  };

  const removeCustomQuestion = (idx: number) => {
    void persistQuestions(customQuestions.filter((_, i) => i !== idx));
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    Alert.alert("Copied", "Share link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = makeStyles(colors);

  return (
    <>
      <Stack.Screen
        options={{
          title: "MSF cycle",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.text },
        }}
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : !cycle ? (
        <Text style={styles.empty}>Cycle not found.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]}>
          <Text style={styles.title}>{cycle.title || "MSF Cycle"}</Text>
          <Text style={styles.meta}>
            {new Date(cycle.created_at).toLocaleDateString()}
            {cycle.status ? ` · ${cycle.status}` : ""}
          </Text>

          <Text style={styles.heading}>Share Cycle</Text>
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Unique Feedback Link</Text>
            <Text style={styles.cardHint}>
              Share this anonymous link with your clinical and non-clinical
              colleagues. No login is required for them.
            </Text>
            <Text style={styles.url} selectable>
              {shareUrl}
            </Text>
            <Pressable onPress={() => void copyLink()}>
              <Text style={styles.link}>{copied ? "Copied" : "Copy"}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Direct Email Invite</Text>
            <Text style={styles.cardHint}>
              Send a professional, clickable invitation directly to a
              colleague's inbox.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="colleague@nhs.net"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.btn, inviting && { opacity: 0.6 }]}
              onPress={() => void invite()}
              disabled={inviting}
            >
              <Text style={styles.btnText}>
                {inviting ? "Sending…" : "Send"}
              </Text>
            </Pressable>
            {inviteStatus === "success" ? (
              <Text style={styles.successMsg}>
                Invitation sent successfully
              </Text>
            ) : null}
            {inviteStatus === "error" ? (
              <Text style={styles.errorMsg}>
                Failed to send invitation. Please check your connection.
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Progress Tracking</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressCount}>{responses}</Text>
              <Text style={styles.metaInline}>Target: {required}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: isThresholdMet
                      ? colors.success
                      : colors.primary,
                  },
                ]}
              />
            </View>
            {isThresholdMet ? (
              <View style={[styles.statusBox, styles.statusOk]}>
                <Text style={[styles.statusTitle, { color: colors.success }]}>
                  Anonymity Threshold Met!
                </Text>
                <Text style={styles.statusBody}>
                  You have enough responses to safely view the aggregated data
                  without compromising colleague anonymity.
                </Text>
              </View>
            ) : (
              <View style={[styles.statusBox, styles.statusLocked]}>
                <Text style={styles.statusTitle}>Results are Locked</Text>
                <Text style={styles.statusBody}>
                  To protect the identity of your colleagues, results and
                  reports cannot be viewed until the minimum threshold of{" "}
                  {required} responses is reached.
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.heading}>Survey Preview & Configuration</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Core Questions</Text>
            <Text style={styles.cardHint}>
              The core questions are fixed to ensure GMC compliance.
            </Text>
            <View style={styles.standardBadge}>
              <Text style={styles.standardBadgeText}>
                Standardised Set Active
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Custom Questions</Text>
            <Text style={styles.cardHint}>
              Add up to 2 optional questions specific to your practice.
            </Text>
            {isClosed ? (
              <View style={styles.closedBox}>
                <Text style={styles.closedText}>
                  Cycle is closed. Questions cannot be edited.
                </Text>
              </View>
            ) : (
              <>
                {customQuestions.map((q, i) => (
                  <View key={`cq-${i}`} style={styles.questionRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={q}
                      onChangeText={(val) => updateCustomQuestion(i, val)}
                      onBlur={commitCustomQuestions}
                      placeholder="Optional question"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Pressable onPress={() => removeCustomQuestion(i)}>
                      <Text style={styles.danger}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
                {customQuestions.length < 2 ? (
                  <Pressable
                    style={styles.dashedBtn}
                    onPress={addCustomQuestion}
                  >
                    <Text style={styles.dashedBtnText}>Add Question</Text>
                  </Pressable>
                ) : null}
                {savingQs ? (
                  <Text style={styles.saving}>Saving…</Text>
                ) : null}
              </>
            )}
          </View>

          <Text style={styles.heading}>Results & Reflection</Text>

          {!isThresholdMet ? (
            <View style={[styles.card, styles.lockedCard]}>
              <Text style={styles.lockedTitle}>Results Locked</Text>
              <Text style={styles.cardHint}>
                To protect anonymity and ensure statistical validity, results
                are hidden until you close the cycle by reaching the
                {` ${required} `}
                response threshold.
              </Text>
            </View>
          ) : profileLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : !isPro ? (
            <View style={[styles.card, styles.upsellCard]}>
              <Text style={styles.cardHeading}>Unlock Your Colleague Feedback Report</Text>
              <Text style={styles.cardHint}>
                Your {responses} anonymous responses have been securely
                collated. Upgrade to Umbil Pro to unlock the AI
                interpretation, thematic analysis, and appraisal-ready
                exports.
              </Text>
              <Pressable
                style={styles.btn}
                onPress={() => router.push("/(app)/pro")}
              >
                <Text style={styles.btnText}>View Pro Plans</Text>
              </Pressable>
            </View>
          ) : analytics ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardHeading}>Appraisal-Ready Summary</Text>
                <Text style={styles.cardHint}>Paste into appraisal documentation</Text>
                {generatingAi && !executiveSummary ? (
                  <Text style={styles.cardHint}>Analysing colleague feedback into appraisal evidence…</Text>
                ) : (
                  <Text style={styles.summaryBody}>
                    {executiveSummary || "Generate an appraisal pack to create a copyable summary."}
                  </Text>
                )}
              </View>

              {(pack.strengths.length > 0 || pack.developmentThemes.length > 0 || generatingAi) ? (
                <View style={styles.themeRow}>
                  <View style={[styles.card, styles.themeCard]}>
                    <Text style={styles.themeHeadingGood}>Top Strengths</Text>
                    {pack.strengths.length > 0 ? (
                      pack.strengths.map((s, i) => (
                        <Text key={i} style={styles.themeBullet}>• {s}</Text>
                      ))
                    ) : (
                      <Text style={styles.cardHint}>{generatingAi ? "Extracting themes…" : "No themes yet."}</Text>
                    )}
                  </View>
                  <View style={[styles.card, styles.themeCard]}>
                    <Text style={styles.themeHeadingImprove}>Areas for Improvement</Text>
                    {pack.developmentThemes.length > 0 ? (
                      pack.developmentThemes.map((s, i) => (
                        <Text key={i} style={styles.themeBullet}>• {s}</Text>
                      ))
                    ) : (
                      <Text style={styles.cardHint}>{generatingAi ? "Extracting themes…" : "No themes yet."}</Text>
                    )}
                  </View>
                </View>
              ) : null}

              {pack.gmcMapping ? (
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>GMC Domain Mapping</Text>
                  <Text style={styles.themeBullet}>Domain 1: {pack.gmcMapping.domain1}</Text>
                  <Text style={styles.themeBullet}>Domain 2: {pack.gmcMapping.domain2}</Text>
                  <Text style={styles.themeBullet}>Domain 3: {pack.gmcMapping.domain3}</Text>
                  <Text style={styles.themeBullet}>Domain 4: {pack.gmcMapping.domain4}</Text>
                </View>
              ) : null}

              {pack.supportingEvidence.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>Supporting Evidence</Text>
                  {pack.supportingEvidence.map((s, i) => (
                    <Text key={i} style={styles.evidenceQuote}>“{s}”</Text>
                  ))}
                </View>
              ) : null}

              {pack.pdpSuggestions.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>Suggested PDP</Text>
                  {pack.pdpSuggestions.map((s, i) => (
                    <Text key={i} style={styles.themeBullet}>
                      <Text style={styles.pdpLabel}>{i === 0 ? "Must-do: " : i === 1 ? "Stretch: " : `${i + 1}. `}</Text>
                      {s.replace(/^(Must-do|Stretch):\s*/i, "")}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardHeading}>Overview</Text>
                <View style={styles.statRow}>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue}>{analytics.stats.totalResponses}</Text>
                    <Text style={styles.statLabel}>Colleagues</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={styles.statValue}>{analytics.stats.averageScore}</Text>
                    <Text style={styles.statLabel}>/ 5.0 Overall</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={[styles.statValue, styles.statValueText]} numberOfLines={2}>
                      {analytics.stats.topArea.replace(/^Domain\s*\d+:\s*/i, "")}
                    </Text>
                    <Text style={styles.statLabel}>Key strength</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeadingRow}>
                  <Text style={styles.cardHeading}>Breakdown by Domain</Text>
                  <Pressable
                    style={[styles.outlineBtnSm, exportingPdf && { opacity: 0.6 }]}
                    onPress={() => void exportPdf()}
                    disabled={exportingPdf}
                  >
                    <Text style={styles.outlineBtnSmText}>
                      {exportingPdf ? "Exporting…" : "Export PDF"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.cardHint}>
                  The dotted line marks the standard GMC target score (4.0).
                </Text>
                {analytics.breakdown.length > 0 ? (
                  <>
                    <DomainBarChart data={analytics.breakdown} width={chartWidth} />
                    <DomainLegend data={analytics.breakdown} />
                  </>
                ) : (
                  <Text style={styles.cardHint}>No data available yet.</Text>
                )}
              </View>

              {analytics.roleTypes.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>Respondent Roles</Text>
                  <CategoryBreakdown data={analytics.roleTypes} />
                </View>
              ) : null}

              {hasComments ? (
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>Colleague Comments</Text>
                  <Text style={styles.cardHint}>Displayed randomly to protect anonymity.</Text>

                  <Text style={styles.subLabel}>Greatest Strengths</Text>
                  {strengthsComments.length > 0 ? (
                    strengthsComments.map((fb, idx) => (
                      <View key={`str-${idx}`} style={styles.commentBlockGood}>
                        <Text style={styles.commentText}>"{fb.strengths}"</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyComment}>No comments in this category.</Text>
                  )}

                  <Text style={styles.subLabel}>Examples Provided</Text>
                  {exampleComments.length > 0 ? (
                    exampleComments.map((fb, idx) => (
                      <View key={`ex-${idx}`} style={styles.commentBlockGood}>
                        <Text style={styles.commentText}>"{fb.example}"</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyComment}>No comments in this category.</Text>
                  )}

                  <Text style={styles.subLabel}>Areas for Development</Text>
                  {improveComments.length > 0 ? (
                    improveComments.map((fb, idx) => (
                      <View key={`imp-${idx}`} style={styles.commentBlockImprove}>
                        <Text style={styles.commentText}>"{fb.improve}"</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyComment}>No comments in this category.</Text>
                  )}

                  <Text style={styles.subLabel}>Additional Comments</Text>
                  {additionalComments.length > 0 ? (
                    additionalComments.map((fb, idx) => (
                      <View key={`add-${idx}`} style={styles.commentBlockNeutral}>
                        <Text style={styles.commentText}>"{fb.additional}"</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyComment}>No comments in this category.</Text>
                  )}
                </View>
              ) : null}

              {analytics.customFeedback.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>Custom Questions Feedback</Text>
                  {analytics.customFeedback.map((cf, idx) => (
                    <View key={`${cf.question}-${idx}`} style={styles.feedbackBlock}>
                      <Text style={styles.feedbackQuestion}>Q: {cf.question}</Text>
                      {cf.answers.map((ans, i) => (
                        <Text key={i} style={styles.feedbackAnswer}>
                          "{ans}"
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardHeading}>Appraisal-Ready Reflection</Text>
                <Text style={styles.cardHint}>
                  Structured reflection for your portfolio. Tap Auto-Draft to regenerate the full appraisal pack.
                </Text>
                <Pressable
                  style={[styles.outlineBtnFull, generatingAi && { opacity: 0.6 }]}
                  onPress={() => void generateAiSummary(true)}
                  disabled={generatingAi}
                >
                  {generatingAi ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.outlineBtnFullText}>
                      {reflection ? "Regenerate Auto-Draft" : "Auto-Draft"}
                    </Text>
                  )}
                </Pressable>

                {generatingAi && !reflection ? (
                  <View style={styles.aiLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.cardHint}>
                      Umbil AI is drafting your appraisal pack…
                    </Text>
                  </View>
                ) : null}

                <TextInput
                  style={styles.reflectionInput}
                  multiline
                  textAlignVertical="top"
                  value={reflection}
                  onChangeText={setReflection}
                  placeholder="Tap Auto-Draft for What colleagues valued / Surprised / Continue / Improve / Measure / PDP…"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.reflectionActions}>
                  <Pressable onPress={() => void copyReflection()} disabled={!reflection}>
                    <Text style={[styles.link, !reflection && styles.disabledLink]}>
                      {copiedReflection ? "Copied" : "Copy Text"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.btn,
                      (savingLog || !reflection.trim()) && { opacity: 0.6 },
                    ]}
                    onPress={() => void handleSaveToLog()}
                    disabled={savingLog || !reflection.trim()}
                  >
                    <Text style={styles.btnText}>
                      {savingLog ? "Saving…" : "Save to Capture learning"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : null}

          <Pressable
            onPress={() => void Linking.openURL(`${origin}/msf/${id}`)}
          >
            <Text style={styles.link}>Open full results on web →</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
};

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.sm },
    empty: {
      padding: spacing.lg,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
    title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
    meta: {
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    metaInline: {
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginBottom: 0,
    },
    heading: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.text,
      marginTop: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      gap: 8,
    },
    cardHeading: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.text,
    },
    cardHeadingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm,
    },
    cardHint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    summaryBody: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    themeRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    themeCard: {
      flex: 1,
    },
    themeHeadingGood: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: "#059669",
      textTransform: "uppercase",
      marginBottom: 8,
    },
    themeHeadingImprove: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: "#d97706",
      textTransform: "uppercase",
      marginBottom: 8,
    },
    themeBullet: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
      marginBottom: 6,
    },
    evidenceQuote: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
      fontStyle: "italic",
      lineHeight: 18,
      marginBottom: 6,
      paddingLeft: 8,
      borderLeftWidth: 2,
      borderLeftColor: colors.primary,
    },
    pdpLabel: {
      fontFamily: fonts.bold,
      color: colors.primary,
    },
    label: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    subLabel: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.text,
      textTransform: "uppercase",
      marginTop: spacing.sm,
    },
    url: { color: colors.text, fontSize: 13, fontFamily: fonts.regular },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      padding: 12,
      color: colors.text,
      backgroundColor: colors.background,
      fontFamily: fonts.regular,
      // Web (RN Web) draws its own black focus ring on inputs; zero it out here
      // so the existing border-color focus affordance stays the only indicator.
      // No-op on native.
      outlineWidth: 0,
    },
    btn: {
      alignSelf: "flex-end",
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    btnText: { color: "#fff", fontFamily: fonts.bold },
    link: { color: colors.primary, fontFamily: fonts.bold },
    disabledLink: { opacity: 0.4 },
    danger: {
      color: colors.danger,
      fontFamily: fonts.semiBold,
      marginBottom: 8,
    },
    questionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    dashedBtn: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingVertical: 10,
      alignItems: "center",
    },
    dashedBtnText: {
      fontFamily: fonts.semiBold,
      color: colors.textMuted,
      fontSize: 13,
    },
    saving: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
    progressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    progressCount: {
      fontFamily: fonts.bold,
      fontSize: 36,
      color: colors.primary,
    },
    progressTrack: {
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 6 },
    statusBox: { borderRadius: radii.sm, padding: spacing.md },
    statusOk: { backgroundColor: colors.successMuted },
    statusLocked: { backgroundColor: "#fffbeb" },
    statusTitle: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: "#b45309",
      marginBottom: 4,
    },
    statusBody: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    standardBadge: {
      backgroundColor: colors.primaryMuted,
      borderRadius: radii.sm,
      padding: 10,
      alignSelf: "flex-start",
    },
    standardBadgeText: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.primary,
    },
    closedBox: {
      backgroundColor: colors.hoverBg,
      borderRadius: radii.sm,
      padding: spacing.md,
    },
    closedText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
    },
    successMsg: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.success,
    },
    errorMsg: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.danger,
    },
    lockedCard: {
      backgroundColor: "#fffbeb",
      borderColor: "#fde68a",
    },
    lockedTitle: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: "#b45309",
    },
    upsellCard: {
      alignItems: "flex-start",
    },
    statRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    statTile: {
      flex: 1,
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: radii.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: 6,
      gap: 4,
    },
    statValue: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.primary,
      textAlign: "center",
    },
    statValueText: {
      fontSize: 13,
      lineHeight: 17,
    },
    statLabel: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: "center",
    },
    outlineBtnSm: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    outlineBtnSmText: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.primary,
    },
    feedbackBlock: {
      backgroundColor: colors.background,
      borderRadius: radii.sm,
      padding: spacing.sm,
      gap: 6,
    },
    feedbackQuestion: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    feedbackAnswer: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
      fontStyle: "italic",
    },
    commentBlockGood: {
      backgroundColor: colors.successMuted,
      borderRadius: radii.sm,
      padding: spacing.sm,
      marginTop: 6,
    },
    commentBlockImprove: {
      backgroundColor: "#fffbeb",
      borderRadius: radii.sm,
      padding: spacing.sm,
      marginTop: 6,
    },
    commentBlockNeutral: {
      backgroundColor: colors.background,
      borderRadius: radii.sm,
      padding: spacing.sm,
      marginTop: 6,
    },
    commentText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
      fontStyle: "italic",
    },
    emptyComment: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: "italic",
      marginTop: 6,
    },
    outlineBtnFull: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radii.sm,
      paddingVertical: 10,
      alignItems: "center",
    },
    outlineBtnFullText: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.primary,
    },
    aiLoading: {
      alignItems: "center",
      gap: 8,
      paddingVertical: spacing.md,
    },
    reflectionInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      padding: 12,
      minHeight: 160,
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
      outlineWidth: 0,
    },
    reflectionActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
  });

export default MsfDetailScreen;
