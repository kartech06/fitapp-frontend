import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAuthStore } from '../../shared/store/authStore';
import { MealLogSheet } from './MealLogSheet';
import { NLLogSheet } from './NLLogSheet';
import { PhotoLogSheet } from './PhotoLogSheet';

export interface MealActionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function MealActionSheet({ visible, onClose }: MealActionSheetProps) {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const plan = useAuthStore((s) => s.plan);
  const isBasic = plan === 'BASIC';

  const [showMealLog, setShowMealLog] = useState(false);
  const [showNLLog, setShowNLLog] = useState(false);
  const [showPhotoLog, setShowPhotoLog] = useState(false);

  // If any sub-sheet is visible, we hide the action sheet's main content 
  // (or we could keep the modal open behind it, but since Modal is full screen transparent,
  // it's easier to just hide this Modal when a child Modal is opened. But wait, Modal over Modal
  // works fine in React Native. Let's keep it simple).

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible && !showMealLog && !showNLLog && !showPhotoLog}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={onClose}
            activeOpacity={1}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderTopLeftRadius: borderRadius.xl,
                borderTopRightRadius: borderRadius.xl,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
          >
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={{ paddingHorizontal: spacing.lg }}>
              <View style={styles.headerRow}>
                <Text style={[typo.h2, { color: colors.text }]}>Log Meal</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[typo.bodySmall, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                Choose how you want to log your meal.
              </Text>

              {/* Log Manually */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.md,
                  },
                ]}
                onPress={() => setShowMealLog(true)}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={{ fontSize: 20 }}>✏️</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[typo.h3, { color: colors.text }]}>Log Manually</Text>
                  <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>Search & add foods from the database</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Describe Meal */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isBasic ? colors.surface : colors.surface2,
                    borderColor: colors.border,
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.md,
                    opacity: isBasic ? 1 : 0.6,
                  },
                ]}
                onPress={() => {
                  if (!isBasic) {
                    Alert.alert('BASIC Plan Required', 'Natural language logging is available for BASIC subscribers.');
                    return;
                  }
                  setShowNLLog(true);
                }}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.secondary + '22' }]}>
                  <Text style={{ fontSize: 20 }}>💬</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[typo.h3, { color: colors.text, marginRight: spacing.sm }]}>Describe Meal</Text>
                    {!isBasic && (
                      <View style={[styles.upgradeBadge, { backgroundColor: colors.secondary, borderRadius: borderRadius.sm }]}>
                        <Text style={[typo.caption, { color: '#FFF', fontSize: 10, fontWeight: '700' }]}>BASIC</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>Type in natural language, AI will do the rest</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Scan Food */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.md,
                  },
                ]}
                onPress={() => setShowPhotoLog(true)}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.error + '22' }]}>
                  <Text style={{ fontSize: 20 }}>📷</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[typo.h3, { color: colors.text }]}>Scan Food</Text>
                  <Text style={[typo.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                    {isBasic ? 'Unlimited scans' : '5 free scans'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sub-modals */}
      <MealLogSheet 
        visible={showMealLog} 
        onClose={() => {
          setShowMealLog(false);
          onClose(); // Close the parent action sheet as well after finishing
        }} 
      />
      <NLLogSheet 
        visible={showNLLog} 
        onClose={() => {
          setShowNLLog(false);
          onClose();
        }} 
      />
      <PhotoLogSheet 
        visible={showPhotoLog} 
        onClose={() => {
          setShowPhotoLog(false);
          onClose();
        }} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
