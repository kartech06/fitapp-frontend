import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Switch } from 'react-native-paper';

import { useTheme } from '../../shared/hooks/useTheme';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { useThemeStore } from '../../shared/store/themeStore';
import { useAuthStore } from '../../shared/store/authStore';
import { usePlan } from '../../shared/hooks/usePlan';
import { getMe } from '../../shared/api/user.api';
import { getLatestBodyAnalysis } from '../../shared/api/body-analysis.api';
import { GOAL_LABELS, ACTIVITY_LABELS, DIET_LABELS } from '../../shared/constants';
import { formatCalories } from '../../shared/utils/format';

export function ProfileScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const toggleTheme = useThemeStore((s) => s.toggle);
  const isDark = useThemeStore((s) => s.isDark);
  const { plan: storePlan, isFree } = usePlan();
  const [notifications, setNotifications] = useState(true);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: latestAnalysis } = useQuery({
    queryKey: ['bodyAnalysis', 'latest'],
    queryFn: getLatestBodyAnalysis,
  });

  const user = me || useAuthStore.getState().user;
  const currentPlan = me?.subscription?.plan || storePlan;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => useAuthStore.getState().clearAuth(),
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xxl,
      }}
    >
      <Text style={[typo.h2, { color: colors.text, marginBottom: spacing.lg }]}>
        Profile
      </Text>

      {/* User Info & Badge */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[typo.h2, { color: colors.textOnPrimary }]}>
              {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
            </Text>
          </View>
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={[typo.h3, { color: colors.text }]}>{user?.name || 'Fitness Enthusiast'}</Text>
            <Text style={[typo.bodySmall, { color: colors.textDim }]}>
              {user?.email || 'user@fitapp.com'}
            </Text>
          </View>
          <Badge variant={{ type: 'plan', plan: currentPlan }} />
        </View>
      </Card>

      {/* 1. My Goals */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>
        1. MY GOALS
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('EditGoals')} activeOpacity={0.7}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.sm }]}>
            <View style={styles.row}>
              <Ionicons name="trophy" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={[typo.h3, { color: colors.text }]}>
                {me?.goal?.goalType ? GOAL_LABELS[me.goal.goalType] : 'Goal Not Set'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View>
              <Text style={[typo.caption, { color: colors.textDim }]}>Target</Text>
              <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>
                {me?.goal?.calorieGoal ? `${formatCalories(me.goal.calorieGoal)} kcal` : 'N/A'}
              </Text>
            </View>
            <View>
              <Text style={[typo.caption, { color: colors.textDim }]}>TDEE</Text>
              <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>
                {me?.goal?.tdee ? `${formatCalories(me.goal.tdee)} kcal` : 'N/A'}
              </Text>
            </View>
            <View>
              <Text style={[typo.caption, { color: colors.textDim }]}>BMI</Text>
              <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>
                {me?.goal?.bmi ? me.goal.bmi.toFixed(1) : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* 2. Progress Photos */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>
        2. PROGRESS PHOTOS
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('ProgressHistory')} activeOpacity={0.7}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={styles.row}>
              <Ionicons name="camera" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={[typo.h3, { color: colors.text }]}>Body Analysis</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
          </View>
          {latestAnalysis ? (
            <View style={{ marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={[typo.caption, { color: colors.textDim }]}>Last checked</Text>
              <Text style={[typo.bodySmall, { color: colors.text, fontWeight: '600' }]}>
                {new Date(latestAnalysis.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={[typo.bodySmall, { color: colors.textDim }]}>
                Get your first analysis
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>

      {/* 3. Body Metrics */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>
        3. BODY METRICS
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.sm }]}>
            <View style={styles.row}>
              <Ionicons name="body" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={[typo.h3, { color: colors.text }]}>Physical Stats</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View>
              <Text style={[typo.caption, { color: colors.textDim }]}>Weight</Text>
              <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>
                {me?.profile?.weightKg ? `${me.profile.weightKg} kg` : 'N/A'}
              </Text>
            </View>
            <View>
              <Text style={[typo.caption, { color: colors.textDim }]}>Height</Text>
              <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>
                {me?.profile?.heightCm ? `${me.profile.heightCm} cm` : 'N/A'}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[typo.caption, { color: colors.textDim }]}>Activity</Text>
              <Text style={[typo.bodySmall, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                {me?.profile?.activityLevel ? ACTIVITY_LABELS[me.profile.activityLevel] : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* 4. Preferences */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>
        4. PREFERENCES
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <TouchableOpacity style={[styles.row, { paddingVertical: spacing.xs }]} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="restaurant" size={20} color={colors.textDim} style={{ marginRight: spacing.sm }} />
          <Text style={[typo.body, { color: colors.text, flex: 1 }]}>Diet Preference</Text>
          <Text style={[typo.bodySmall, { color: colors.textDim, marginRight: spacing.xs }]}>
            {me?.profile?.dietPreference ? DIET_LABELS[me.profile.dietPreference] : 'Any'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </TouchableOpacity>

        <View style={[styles.row, { paddingVertical: spacing.xs, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Ionicons name="notifications" size={20} color={colors.textDim} style={{ marginRight: spacing.sm }} />
          <Text style={[typo.body, { color: colors.text, flex: 1 }]}>Push Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            color={colors.primary}
          />
        </View>
      </Card>

      {/* 5. App Settings */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>
        5. APP SETTINGS
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={[styles.row, { paddingVertical: spacing.xs }]}>
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={20}
            color={colors.textDim}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={[typo.body, { color: colors.text, flex: 1 }]}>
            {isDark ? 'Dark Theme' : 'Light Theme'}
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            color={colors.primary}
          />
        </View>
      </Card>

      {/* 6. Subscription */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>
        6. SUBSCRIPTION
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('Subscription')} activeOpacity={0.7}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.sm }]}>
            <View style={styles.row}>
              <Ionicons name="star" size={20} color={currentPlan === 'BASIC' ? colors.primary : colors.textDim} style={{ marginRight: spacing.sm }} />
              <Text style={[typo.h3, { color: colors.text }]}>
                {currentPlan === 'BASIC' ? 'FitApp Basic Plan' : 'FitApp Free Plan'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
          </View>
          {currentPlan === 'FREE' ? (
            <View style={{ marginTop: spacing.xs }}>
              <Text style={[typo.bodySmall, { color: colors.textDim, marginBottom: spacing.md }]}>
                Upgrade to unlock AI Coaching and unlimited daily meal scans.
              </Text>
              <Button
                title="Upgrade to Basic — ₹499/mo"
                onPress={() => navigation.navigate('Subscription')}
                variant="primary"
              />
            </View>
          ) : (
            <Text style={[typo.bodySmall, { color: colors.textDim }]}>
              Your subscription is active. Enjoy unlimited AI coaching!
            </Text>
          )}
        </Card>
      </TouchableOpacity>

      {/* 7. Account */}
      <Text style={[typo.label, { color: colors.textDim, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>
        7. ACCOUNT
      </Text>
      <Card style={{ marginBottom: spacing.xxl }}>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} style={{ marginRight: spacing.sm }} />
          <Text style={[typo.body, { color: colors.error, fontWeight: '600' }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
