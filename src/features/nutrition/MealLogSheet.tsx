/**
 * MealLogSheet — Bottom sheet for structured (manual) meal logging.
 *
 * Available to both FREE and BASIC users.
 *
 * Flow:
 * 1. Select meal type (Breakfast / Lunch / Dinner / Snack)
 * 2. Search foods via GET /foods/search?q=...
 * 3. For each food: pick quantity + unit
 * 4. Review totals → POST /meals/log-structured
 * 5. Invalidate dashboard + nutrition queries
 */

import React, { useState, useCallback, useRef } from 'react';
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
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../shared/hooks/useTheme';
import {
  searchFoods,
  logStructuredMeal,
  type FoodItem,
  type StructuredFoodEntry,
} from '../../shared/api/nutrition.api';
import { formatCalories } from '../../shared/utils/format';
import { MEAL_LABELS, SERVING_LABELS, type MealType, type ServingUnit } from '../../shared/constants';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'LUNCH', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'DINNER', label: 'Dinner', icon: 'moon-outline' },
  { key: 'SNACK', label: 'Snack', icon: 'cafe-outline' },
];

const SERVING_UNITS: ServingUnit[] = ['GRAMS', 'KATORI', 'SPOON', 'PIECE', 'CUP', 'GLASS'];

interface AddedFood {
  food: FoodItem | null;
  name: string;
  quantity: number;
  unit: ServingUnit;
}

