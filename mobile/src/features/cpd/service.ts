import { supabase } from '@/lib/supabase';

export type CpdEntry = {
  id: string;
  timestamp: string;
  question: string;
  answer: string;
  reflection: string | null;
  tags: string[] | null;
  duration: number | null;
};

const FREE_MONTHLY_LIMIT = 10;

export async function listCpdEntries(): Promise<CpdEntry[]> {
  const { data, error } = await supabase
    .from('cpd_entries')
    .select('id,timestamp,question,answer,reflection,tags,duration')
    .order('timestamp', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CpdEntry[];
}

async function trackFreeCpdUsage(userId: string): Promise<void> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_pro,subscription_status')
    .eq('id', userId)
    .single();

  if (profileError) throw new Error(profileError.message);
  if (profile?.is_pro || profile?.subscription_status === 'active') return;

  const { data: usage, error: usageError } = await supabase
    .from('usage_tracking')
    .select('usage_count,last_reset_date')
    .eq('user_id', userId)
    .eq('feature', 'cpd')
    .maybeSingle();

  if (usageError) throw new Error(usageError.message);

  const now = new Date();
  const lastReset = usage?.last_reset_date
    ? new Date(usage.last_reset_date)
    : new Date(0);
  const isNewMonth =
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear();
  const currentCount = isNewMonth ? 0 : Number(usage?.usage_count ?? 0);

  if (currentCount >= FREE_MONTHLY_LIMIT) {
    throw new Error('You have reached the free monthly learning-log limit.');
  }

  const { error: upsertError } = await supabase.from('usage_tracking').upsert(
    {
      user_id: userId,
      feature: 'cpd',
      usage_count: currentCount + 1,
      last_reset_date: isNewMonth
        ? now.toISOString()
        : lastReset.toISOString(),
    },
    { onConflict: 'user_id,feature' },
  );

  if (upsertError) throw new Error(upsertError.message);
}

export async function saveCpdEntry(input: {
  question: string;
  answer: string;
}): Promise<CpdEntry> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('Please sign in again.');

  await trackFreeCpdUsage(user.id);

  const { data, error } = await supabase
    .from('cpd_entries')
    .insert({
      user_id: user.id,
      timestamp: new Date().toISOString(),
      question: input.question,
      answer: input.answer,
      reflection: null,
      tags: [],
      duration: 10,
    })
    .select('id,timestamp,question,answer,reflection,tags,duration')
    .single();

  if (error) throw new Error(error.message);
  return data as CpdEntry;
}

export async function deleteCpdEntry(id: string): Promise<void> {
  const { error } = await supabase.from('cpd_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
