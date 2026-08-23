/**
 * PhotoLogSheet — Photo recognition meal logging (BASIC only, 5 lifetime free for FREE).
 *
 * Flow:
 * 1. Pick image from camera or gallery (expo-image-picker)
 * 2. Upload → POST /meal-recognition/analyze (multipart)
 * 3. Show recognized items: high_confidence auto-selected, needs_confirmation selectable
 * 4. User picks serving sizes → POST /meal-recognition/confirm
 * 5. Invalidate dashboard + nutrition queries
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import {
  analyzePhoto,
  confirmPhotoMeal,
  type PhotoAnalysisResponse,
  type RecognizedItem,
} from '../../shared/api/nutrition.api';
import { formatCalories } from '../../shared/utils/format';
import { MEAL_LABELS, type MealType } from '../../shared/constants';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast' },
  { key: 'LUNCH', label: 'Lunch' },
  { key: 'DINNER', label: 'Dinner' },
  { key: 'SNACK', label: 'Snack' },
];

export function PhotoLogSheet({ visible, onClose }: Props) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResponse | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [confirmed, setConfirmed] = useState(false);

  const handleClose = useCallback(() => {
    setImageUri(null);
    setAnalysisResult(null);
    setSelectedItems(new Set());
    setMealType('LUNCH');
    setConfirmed(false);
    onClose();
  }, [onClose]);

  // Image picker
  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed to scan food.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Gallery permission is needed to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('📷 Image picker error:', err);
      Alert.alert('Error', 'Could not open image picker.');
    }
  }, []);

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: () => {
      if (!imageUri) throw new Error('No image selected');
      return analyzePhoto(imageUri);
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      // Auto-select high confidence items
      const autoSelected = new Set(
        data.items
          .filter((item) => item.category === 'high_confidence')
          .map((item) => item.id),
      );
      setSelectedItems(autoSelected);
    },
    onError: (err: Error) => {
      Alert.alert('Analysis Failed', err.message || 'Could not analyze the photo. Try again.');
    },
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!analysisResult) throw new Error('No analysis result');
      const confirmedItems = analysisResult.items
        .filter((item) => selectedItems.has(item.id))
        .map((item) => ({
          itemId: item.id,
          servingSize: item.suggestedServingSize,
          servingUnit: item.suggestedServingUnit,
        }));
      return confirmPhotoMeal({
        sessionId: analysisResult.sessionId,
        mealType,
        confirmedItems,
      });
    },
    onSuccess: () => {
      setConfirmed(true);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['mealsToday'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionToday'] });
    },
    onError: (err: Error) => {
      Alert.alert('Confirmation Failed', err.message || 'Could not log the meal.');
    },
  });

  const toggleItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalCalories = analysisResult
    ? analysisResult.items
      .filter((item) => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.calories, 0)
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
        {/* Header */}
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, marginRight: spacing.sm }}>📷</Text>
            <Text style={[typo.h2, { color: colors.text }]}>Scan Food</Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Pick an image */}
          {!imageUri && !analysisResult && (
            <>
              <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.lg }]}>
                Take a photo of your meal or pick one from your gallery. Our AI will identify the food and estimate calories.
              </Text>

              <TouchableOpacity
                onPress={() => pickImage('camera')}
                style={[
                  styles.imagePickerButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.lg,
                    paddingVertical: spacing.xl,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Ionicons name="camera" size={40} color={colors.textOnPrimary} />
                <Text style={[typo.buttonLarge, { color: colors.textOnPrimary, marginTop: spacing.sm }]}>
                  Take a Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickImage('gallery')}
                style={[
                  styles.imagePickerButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: borderRadius.lg,
                    paddingVertical: spacing.xl,
                  },
                ]}
              >
                <Ionicons name="images" size={40} color={colors.primary} />
                <Text style={[typo.buttonLarge, { color: colors.text, marginTop: spacing.sm }]}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Image preview + Analyze */}
          {imageUri && !analysisResult && (
            <>
              <View
                style={[
                  styles.imagePreview,
                  {
                    borderRadius: borderRadius.lg,
                    overflow: 'hidden',
                    marginTop: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: 250, borderRadius: borderRadius.lg }}
                  resizeMode="cover"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setImageUri(null)}
                  style={[
                    styles.retakeButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      paddingVertical: spacing.ms,
                      flex: 1,
                    },
                  ]}
                >
                  <Ionicons name="refresh" size={20} color={colors.text} />
                  <Text style={[typo.buttonSmall, { color: colors.text, marginLeft: spacing.xs }]}>
                    Retake
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                  style={[
                    styles.analyzeButton,
                    {
                      backgroundColor: analyzeMutation.isPending ? colors.primaryDark : colors.primary,
                      borderRadius: borderRadius.md,
                      paddingVertical: spacing.ms,
                      flex: 2,
                    },
                  ]}
                >
                  {analyzeMutation.isPending ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator color={colors.textOnPrimary} size="small" style={{ marginRight: spacing.sm }} />
                      <Text style={[typo.buttonSmall, { color: colors.textOnPrimary }]}>Analyzing...</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={20} color={colors.textOnPrimary} />
                      <Text style={[typo.buttonSmall, { color: colors.textOnPrimary, marginLeft: spacing.xs }]}>
                        Analyze Photo
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3: Results */}
          {analysisResult && !confirmed && (
            <>
              {/* Meal type selector */}
              <Text style={[typo.label, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm }]}>
                MEAL TYPE
              </Text>
              <View style={styles.chipRow}>
                {MEAL_TYPES.map((mt) => {
                  const isActive = mealType === mt.key;
                  return (
                    <TouchableOpacity
                      key={mt.key}
                      onPress={() => setMealType(mt.key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isActive ? colors.primary : colors.surface,
                          borderColor: isActive ? colors.primary : colors.border,
                          borderRadius: borderRadius.full,
                        },
                      ]}
                    >
                      <Text style={[typo.buttonSmall, { color: isActive ? colors.textOnPrimary : colors.text }]}>
                        {mt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[typo.label, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                DETECTED FOODS — tap to select/deselect
              </Text>

              {analysisResult.items.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const isUncertain = item.category === 'needs_confirmation' || item.usedDefaultConversion;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    style={[
                      styles.recognizedItem,
                      {
                        backgroundColor: isSelected ? colors.primary + '12' : colors.surface,
                        borderColor: isSelected ? colors.primary : isUncertain ? colors.warning : colors.border,
                        borderWidth: 1,
                        borderRadius: borderRadius.md,
                        padding: spacing.ms,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? colors.primary : colors.textSecondary}
                        style={{ marginRight: spacing.sm }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[typo.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                            {item.name}
                          </Text>
                          {isUncertain && (
                            <View
                              style={[
                                styles.confBadge,
                                {
                                  backgroundColor: colors.warning + '22',
                                  borderRadius: borderRadius.sm,
                                  paddingHorizontal: spacing.xs,
                                  paddingVertical: 2,
                                  flexDirection: 'row',
                                  alignItems: 'center'
                                },
                              ]}
                            >
                              <Ionicons name="alert-circle" size={12} color={colors.warning} style={{ marginRight: 2 }} />
                              <Text style={[typo.caption, { color: colors.warning, fontSize: 10 }]}>
                                Please confirm
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[typo.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          {item.suggestedServingSize} {item.suggestedServingUnit} • P: {item.proteinG}g  C: {item.carbsG}g  F: {item.fatG}g
                        </Text>
                      </View>
                    </View>
                    <Text style={[typo.body, { color: colors.primary, fontWeight: '700', marginLeft: spacing.sm }]}>
                      {formatCalories(item.calories)} kcal
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Total */}
              <View
                style={[
                  styles.totalRow,
                  {
                    backgroundColor: colors.surface2,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <Text style={[typo.h3, { color: colors.text }]}>
                  Total ({selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''})
                </Text>
                <Text style={[typo.h3, { color: colors.primary }]}>~{formatCalories(totalCalories)} kcal</Text>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={() => confirmMutation.mutate()}
                disabled={selectedItems.size === 0 || confirmMutation.isPending}
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor:
                      selectedItems.size === 0
                        ? colors.surface2
                        : confirmMutation.isPending
                          ? colors.primaryDark
                          : colors.primary,
                    borderRadius: borderRadius.md,
                    marginTop: spacing.lg,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator color={colors.textOnPrimary} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={selectedItems.size === 0 ? colors.textDim : colors.textOnPrimary}
                    />
                    <Text
                      style={[
                        typo.buttonLarge,
                        {
                          color: selectedItems.size === 0 ? colors.textDim : colors.textOnPrimary,
                          marginLeft: spacing.sm,
                        },
                      ]}
                    >
                      Log These Items
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Step 4: Confirmed */}
          {confirmed && (
            <>
              <View
                style={[
                  styles.successBanner,
                  {
                    backgroundColor: colors.success + '18',
                    borderRadius: borderRadius.md,
                    padding: spacing.lg,
                    marginTop: spacing.xl,
                    alignItems: 'center',
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={[typo.h3, { color: colors.success, marginTop: spacing.sm }]}>
                  Meal Logged!
                </Text>
                <Text style={[typo.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                  {selectedItems.size} items totalling ~{formatCalories(totalCalories)} kcal
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                style={[
                  styles.doneButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.md,
                    marginTop: spacing.lg,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={[typo.buttonLarge, { color: colors.textOnPrimary }]}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  imagePickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recognizedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  confBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBanner: {},
  doneButton: {
    alignItems: 'center',
  },
});