export function MealLogSheet({ visible, onClose }: Props) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // State
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedFoods, setAddedFoods] = useState<AddedFood[]>([]);
  const [showQuantityFor, setShowQuantityFor] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<ServingUnit>('GRAMS');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state on close
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setAddedFoods([]);
    setShowQuantityFor(null);
    setMealType('LUNCH');
    onClose();
  }, [onClose]);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchFoods(text.trim());
        setSearchResults(res.foods ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Select food from search → show quantity picker
  const handleSelectFood = useCallback((food: FoodItem) => {
    Keyboard.dismiss();
    setShowQuantityFor(food);
    setQuantity('100');
    setUnit('GRAMS');
  }, []);

  // Add food with quantity to cart
  const handleAddToCart = useCallback(() => {
    if (!showQuantityFor) return;
    const qty = parseFloat(quantity) || 100;
    setAddedFoods((prev) => [
      ...prev,
      { food: showQuantityFor, name: showQuantityFor.name, quantity: qty, unit },
    ]);
    setShowQuantityFor(null);
    setSearchQuery('');
    setSearchResults([]);
  }, [showQuantityFor, quantity, unit]);

  // Remove food from cart
  const handleRemoveFood = useCallback((index: number) => {
    setAddedFoods((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Estimate calories (simple: per 100g * quantity/100 for GRAMS, rough for other units)
  const estimateCalories = useCallback((item: AddedFood): number => {
    if (!item.food) return 0;
    if (item.unit === 'GRAMS') return Math.round((item.food.caloriesPer100g * item.quantity) / 100);
    // Rough estimates for non-gram units
    const gramsMap: Record<string, number> = {
      KATORI: 200, SPOON: 15, PIECE: 50, CUP: 240, GLASS: 250,
    };
    const grams = (gramsMap[item.unit] || 100) * item.quantity;
    return Math.round((item.food.caloriesPer100g * grams) / 100);
  }, []);

  const totalCalories = addedFoods.reduce((sum, f) => sum + estimateCalories(f), 0);

  // Log mutation
  const logMutation = useMutation({
    mutationFn: () => {
      const items: StructuredFoodEntry[] = addedFoods.map((f) => ({
        foodName: f.name,
        quantity: f.quantity,
        unit: f.unit,
      }));
      return logStructuredMeal({ mealType, items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['mealsToday'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionToday'] });
      handleClose();
    },
    onError: (err: Error) => {
      // console.log('LOG MEAL ERROR BODY:', JSON.stringify(err?.response?.data));
      Alert.alert('Logging Failed', err.message || 'Could not log meal. Please try again.');
    },
  });

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
          <Text style={[typo.h2, { color: colors.text }]}>Log Meal</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Meal Type Selector */}
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
                  <Ionicons
                    name={mt.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={isActive ? colors.textOnPrimary : colors.textSecondary}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text
                    style={[
                      typo.buttonSmall,
                      { color: isActive ? colors.textOnPrimary : colors.text },
                    ]}
                  >
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Food Search */}
          <Text style={[typo.label, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
            SEARCH FOOD
          </Text>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={[typo.body, { flex: 1, color: colors.text, paddingVertical: spacing.sm }]}
              placeholder="e.g. Paneer tikka, Dal, Chicken..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          {searchQuery.trim().length >= 2 && (
            <View
              style={[
                styles.resultsContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  marginTop: spacing.xs,
                },
              ]}
            >
              {isSearching ? (
                <View style={{ padding: spacing.md, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              ) : searchResults.length > 0 ? (
                <ScrollView
                  style={{ maxHeight: 220 }}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.resultItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleSelectFood(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>
                          {item.name}
                        </Text>
                        <Text style={[typo.caption, { color: colors.textSecondary }]}>
                          {formatCalories(item.caloriesPer100g)} kcal / 100g • {item.category}
                        </Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={{ padding: spacing.md }}>
                  <Text style={[typo.bodySmall, { color: colors.textSecondary }]}>
                    No foods found for "{searchQuery}".
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Quantity Picker (shown after selecting a food) */}
          {showQuantityFor && (
            <View
              style={[
                styles.quantityPicker,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  borderRadius: borderRadius.lg,
                  marginTop: spacing.md,
                  padding: spacing.md,
                },
              ]}
            >
              <Text style={[typo.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                {showQuantityFor.name}
              </Text>
              <Text style={[typo.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                {formatCalories(showQuantityFor.caloriesPer100g)} kcal / 100g
              </Text>

              <View style={styles.quantityRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={[typo.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    QUANTITY
                  </Text>
                  <TextInput
                    style={[
                      typo.body,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: borderRadius.md,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.sm,
                        textAlign: 'center',
                      },
                    ]}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                    selectTextOnFocus
                  />
                </View>

                <View style={{ flex: 1.5 }}>
                  <Text style={[typo.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    UNIT
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {SERVING_UNITS.map((u) => {
                      const active = unit === u;
                      return (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setUnit(u)}
                          style={[
                            styles.unitChip,
                            {
                              backgroundColor: active ? colors.primary : colors.background,
                              borderColor: active ? colors.primary : colors.border,
                              borderRadius: borderRadius.full,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typo.caption,
                              { color: active ? colors.textOnPrimary : colors.text },
                            ]}
                          >
                            {SERVING_LABELS[u]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleAddToCart}
                style={[
                  styles.addButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.md,
                    marginTop: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <Ionicons name="add" size={20} color={colors.textOnPrimary} />
                <Text style={[typo.buttonSmall, { color: colors.textOnPrimary, marginLeft: spacing.xs }]}>
                  Add to meal
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Added Foods Cart */}
          {addedFoods.length > 0 && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={[typo.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                YOUR {MEAL_LABELS[mealType]?.toUpperCase()} ({addedFoods.length} item{addedFoods.length !== 1 ? 's' : ''})
              </Text>

              {addedFoods.map((item, idx) => {
                const cal = estimateCalories(item);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.cartItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                        padding: spacing.ms,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>{item.name}</Text>
                      <Text style={[typo.caption, { color: colors.textSecondary }]}>
                        {item.quantity} {SERVING_LABELS[item.unit]} • ~{formatCalories(cal)} kcal
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveFood(idx)}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
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
                  },
                ]}
              >
                <Text style={[typo.h3, { color: colors.text }]}>Total</Text>
                <Text style={[typo.h3, { color: colors.primary }]}>~{formatCalories(totalCalories)} kcal</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Log Button (fixed at bottom) */}
        {addedFoods.length > 0 && (
          <View
            style={[
              styles.bottomAction,
              {
                backgroundColor: colors.background,
                paddingHorizontal: spacing.lg,
                paddingBottom: insets.bottom + spacing.md,
                paddingTop: spacing.md,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => logMutation.mutate()}
              disabled={logMutation.isPending}
              style={[
                styles.logButton,
                {
                  backgroundColor: logMutation.isPending ? colors.primaryDark : colors.primary,
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.md,
                },
              ]}
            >
              {logMutation.isPending ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
                  <Text style={[typo.buttonLarge, { color: colors.textOnPrimary, marginLeft: spacing.sm }]}>
                    Log {MEAL_LABELS[mealType]} ({addedFoods.length} items)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  resultsContainer: {
    borderWidth: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quantityPicker: {
    borderWidth: 2,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unitChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomAction: {
    borderTopWidth: 1,
  },
  logButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
