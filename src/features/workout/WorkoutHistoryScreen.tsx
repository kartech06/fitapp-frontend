/**
 * WorkoutHistoryScreen — Displays past workout logs grouped by date.
 *
 * Features:
 * - GET /workouts/history?days=30 (with toggle for 7, 30, 90 days)
 * - Date-grouped list of sessions with sets/reps/weight details
 * - Deletion capability via DELETE /workouts/:id with confirmation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import { Card } from '../../shared/components/Card';
import {
  getWorkoutHistory,
  deleteWorkoutLog,
  type WorkoutLog,
} from '../../shared/api/workout.api';

export function WorkoutHistoryScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [daysFilter, setDaysFilter] = useState<number>(30);

  const {
    data: historyLogs,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['workoutHistory', daysFilter],
    queryFn: () => getWorkoutHistory(daysFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkoutLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['workoutsToday'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkout'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to delete workout log.');
    },
  });

  const handleDelete = (id: string, exerciseName: string) => {
    Alert.alert(
      'Delete Log?',
      `Are you sure you want to remove ${exerciseName} from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  // Group logs by formatted date string
  const groupedLogs = React.useMemo(() => {
    if (!historyLogs || historyLogs.length === 0) return [];
    const map = new Map<string, WorkoutLog[]>();

    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    historyLogs.forEach((log) => {
      const d = new Date(log.loggedAt);
      const dStr = d.toDateString();
      let label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (dStr === todayStr) label = 'Today';
      else if (dStr === yesterdayStr) label = 'Yesterday';

      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(log);
    });

    return Array.from(map.entries()).map(([dateLabel, logs]) => ({
      dateLabel,
      logs,
      totalSets: logs.reduce((acc, l) => acc + l.sets, 0),
    }));
  }, [historyLogs]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Workout History"
        onBack={() => navigation.goBack()}
      />

      {/* Days Filter Pills */}
      <View style={[styles.filterRow, { paddingHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        {[7, 30, 90].map((days) => {
          const active = daysFilter === days;
          return (
            <TouchableOpacity
              key={days}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => setDaysFilter(days)}
            >
              <Text
                style={[
                  typo.buttonSmall,
                  { color: active ? '#000' : colors.text },
                ]}
              >
                Last {days} Days
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Loading workout history...
            </Text>
          </View>
        ) : groupedLogs.length === 0 ? (
          <Card style={{ padding: spacing.xl, alignItems: 'center', marginVertical: spacing.lg }}>
            <Ionicons name="calendar-outline" size={48} color={colors.primary} style={{ marginBottom: spacing.md }} />
            <Text style={[typo.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.xs }]}>
              No Workouts Found
            </Text>
            <Text style={[typo.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
              You haven't logged any sessions in the last {daysFilter} days. Start a workout to build your history! 🔥
            </Text>
          </Card>
        ) : (
          groupedLogs.map((group) => (
            <View key={group.dateLabel} style={{ marginBottom: spacing.lg }}>
              {/* Date Section Header */}
              <View style={styles.groupHeader}>
                <Text style={[typo.h3, { color: colors.text }]}>{group.dateLabel}</Text>
                <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.sm }]}>
                  <Text style={[typo.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
                    {group.logs.length} {group.logs.length === 1 ? 'Exercise' : 'Exercises'} • {group.totalSets} Sets
                  </Text>
                </View>
              </View>

              {/* Logs in this day */}
              {group.logs.map((log) => (
                <Card
                  key={log.id}
                  style={{
                    marginBottom: spacing.sm,
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={[typo.body, { color: colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                        {log.exerciseName}
                      </Text>
                      {log.workoutPlanId && (
                        <Ionicons name="sparkles" size={14} color="#A78BFA" style={{ marginLeft: 6 }} />
                      )}
                    </View>

                    <Text style={[typo.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                      {log.sets} sets × {log.reps} reps
                      {log.weightKg ? ` @ ${log.weightKg} kg` : ''}
                    </Text>

                    {log.durationMin && (
                      <Text style={[typo.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                        ⏱️ {log.durationMin} min duration
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(log.id, log.exerciseName)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ padding: 4 }}
                    disabled={deleteMutation.isPending}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
});
