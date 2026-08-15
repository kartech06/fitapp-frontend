import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../../shared/hooks/useTheme';
import { usePlan } from '../../shared/hooks/usePlan';
import { useAuthStore } from '../../shared/store/authStore';
import { useOnboardingStore } from '../../shared/store/onboardingStore';
import { Button } from '../../shared/components/Button';
import { AIPanel } from '../../shared/components/AIPanel';
import { analyzeBodyPhoto, getLatestBodyAnalysis, type BodyAnalysisRecord } from '../../shared/api/body-analysis.api';

export function BodyAnalysisScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { isFree } = usePlan();

  const photoType = route.params?.photoType;
  if (!photoType) {
    throw new Error('BodyAnalysisScreen requires a photoType route param (ONBOARDING or PROGRESS)');
  }
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BodyAnalysisRecord | null>(null);

  // Check if free user has already used their 1 lifetime scan
  const { data: latestAnalysis, isLoading: checkingLimit } = useQuery({
    queryKey: ['bodyAnalysis', 'latest'],
    queryFn: getLatestBodyAnalysis,
    enabled: isFree,
  });

  const hasReachedFreeLimit = isFree && !!latestAnalysis;

  const analyzeMutation = useMutation({
    mutationFn: (uri: string) => analyzeBodyPhoto(uri, photoType),
    onSuccess: (data) => {
      setAnalysisResult(data);
      queryClient.invalidateQueries({ queryKey: ['bodyAnalysis'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Could not analyze photo. Please try another one.';
      if (err?.response?.status === 403) {
        // We'll let the UI handle the 403 by refetching or relying on hasReachedFreeLimit
        // But since we pre-check, they shouldn't hit this unless they do it on two devices.
        Alert.alert('Limit Reached', 'You have reached your limit for body analysis.');
      } else {
        Alert.alert('Analysis Failed', message);
      }
      setImageUri(null); // Reset so they can pick another
    },
  });

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleFinish = () => {
    if (photoType === 'ONBOARDING') {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      useAuthStore.getState().setOnboarded(true);
      useOnboardingStore.getState().reset();
    } else {
      navigation.goBack();
    }
  };

  const renderUpsell = () => (
    <View
      style={[
        styles.upsell,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginTop: spacing.sm,
          marginBottom: spacing.xl,
        },
      ]}
    >
      <Ionicons name="sparkles" size={20} color={colors.secondary} />
      <Text
        style={[
          typo.bodySmall,
          { color: colors.textDim, marginLeft: spacing.sm, flex: 1 },
        ]}
      >
        Upgrade to Basic to unlock unlimited AI body analysis, personalized workout plans, diet plans, meal recognition, and more.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[typo.h2, { color: colors.text, flex: 1, marginBottom: spacing.md, marginTop: spacing.md }]}>
            Body Analysis
          </Text>
          {photoType === 'PROGRESS' && (
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {checkingLimit ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : analyzeMutation.isPending ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[typo.body, { color: colors.textDim, marginTop: spacing.lg }]}>
              Analyzing your physique...
            </Text>
          </View>
        ) : analysisResult ? (
          <View>
            <AIPanel label="AI Analysis" style={{ marginBottom: spacing.md }}>
              <View style={[styles.resultRow, { marginBottom: spacing.ms }]}>
                <Text style={[typo.label, { color: colors.aiText }]}>Body Fat</Text>
                <Text style={[typo.body, { color: colors.text }]}>
                  {analysisResult.analysisResult.estimatedBodyFatPct}%
                </Text>
              </View>

              <View style={[styles.resultRow, { marginBottom: spacing.ms }]}>
                <Text style={[typo.label, { color: colors.aiText }]}>Muscle Mass</Text>
                <Text style={[typo.body, { color: colors.text }]}>
                  {analysisResult.analysisResult.estimatedMuscleMassPct}%
                </Text>
              </View>

              <View style={[styles.resultRow, { marginBottom: spacing.ms }]}>
                <Text style={[typo.label, { color: colors.aiText }]}>Physique Type</Text>
                <Text style={[typo.body, { color: colors.text, textTransform: 'capitalize' }]}>
                  {analysisResult.analysisResult.physiqueType.replace('_', ' ').toLowerCase()}
                </Text>
              </View>

              <View style={[styles.resultRow, { marginBottom: spacing.md }]}>
                <Text style={[typo.label, { color: colors.aiText }]}>Fitness Level</Text>
                <Text style={[typo.body, { color: colors.text, textTransform: 'capitalize' }]}>
                  {analysisResult.analysisResult.estimatedFitnessLevel.toLowerCase()}
                </Text>
              </View>

              <Text style={[typo.label, { color: colors.aiText, marginBottom: spacing.xs }]}>
                Primary Focus Areas
              </Text>
              <View style={[styles.chipRow, { marginBottom: spacing.md }]}>
                {analysisResult.analysisResult.primaryFocusAreas.map((area, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: colors.surface2,
                      borderRadius: borderRadius.md,
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      marginRight: spacing.xs,
                      marginBottom: spacing.xs,
                    }}
                  >
                    <Text style={[typo.caption, { color: colors.text }]}>{area}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.resultRow, { marginBottom: spacing.ms, flexDirection: 'column' }]}>
                <Text style={[typo.label, { color: colors.aiText, marginBottom: spacing.xs }]}>Recommended Goal</Text>
                <Text style={[typo.body, { color: colors.text }]}>
                  {analysisResult.analysisResult.recommendedGoal}
                </Text>
              </View>
              
              <View style={[styles.resultRow, { flexDirection: 'column' }]}>
                <Text style={[typo.label, { color: colors.aiText, marginBottom: spacing.xs }]}>Notes</Text>
                <Text style={[typo.body, { color: colors.text }]}>
                  {analysisResult.analysisResult.notes}
                </Text>
              </View>
            </AIPanel>

            <Text style={[typo.caption, { color: colors.textDim, marginBottom: spacing.xl, textAlign: 'center' }]}>
              {analysisResult.disclaimer}
            </Text>

            <Button title="Continue" onPress={handleFinish} />
          </View>
        ) : (
          <View>
            <Text style={[typo.body, { color: colors.text, marginBottom: spacing.xl }]}>
              Get a more accurate plan — analyze your physique in seconds
            </Text>

            <View style={{ flexDirection: 'row', marginBottom: spacing.xl, alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={[typo.bodySmall, { color: colors.textDim, flex: 1 }]}>
                For the most accurate results, wear form-fitting clothing (like gym wear) rather than loose or layered clothing, and stand in good, even lighting.
              </Text>
            </View>

            {hasReachedFreeLimit ? (
              <View>
                {renderUpsell()}
                {photoType === 'ONBOARDING' && (
                  <Button title="Skip for now" onPress={handleFinish} variant="outline" />
                )}
              </View>
            ) : !imageUri ? (
              <View>
                <Button title="Choose Photo" onPress={pickImage} />
                <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.md, marginBottom: spacing.xl, textAlign: 'center' }]}>
                  Your photo is analyzed by AI and stored securely. You can delete it anytime.
                </Text>
                {photoType === 'ONBOARDING' && (
                  <Button title="Skip for now" onPress={handleFinish} variant="outline" />
                )}
              </View>
            ) : (
              <View>
                <Image source={{ uri: imageUri }} style={[styles.previewImage, { borderRadius: borderRadius.lg }]} />
                <Button title="Analyze" onPress={() => analyzeMutation.mutate(imageUri)} loading={analyzeMutation.isPending} />
                <View style={{ height: spacing.sm }} />
                <Button title="Choose Different Photo" onPress={pickImage} variant="outline" disabled={analyzeMutation.isPending} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upsell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
    marginBottom: 24,
  },
});
