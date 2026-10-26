import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { CORRECTION_PROMOTION_COUNT, MEMORY_FIELD_HINT } from "@umbil/shared";

import {
  addMyMemory,
  deleteMyMemory,
  dismissCountingSignal,
  listCountingSignals,
  listMyMemories,
  memorySourceLabel,
  updateMyMemory,
  type ClinicianMemory,
  type CountingSignal,
} from "@/lib/clinicianMemories";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const messageFrom = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

export const ClinicianMemoryList = () => {
  const { colors } = useTheme();
  const [memories, setMemories] = useState<ClinicianMemory[]>([]);
  const [signals, setSignals] = useState<CountingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, noticed] = await Promise.all([listMyMemories(), listCountingSignals()]);
      setMemories(rows);
      setSignals(noticed);
    } catch (loadError: unknown) {
      setError(messageFrom(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const addMemory = async () => {
    setBusyId("new");
    setError(null);
    try {
      const created = await addMyMemory(draft);
      setMemories((current) => [...current, created]);
      setDraft("");
    } catch (addError: unknown) {
      setError(messageFrom(addError));
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateMyMemory(id, editingBody);
      setMemories((current) => current.map((memory) => (memory.id === id ? updated : memory)));
      setEditingId(null);
      setEditingBody("");
    } catch (saveError: unknown) {
      setError(messageFrom(saveError));
    } finally {
      setBusyId(null);
    }
  };

  const removeMemory = (memory: ClinicianMemory) => {
    Alert.alert("Delete this memory?", "Umbil will stop using it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusyId(memory.id);
            setError(null);
            try {
              await deleteMyMemory(memory.id);
              setMemories((current) => current.filter((item) => item.id !== memory.id));
              if (editingId === memory.id) {
                setEditingId(null);
                setEditingBody("");
              }
            } catch (deleteError: unknown) {
              setError(messageFrom(deleteError));
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: 8 }}>
        What Umbil remembers
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 13,
          color: colors.textMuted,
          lineHeight: 18,
          marginBottom: 12,
        }}
      >
        {MEMORY_FIELD_HINT}
      </Text>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {signals.map((signal) => (
        <View key={signal.id} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.text, lineHeight: 20 }}>
            {signal.body} ({signal.count} of {CORRECTION_PROMOTION_COUNT})
          </Text>
          <Pressable
            onPress={() => {
              void dismissCountingSignal(signal.id)
                .then(() => setSignals((current) => current.filter((item) => item.id !== signal.id)))
                .catch((dismissError: unknown) => setError(messageFrom(dismissError)));
            }}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fonts.semiBold, marginTop: 4 }}>Dismiss</Text>
          </Pressable>
        </View>
      ))}

      {!loading && memories.length === 0 ? (
        <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 12 }}>
          Nothing saved yet. Add a preference below, or tell Umbil in chat.
        </Text>
      ) : null}

      {memories.map((memory) => {
        const editing = editingId === memory.id;
        const busy = busyId === memory.id;
        return (
          <View
            key={memory.id}
            style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 }}
          >
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
              {memorySourceLabel(memory.source)}
            </Text>
            {editing ? (
              <TextInput
                value={editingBody}
                onChangeText={setEditingBody}
                editable={!busy}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radii.sm,
                  padding: 10,
                  minHeight: 72,
                  color: colors.text,
                  fontFamily: fonts.regular,
                  textAlignVertical: "top",
                }}
              />
            ) : (
              <Text style={{ fontFamily: fonts.regular, color: colors.text, lineHeight: 20 }}>{memory.body}</Text>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {editing ? (
                <>
                  <Pressable
                    onPress={() => void saveEdit(memory.id)}
                    disabled={busy}
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: radii.sm,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", fontFamily: fonts.bold }}>{busy ? "Saving..." : "Save"}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingId(null);
                      setEditingBody("");
                    }}
                    disabled={busy}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radii.sm,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ color: colors.text, fontFamily: fonts.semiBold }}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      setEditingId(memory.id);
                      setEditingBody(memory.body);
                      setError(null);
                    }}
                    disabled={busyId !== null}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radii.sm,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ color: colors.text, fontFamily: fonts.semiBold }}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeMemory(memory)}
                    disabled={busy}
                    accessibilityLabel={`Delete memory: ${memory.body}`}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radii.sm,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ color: colors.danger, fontFamily: fonts.semiBold }}>
                      {busy ? "Deleting..." : "Delete"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        );
      })}

      <Text style={{ fontFamily: fonts.semiBold, color: colors.textMuted, marginTop: 8, marginBottom: 6 }}>
        Add a memory
      </Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="e.g. I prefer referral letters in short prose."
        placeholderTextColor={colors.textMuted}
        multiline
        editable={busyId !== "new"}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.sm,
          padding: 10,
          minHeight: 72,
          color: colors.text,
          fontFamily: fonts.regular,
          textAlignVertical: "top",
        }}
      />
      <Pressable
        onPress={() => void addMemory()}
        disabled={busyId === "new" || !draft.trim()}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radii.sm,
          paddingVertical: 12,
          alignItems: "center",
          marginTop: 10,
          opacity: busyId === "new" || !draft.trim() ? 0.6 : 1,
        }}
      >
        {busyId === "new" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontFamily: fonts.bold }}>Add memory</Text>
        )}
      </Pressable>
      {error ? (
        <Text style={{ color: colors.danger, fontFamily: fonts.regular, marginTop: 12 }}>{error}</Text>
      ) : null}
    </View>
  );
};
