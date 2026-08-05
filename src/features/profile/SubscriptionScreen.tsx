import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMe } from '../../shared/api/user.api';
import { useTheme } from '../../shared/hooks/useTheme';
import { usePlan } from '../../shared/hooks/usePlan';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';

const FEATURES = [
  { name: 'AI Coach Chat', free: 'Locked 🔒', basic: 'Unlimited ✦' },
  { name: 'Photo Meal Recognition', free: '3 / day', basic: 'Unlimited' },
  { name: 'Natural Language Meal Log', free: '5 / day', basic: 'Unlimited' },
  { name: 'Workout & Diet Plans', free: 'Static AI Plan', basic: 'Dynamic Recalculations' },
  { name: 'Progress Insights & Charts', free: '7-Day History', basic: 'All-Time History' },
];

export function SubscriptionScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation();
  const { plan, isFree } = usePlan();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const currentPlan = me?.subscription?.plan || plan;

  const handleUpgrade = () => {
    Alert.alert(
      'Coming Soon 🚀',
      'Razorpay payment gateway integration will be live shortly. Stay tuned to unlock unlimited AI coaching!'
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.md }]}>Subscription</Text>
        </View>

        {/* Current Plan Banner */}
        <Card style={{ marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={[typography.label, { color: colors.textDim, marginBottom: spacing.xs }]}>YOUR CURRENT PLAN</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={[typography.h2, { color: colors.text, marginRight: spacing.sm }]}>
              {currentPlan === 'BASIC' ? 'FitApp Basic' : 'FitApp Free'}
            </Text>
            <Badge variant={{ type: 'plan', plan: currentPlan }} />
          </View>
          <Text style={[typography.bodySmall, { color: colors.textDim, textAlign: 'center' }]}>
            {currentPlan === 'BASIC'
              ? 'You have unlimited access to all AI Coach features & logging tools.'
              : 'Upgrade to Basic to unlock AI Coaching and unlimited daily meal logs.'}
          </Text>
        </Card>

        {/* Comparison Table */}
        <Text style={[typography.label, { color: colors.textDim, marginBottom: spacing.sm }]}>PLAN COMPARISON</Text>
        <Card style={{ padding: 0, marginBottom: spacing.lg }}>
          {/* Table Header */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surface2,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderTopLeftRadius: borderRadius.lg,
              borderTopRightRadius: borderRadius.lg,
            }}
          >
            <Text style={[typography.label, { color: colors.textDim, flex: 2 }]}>FEATURE</Text>
            <Text style={[typography.label, { color: colors.textDim, flex: 1, textAlign: 'center' }]}>FREE</Text>
            <Text style={[typography.label, { color: colors.primary, flex: 1, textAlign: 'center' }]}>BASIC</Text>
          </View>

          {/* Table Rows */}
          {FEATURES.map((f, idx) => (
            <View
              key={f.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderBottomWidth: idx < FEATURES.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={[typography.bodySmall, { color: colors.text, flex: 2, fontWeight: '500' }]}>{f.name}</Text>
              <Text style={[typography.caption, { color: colors.textDim, flex: 1, textAlign: 'center' }]}>{f.free}</Text>
              <Text style={[typography.caption, { color: colors.text, flex: 1, textAlign: 'center', fontWeight: '600' }]}>{f.basic}</Text>
            </View>
          ))}
        </Card>

        {/* Upgrade Button */}
        {isFree ? (
          <Button
            title="Upgrade to Basic — ₹499 / month"
            onPress={handleUpgrade}
            variant="primary"
          />
        ) : (
          <Button
            title="Current Plan: Active"
            onPress={() => {}}
            disabled={true}
          />
        )}
      </ScrollView>
    </View>
  );
}
