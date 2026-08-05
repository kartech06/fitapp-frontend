import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { getMe } from '../../shared/api/user.api';
import { useTheme } from '../../shared/hooks/useTheme';
import { OnboardingFlow } from '../auth/OnboardingScreen';
import type { OnboardingData } from '../../shared/store/onboardingStore';
import type { Gender } from '../../shared/constants';

export function EditGoalsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  if (isLoading || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initialData: Partial<OnboardingData> = {
    gender: (me.gender || 'MALE') as Gender,
    dob: me.dob || '1995-01-01',
    heightCm: me.profile?.heightCm || 175,
    weightKg: me.profile?.weightKg || 70,
    activityLevel: me.profile?.activityLevel || 'MODERATELY_ACTIVE',
    goalType: me.goal?.goalType || 'FITNESS',
    dietPreference: me.profile?.dietPreference || null,
    timelineWeeks: me.goal?.timelineWeeks || 12,
  };

  const handleFinish = () => {
    // Invalidate so Profile and Dashboard fetch fresh data
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    navigation.goBack();
  };

  return (
    <OnboardingFlow
      isEditMode={true}
      initialData={initialData}
      onFinish={handleFinish}
      onCancel={() => navigation.goBack()}
    />
  );
}
