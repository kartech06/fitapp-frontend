import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMe, updateUser, updateProfile } from '../../shared/api/user.api';
import { useTheme } from '../../shared/hooks/useTheme';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { ACTIVITY_LABELS, DIET_LABELS, type ActivityLevel, type DietPreference } from '../../shared/constants';

const ACTIVITIES = Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][];
const DIETS = Object.entries(DIET_LABELS) as [DietPreference, string][];

export function EditProfileScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: me, isLoading: isFetching } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('SEDENTARY');
  const [diet, setDiet] = useState<DietPreference | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) {
      setName(me.name || '');
      setHeightCm(me.profile?.heightCm?.toString() || '');
      setWeightKg(me.profile?.weightKg?.toString() || '');
      setActivity(me.profile?.activityLevel || 'SEDENTARY');
      setDiet(me.profile?.dietPreference || null);
    }
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!heightCm || !weightKg) throw new Error('Height and weight are required');
      await updateUser({ name: name.trim() || undefined });
      await updateProfile({
        heightCm: parseInt(heightCm, 10),
        weightKg: parseFloat(weightKg),
        activityLevel: activity,
        dietPreference: diet!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err.message || 'Failed to update profile');
    },
  });

  if (isFetching || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.md }]}>Edit Profile</Text>
        </View>

        {error && (
          <View style={{ backgroundColor: colors.error + '20', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }}>
            <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <Card style={{ marginBottom: spacing.md }}>
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Height (cm)"
            placeholder="e.g. 175"
            keyboardType="number-pad"
            value={heightCm}
            onChangeText={setHeightCm}
            style={{ marginTop: spacing.md }}
          />
          <Input
            label="Weight (kg)"
            placeholder="e.g. 70.5"
            keyboardType="decimal-pad"
            value={weightKg}
            onChangeText={setWeightKg}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        <Text style={[typography.label, { color: colors.textDim, marginTop: spacing.md, marginBottom: spacing.sm }]}>
          ACTIVITY LEVEL
        </Text>
        <Card style={{ padding: 0, marginBottom: spacing.md }}>
          {ACTIVITIES.map(([val, label], idx) => {
            const isSelected = activity === val;
            return (
              <TouchableOpacity
                key={val}
                onPress={() => setActivity(val)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderBottomWidth: idx < ACTIVITIES.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? colors.primary : colors.textDim}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={[typography.body, { color: isSelected ? colors.text : colors.textDim }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        <Text style={[typography.label, { color: colors.textDim, marginTop: spacing.sm, marginBottom: spacing.sm }]}>
          DIET PREFERENCE
        </Text>
        <Card style={{ padding: 0, marginBottom: spacing.lg }}>
          {DIETS.map(([val, label], idx) => {
            const isSelected = diet === val;
            return (
              <TouchableOpacity
                key={val}
                onPress={() => setDiet(val)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderBottomWidth: idx < DIETS.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? colors.primary : colors.textDim}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={[typography.body, { color: isSelected ? colors.text : colors.textDim }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        <Button
          title="Save Profile"
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={saveMutation.isPending || !heightCm || !weightKg || !diet}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
