/**
 * NLLogSheet — Natural language meal logging (BASIC only).
 *
 * Flow:
 * 1. User types a free-text meal description (max 500 chars)
 * 2. "Parse & Log" → POST /meals/log-natural (AI parses the description)
 * 3. Show parsed results (what AI understood) for review
 * 4. Ambiguous items shown with warning icon
 * 5. User can confirm → query invalidation
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import {
  logNaturalLanguageMeal,
  type NaturalLanguageLogResponse,
  type LoggedNLItem,
} from '../../shared/api/nutrition.api';
import { formatCalories } from '../../shared/utils/format';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MAX_CHARS = 500;

export function NLLogSheet({ visible, onClose }: Props) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [description, setDescription] = useState('');
  const [parsedResult, setParsedResult] = useState<NaturalLanguageLogResponse | null>(null);

  const handleClose = useCallback(() => {
    setDescription('');
    setParsedResult(null);
    onClose();
  }, [onClose]);

  // Parse mutation
  const parseMutation = useMutation({
    mutationFn: () => logNaturalLanguageMeal({ text: description }),
    onSuccess: (data) => {
      setParsedResult(data);
      // Invalidate immediately since the backend logs on parse
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['mealsToday'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionToday'] });
    },
    onError: (err: Error) => {
      Alert.alert(
        'Parsing Failed',
        err.message || 'Could not understand your description. Try being more specific.',
      );
    },
  });

  const confidenceColor = (conf?: string): string => {
    const c = conf?.toUpperCase();
    switch (c) {
      case 'HIGH': return colors.success;
      case 'MEDIUM': return colors.warning;
      case 'LOW': return colors.error;
      default: return colors.success;
    }
  };

  const confidenceIcon = (conf?: string): keyof typeof Ionicons.glyphMap => {
    const c = conf?.toUpperCase();
    switch (c) {
      case 'HIGH': return 'checkmark-circle';
      case 'MEDIUM': return 'alert-circle';
      case 'LOW': return 'warning';
      default: return 'checkmark-circle';
    }
  };

  const isGenuinelyUnresolved = (item: any): boolean => {
    if (item?.resolved === true || (item?.calories !== undefined && item?.calories > 0)) {
      return false;
    }
    const name = (typeof item === 'string' ? item : item?.foodName || item?.name || '').toLowerCase().trim();
    if (!name) return false;

    const wasLoggedWithCalories = parsedResult?.logged?.some((loggedItem) => {
      const loggedName = (loggedItem.foodName || '').toLowerCase().trim();
      const matchedName = (loggedItem.matchedName || '').toLowerCase().trim();
      const hasValidCalories = (loggedItem.calories !== undefined && loggedItem.calories > 0) || loggedItem.resolved === true;
      return hasValidCalories && (loggedName === name || matchedName === name || loggedName.includes(name) || name.includes(loggedName));
    });

    return !wasLoggedWithCalories;
  };

  const warningItems = [
    ...(parsedResult?.unresolved || []).map((i) => ({
      name: typeof i === 'string' ? i : i.foodName || 'Unknown item',
      reason: typeof i === 'string' ? undefined : i.reason,
      raw: i,
    })),
    ...(parsedResult?.ambiguousItems || []).map((i) => ({
      name: typeof i === 'string' ? i : i.foodName || 'Ambiguous item',
      reason: undefined,
      raw: i,
    })),
  ].filter((item, index, self) =>
    isGenuinelyUnresolved(item.raw) &&
    index === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase())
  );

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
            <Text style={{ fontSize: 22, marginRight: spacing.sm }}>💬</Text>
            <Text style={[typo.h2, { color: colors.text }]}>Describe Your Meal</Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!parsedResult ? (
            <>
              {/* Input */}
              <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm }]}>
                Type what you ate in plain language. Our AI will figure out the calories.
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                  },
                ]}
              >
                <TextInput
                  style={[
                    typo.body,
                    {
                      color: colors.text,
                      minHeight: 120,
                      textAlignVertical: 'top',
                    },
                  ]}
                  placeholder="e.g. 1 katori shahi paneer, 3 chapatis, and a glass of buttermilk for lunch"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={MAX_CHARS}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Character counter */}
              <Text
                style={[
                  typo.caption,
                  {
                    color: description.length > MAX_CHARS * 0.9 ? colors.warning : colors.textSecondary,
                    textAlign: 'right',
                    marginTop: spacing.xs,
                  },
                ]}
              >
                {description.length}/{MAX_CHARS}
              </Text>

              {/* Examples */}
              <View
                style={[
                  styles.examplesBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <Text style={[typo.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                  💡 EXAMPLES
                </Text>
                {[
                  '"2 idlis with sambar and coconut chutney for breakfast"',
                  '"Chicken biryani with raita — half plate, dinner"',
                  '"Black coffee, 2 boiled eggs, 1 banana — snack"',
                ].map((ex, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setDescription(ex.replace(/"/g, ''))}
                    style={{ marginBottom: i < 2 ? spacing.sm : 0 }}
                  >
                    <Text style={[typo.bodySmall, { color: colors.primary }]}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Parse Button */}
              <TouchableOpacity
                onPress={() => parseMutation.mutate()}
                disabled={description.trim().length < 5 || parseMutation.isPending}
                style={[
                  styles.parseButton,
                  {
                    backgroundColor:
                      description.trim().length < 5
                        ? colors.surface2
                        : parseMutation.isPending
                          ? colors.primaryDark
                          : colors.primary,
                    borderRadius: borderRadius.md,
                    marginTop: spacing.lg,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                {parseMutation.isPending ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color={colors.textOnPrimary} size="small" style={{ marginRight: spacing.sm }} />
                    <Text style={[typo.buttonLarge, { color: colors.textOnPrimary }]}>Parsing your meal...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={description.trim().length < 5 ? colors.textDim : colors.textOnPrimary} />
                    <Text
                      style={[
                        typo.buttonLarge,
                        {
                          color: description.trim().length < 5 ? colors.textDim : colors.textOnPrimary,
                          marginLeft: spacing.sm,
                        },
                      ]}
                    >
                      Parse & Log
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Parsed Results */}
              <View
                style={[
                  styles.successBanner,
                  {
                    backgroundColor: colors.success + '18',
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={22} color={colors.success} style={{ marginRight: spacing.sm }} />
                <Text style={[typo.body, { color: colors.success, flex: 1, fontWeight: '600' }]}>
                  Meal logged successfully!
                </Text>
              </View>

              <Text style={[typo.label, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                AI UNDERSTOOD
              </Text>
              <Text style={[typo.bodySmall, { color: colors.textDim, marginBottom: spacing.md, fontStyle: 'italic' }]}>
                "{description}"
              </Text>

              {/* Logged Items */}
              {parsedResult.logged?.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.parsedItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      padding: spacing.ms,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons
                      name={confidenceIcon(item.matchConfidence)}
                      size={16}
                      color={confidenceColor(item.matchConfidence)}
                      style={{ marginRight: spacing.xs }}
                    />
                    <Text style={[typo.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                      {item.matchedName || item.foodName}
                    </Text>
                    <Text style={[typo.body, { color: colors.primary, fontWeight: '700' }]}>
                      {formatCalories(item.calories)} kcal
                    </Text>
                  </View>
                  <Text style={[typo.caption, { color: colors.textSecondary }]}>
                    {item.quantity ? `${item.quantity} ${item.unit || ''} • ` : ''}
                    {item.proteinG !== undefined ? `P: ${item.proteinG}g  C: ${item.carbsG}g  F: ${item.fatG}g` : ''}
                  </Text>
                </View>
              ))}

              {/* Unresolved / Ambiguous items warning */}
              {warningItems.length > 0 && (
                <View
                  style={[
                    styles.warningBox,
                    {
                      backgroundColor: colors.warning + '18',
                      borderColor: colors.warning + '40',
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      marginTop: spacing.sm,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Ionicons name="warning" size={18} color={colors.warning} style={{ marginRight: spacing.sm }} />
                    <Text style={[typo.label, { color: colors.warning }]}>Unresolved / Ambiguous Items</Text>
                  </View>
                  {warningItems.map((item, idx) => (
                    <Text key={idx} style={[typo.bodySmall, { color: colors.text, marginLeft: spacing.lg }]}>
                      • {item.name}
                      {item.reason ? ` (${item.reason})` : ''}
                    </Text>
                  ))}
                </View>
              )}

              {/* Totals */}
              <View
                style={[
                  styles.totalCard,
                  {
                    backgroundColor: colors.surface2,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <View style={styles.totalHeader}>
                  <Text style={[typo.h3, { color: colors.text }]}>Total</Text>
                  <Text style={[typo.h3, { color: colors.primary }]}>
                    {formatCalories(parsedResult.mealCalories ?? parsedResult.logged?.reduce((sum, item) => sum + (item.calories || 0), 0))} kcal
                  </Text>
                </View>
                {parsedResult.logged && parsedResult.logged.some(i => i.proteinG !== undefined) && (
                  <View style={[styles.macroRow, { marginTop: spacing.sm }]}>
                    <Text style={[typo.caption, { color: colors.textSecondary }]}>
                      P: {Math.round((parsedResult.logged.reduce((s, i) => s + (i.proteinG || 0), 0)) * 10) / 10}g
                    </Text>
                    <Text style={[typo.caption, { color: colors.textSecondary, marginLeft: spacing.md }]}>
                      C: {Math.round((parsedResult.logged.reduce((s, i) => s + (i.carbsG || 0), 0)) * 10) / 10}g
                    </Text>
                    <Text style={[typo.caption, { color: colors.textSecondary, marginLeft: spacing.md }]}>
                      F: {Math.round((parsedResult.logged.reduce((s, i) => s + (i.fatG || 0), 0)) * 10) / 10}g
                    </Text>
                  </View>
                )}
              </View>

              {/* Done Button */}
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
  inputContainer: {
    borderWidth: 1,
  },
  examplesBox: {
    borderWidth: 1,
  },
  parseButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parsedItem: {
    borderWidth: 1,
  },
  warningBox: {
    borderWidth: 1,
  },
  totalCard: {},
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroRow: {
    flexDirection: 'row',
  },
  doneButton: {
    alignItems: 'center',
  },
});
