// mobile/src/app/(tabs)/learning.tsx

import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Button, Card, LoadingView, Pill } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import {
  deleteCpdEntry,
  listCpdEntries,
  type CpdEntry,
} from '@/features/cpd/service';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function LearningScreen() {
  const [entries, setEntries] = useState<CpdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await listCpdEntries();
      setEntries(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load learning.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const performDelete = useCallback(async (entry: CpdEntry) => {
    setDeletingId(entry.id);
    setError(null);

    try {
      await deleteCpdEntry(entry.id);

      setEntries((current) =>
        current.filter((item) => item.id !== entry.id),
      );
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Please try again.';

      setError(`Could not delete entry: ${message}`);

      if (Platform.OS !== 'web') {
        Alert.alert('Could not delete entry', message);
      }
    } finally {
      setDeletingId(null);
    }
  }, []);

  const confirmDelete = useCallback(
    (entry: CpdEntry) => {
      const message =
        'This permanently removes the entry from your Umbil account.';

      if (Platform.OS === 'web') {
        const confirmed =
          typeof window !== 'undefined' &&
          window.confirm(`Delete learning entry?\n\n${message}`);

        if (confirmed) {
          void performDelete(entry);
        }

        return;
      }

      Alert.alert('Delete learning entry?', message, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void performDelete(entry);
          },
        },
      ]);
    },
    [performDelete],
  );

  if (loading) {
    return <LoadingView label="Loading your learning…" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text style={styles.title}>Learning Log</Text>

            <Text style={styles.subtitle}>
              Clinical learning saved from your Umbil conversations.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>
              No learning entries yet
            </Text>

            <Text style={styles.emptyText}>
              Ask Umbil a clinical question, then tap “Save to Learning
              Log” beneath the answer.
            </Text>
          </Card>
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={colors.teal}
          />
        }
        renderItem={({ item }) => {
          const isDeleting = deletingId === item.id;

          return (
            <Card style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.date}>
                  {formatDate(item.timestamp)}
                </Text>

                <Pill
                  label={`${item.duration ?? 10} min`}
                  tone="muted"
                />
              </View>

              <Text style={styles.question}>{item.question}</Text>

              <Text numberOfLines={6} style={styles.answer}>
                {item.answer}
              </Text>

              {item.reflection ? (
                <View style={styles.reflection}>
                  <Text style={styles.reflectionLabel}>
                    Reflection
                  </Text>

                  <Text style={styles.reflectionText}>
                    {item.reflection}
                  </Text>
                </View>
              ) : null}

              <Button
                label={isDeleting ? 'Deleting…' : 'Delete entry'}
                loading={isDeleting}
                disabled={deletingId !== null}
                onPress={() => confirmDelete(item)}
                variant="ghost"
              />
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  entry: {
    gap: spacing.md,
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  question: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  answer: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  reflection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  reflectionLabel: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: '800',
  },
  reflectionText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});