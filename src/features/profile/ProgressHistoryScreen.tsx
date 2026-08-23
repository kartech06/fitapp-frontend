import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart } from 'react-native-gifted-charts';

import { useTheme } from '../../shared/hooks/useTheme';
import { usePlan } from '../../shared/hooks/usePlan';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { ScreenHeader } from '../../shared/components/ScreenHeader';
import {
  getBodyAnalysisHistory,
  deleteBodyAnalysis,
  type BodyAnalysisRecord,
} from '../../shared/api/body-analysis.api';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function ProgressHistoryScreen() {
  const { colors, typography: typo, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { isFree } = usePlan();

  // Selection for comparison modal
  const [comparisonItems, setComparisonItems] = useState<[BodyAnalysisRecord, BodyAnalysisRecord] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'both' | 'bodyFat' | 'muscle'>('both');

  const {
    data: history = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['bodyAnalysis', 'history'],
    queryFn: getBodyAnalysisHistory,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBodyAnalysis(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyAnalysis'] });
      Alert.alert('Success', 'Body analysis record deleted.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete record.');
    },
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Analysis',
      'Are you sure you want to delete this body analysis record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  };

  // Sort chronological (oldest to newest) for chart plotting
  const chronologicalHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [history]);

  // Delta stats between oldest and newest
  const summaryDelta = useMemo(() => {
    if (chronologicalHistory.length < 2) return null;
    const oldest = chronologicalHistory[0];
    const newest = chronologicalHistory[chronologicalHistory.length - 1];

    const bfOld = oldest.analysisResult?.estimatedBodyFatPct ?? 0;
    const bfNew = newest.analysisResult?.estimatedBodyFatPct ?? 0;
    const bfDelta = +(bfNew - bfOld).toFixed(1);

    const mmOld = oldest.analysisResult?.estimatedMuscleMassPct ?? 0;
    const mmNew = newest.analysisResult?.estimatedMuscleMassPct ?? 0;
    const mmDelta = +(mmNew - mmOld).toFixed(1);

    const days = Math.max(
      1,
      Math.round(
        (new Date(newest.createdAt).getTime() - new Date(oldest.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return { bfOld, bfNew, bfDelta, mmOld, mmNew, mmDelta, days };
  }, [chronologicalHistory]);

  // Chart data
  const { bodyFatLineData, muscleMassLineData, maxVal, minVal } = useMemo(() => {
    if (chronologicalHistory.length < 2) {
      return { bodyFatLineData: [], muscleMassLineData: [], maxVal: 50, minVal: 0 };
    }

    let max = 0;
    let min = 100;

    const bfData = chronologicalHistory.map((item) => {
      const val = item.analysisResult?.estimatedBodyFatPct ?? 0;
      if (val > max) max = val;
      if (val < min) min = val;
      const date = new Date(item.createdAt);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      return {
        value: val,
        label,
        dataPointText: `${val}%`,
      };
    });

    const mmData = chronologicalHistory.map((item) => {
      const val = item.analysisResult?.estimatedMuscleMassPct ?? 0;
      if (val > max) max = val;
      if (val < min) min = val;
      const date = new Date(item.createdAt);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      return {
        value: val,
        label,
        dataPointText: `${val}%`,
      };
    });

    // Add margin for nice chart view
    const chartMax = Math.min(60, Math.ceil((max + 5) / 5) * 5);
    const chartMin = Math.max(0, Math.floor((min - 5) / 5) * 5);

    return {
      bodyFatLineData: bfData,
      muscleMassLineData: mmData,
      maxVal: chartMax,
      minVal: chartMin,
    };
  }, [chronologicalHistory]);

  const handleToggleSelect = (item: BodyAnalysisRecord) => {
    if (selectedIds.includes(item.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    } else {
      if (selectedIds.length === 2) {
        setSelectedIds([selectedIds[0], item.id]);
      } else {
        const newSelected = [...selectedIds, item.id];
        setSelectedIds(newSelected);
        if (newSelected.length === 2) {
          const first = history.find((h) => h.id === newSelected[0])!;
          const second = history.find((h) => h.id === newSelected[1])!;
          const sorted = [first, second].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ) as [BodyAnalysisRecord, BodyAnalysisRecord];
          setComparisonItems(sorted);
        }
      }
    }
  };

  const handleCompareFirstVsLatest = () => {
    if (chronologicalHistory.length >= 2) {
      const oldest = chronologicalHistory[0];
      const newest = chronologicalHistory[chronologicalHistory.length - 1];
      setComparisonItems([oldest, newest]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Progress History"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('BodyAnalysis', { photoType: 'PROGRESS' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typo.body, { color: colors.textDim, marginTop: spacing.md }]}>
            Loading history...
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[typo.body, { color: colors.text, marginTop: spacing.md }]}>
            Failed to load body analysis history
          </Text>
          <Button title="Retry" onPress={() => refetch()} style={{ marginTop: spacing.md }} />
        </View>
      ) : history.length === 0 ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <Card style={StyleSheet.flatten([{ alignItems: 'center', paddingVertical: spacing.xxl, marginTop: spacing.lg }])}>
            <Ionicons name="body-outline" size={56} color={colors.textDim} />
            <Text style={[typo.h3, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
              No Analyses Yet
            </Text>
            <Text
              style={[
                typo.bodySmall,
                { color: colors.textDim, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.lg },
              ]}
            >
              Analyze your physique to track changes in body fat and muscle mass over time.
            </Text>
            <Button
              title="Start First Analysis"
              onPress={() => navigation.navigate('BodyAnalysis', { photoType: 'PROGRESS' })}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          {/* ── SECTION A: Trend / Single-point Overview ── */}
          {history.length === 1 ? (
            // Single point fallback
            <Card style={StyleSheet.flatten([{ marginBottom: spacing.lg }])}>
              <View style={styles.rowBetween}>
                <Text style={[typo.h3, { color: colors.text }]}>Current Baseline</Text>
                <View
                  style={[
                    styles.pillBadge,
                    {
                      backgroundColor: colors.surface2,
                      borderRadius: borderRadius.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                    },
                  ]}
                >
                  <Text style={[typo.caption, { color: colors.textDim }]}>
                    {new Date(history[0].createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              <View style={[styles.statsGrid, { marginTop: spacing.md }]}>
                <View style={[styles.statBox, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]}>
                  <Text style={[typo.caption, { color: colors.textDim }]}>Body Fat</Text>
                  <Text style={[typo.h2, { color: colors.warning, marginTop: 2 }]}>
                    {history[0].analysisResult?.estimatedBodyFatPct ?? 0}%
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]}>
                  <Text style={[typo.caption, { color: colors.textDim }]}>Muscle Mass</Text>
                  <Text style={[typo.h2, { color: colors.primary, marginTop: 2 }]}>
                    {history[0].analysisResult?.estimatedMuscleMassPct ?? 0}%
                  </Text>
                </View>
              </View>

              <View style={[styles.statsGrid, { marginTop: spacing.sm }]}>
                <View style={[styles.statBox, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]}>
                  <Text style={[typo.caption, { color: colors.textDim }]}>Physique</Text>
                  <Text style={[typo.body, { color: colors.text, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 }]}>
                    {history[0].analysisResult?.physiqueType?.replace('_', ' ').toLowerCase() ?? 'N/A'}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]}>
                  <Text style={[typo.caption, { color: colors.textDim }]}>Goal</Text>
                  <Text style={[typo.body, { color: colors.text, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 }]}>
                    {history[0].analysisResult?.recommendedGoal?.replace('_', ' ').toLowerCase() ?? 'N/A'}
                  </Text>
                </View>
              </View>

              {isFree ? (
                <View
                  style={[
                    styles.upgradeBox,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      marginTop: spacing.md,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <View style={styles.row}>
                    <Ionicons name="sparkles" size={20} color={colors.secondary} style={{ marginRight: spacing.sm }} />
                    <Text style={[typo.bodySmall, { color: colors.text, flex: 1, fontWeight: '500' }]}>
                      Upgrade to Basic for Progress Tracking
                    </Text>
                  </View>
                  <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.sm }]}>
                    Free plan includes 1 initial baseline scan. Upgrade to Basic to unlock unlimited progress analyses and trend charts.
                  </Text>
                  <Button
                    title="Upgrade to Basic — ₹499/mo"
                    onPress={() => navigation.navigate('Subscription')}
                    variant="primary"
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.hintBox,
                    {
                      backgroundColor: colors.surface2,
                      borderRadius: borderRadius.md,
                      marginTop: spacing.md,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <Text style={[typo.bodySmall, { color: colors.textDim, marginBottom: spacing.sm }]}>
                    Take your next progress scan to start generating your body composition trend chart.
                  </Text>
                  <Button
                    title="New Analysis"
                    onPress={() => navigation.navigate('BodyAnalysis', { photoType: 'PROGRESS' })}
                    variant="outline"
                  />
                </View>
              )}
            </Card>
          ) : (
            // 2+ entries: Trend Chart + Delta Summary
            <Card style={StyleSheet.flatten([{ marginBottom: spacing.lg }])}>
              <View style={styles.rowBetween}>
                <Text style={[typo.h3, { color: colors.text }]}>Physique Trend</Text>
                {summaryDelta && (
                  <Text style={[typo.caption, { color: colors.textDim }]}>
                    Over {summaryDelta.days} days
                  </Text>
                )}
              </View>

              {/* Quick Delta Cards */}
              {summaryDelta && (
                <View style={[styles.statsGrid, { marginVertical: spacing.md }]}>
                  <View style={[styles.statBox, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]}>
                    <Text style={[typo.caption, { color: colors.textDim }]}>Body Fat Δ</Text>
                    <View style={styles.row}>
                      <Ionicons
                        name={summaryDelta.bfDelta <= 0 ? 'trending-down' : 'trending-up'}
                        size={16}
                        color={summaryDelta.bfDelta <= 0 ? colors.primary : colors.warning}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          typo.body,
                          {
                            fontWeight: '700',
                            color: summaryDelta.bfDelta <= 0 ? colors.primary : colors.warning,
                          },
                        ]}
                      >
                        {summaryDelta.bfDelta > 0 ? `+${summaryDelta.bfDelta}%` : `${summaryDelta.bfDelta}%`}
                      </Text>
                    </View>
                    <Text style={[typo.caption, { color: colors.textDim, fontSize: 10, marginTop: 2 }]}>
                      {summaryDelta.bfOld}% → {summaryDelta.bfNew}%
                    </Text>
                  </View>

                  <View style={[styles.statBox, { backgroundColor: colors.surface2, borderRadius: borderRadius.md }]}>
                    <Text style={[typo.caption, { color: colors.textDim }]}>Muscle Mass Δ</Text>
                    <View style={styles.row}>
                      <Ionicons
                        name={summaryDelta.mmDelta >= 0 ? 'trending-up' : 'trending-down'}
                        size={16}
                        color={summaryDelta.mmDelta >= 0 ? colors.primary : colors.warning}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          typo.body,
                          {
                            fontWeight: '700',
                            color: summaryDelta.mmDelta >= 0 ? colors.primary : colors.warning,
                          },
                        ]}
                      >
                        {summaryDelta.mmDelta > 0 ? `+${summaryDelta.mmDelta}%` : `${summaryDelta.mmDelta}%`}
                      </Text>
                    </View>
                    <Text style={[typo.caption, { color: colors.textDim, fontSize: 10, marginTop: 2 }]}>
                      {summaryDelta.mmOld}% → {summaryDelta.mmNew}%
                    </Text>
                  </View>
                </View>
              )}

              {/* Chart Series Toggle */}
              <View style={[styles.tabRow, { marginBottom: spacing.md }]}>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'both' && { backgroundColor: colors.surface2 },
                    { borderRadius: borderRadius.sm },
                  ]}
                  onPress={() => setActiveTab('both')}
                >
                  <Text
                    style={[
                      typo.caption,
                      { color: activeTab === 'both' ? colors.text : colors.textDim, fontWeight: '600' },
                    ]}
                  >
                    Both
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'bodyFat' && { backgroundColor: colors.surface2 },
                    { borderRadius: borderRadius.sm },
                  ]}
                  onPress={() => setActiveTab('bodyFat')}
                >
                  <View style={styles.row}>
                    <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                    <Text
                      style={[
                        typo.caption,
                        { color: activeTab === 'bodyFat' ? colors.text : colors.textDim, fontWeight: '600' },
                      ]}
                    >
                      Body Fat %
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'muscle' && { backgroundColor: colors.surface2 },
                    { borderRadius: borderRadius.sm },
                  ]}
                  onPress={() => setActiveTab('muscle')}
                >
                  <View style={styles.row}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text
                      style={[
                        typo.caption,
                        { color: activeTab === 'muscle' ? colors.text : colors.textDim, fontWeight: '600' },
                      ]}
                    >
                      Muscle %
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Line Chart */}
              <View style={{ overflow: 'hidden', alignItems: 'center' }}>
                <LineChart
                  data={activeTab === 'muscle' ? muscleMassLineData : bodyFatLineData}
                  data2={activeTab === 'both' ? muscleMassLineData : undefined}
                  color={activeTab === 'muscle' ? colors.primary : colors.warning}
                  color2={colors.primary}
                  dataPointsColor={activeTab === 'muscle' ? colors.primary : colors.warning}
                  dataPointsColor2={colors.primary}
                  textColor1={colors.textDim}
                  textColor2={colors.textDim}
                  textFontSize1={10}
                  textFontSize2={10}
                  thickness={3}
                  thickness2={3}
                  curved
                  hideDataPoints={false}
                  dataPointsRadius={4}
                  spacing={chronologicalHistory.length > 5 ? 50 : (SCREEN_WIDTH - 120) / Math.max(1, chronologicalHistory.length - 1)}
                  initialSpacing={20}
                  endSpacing={20}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  yAxisTextStyle={{ color: colors.textDim, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textDim, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={maxVal}
                  mostNegativeValue={minVal}
                  yAxisOffset={minVal}
                  height={180}
                  width={SCREEN_WIDTH - 80}
                  rulesColor={colors.border}
                  rulesType="dashed"
                  showVerticalLines={false}
                />
              </View>

              {/* Legend for 'both' tab */}
              {activeTab === 'both' && (
                <View style={[styles.rowCenter, { marginTop: spacing.md }]}>
                  <View style={[styles.row, { marginRight: spacing.lg }]}>
                    <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                    <Text style={[typo.caption, { color: colors.textDim }]}>Body Fat %</Text>
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={[typo.caption, { color: colors.textDim }]}>Muscle Mass %</Text>
                  </View>
                </View>
              )}
            </Card>
          )}

          {/* ── SECTION B: Timeline & Actions ── */}
          <View style={[styles.rowBetween, { marginBottom: spacing.sm, marginTop: spacing.xs }]}>
            <Text style={[typo.label, { color: colors.textDim }]}>
              ANALYSIS HISTORY ({history.length})
            </Text>

            {history.length >= 2 && (
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={handleCompareFirstVsLatest}
                  style={[styles.smallActionBtn, { borderColor: colors.primary, borderRadius: borderRadius.sm }]}
                >
                  <Ionicons name="git-compare-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[typo.caption, { color: colors.primary, fontWeight: '600' }]}>
                    First vs Latest
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsSelectMode(!isSelectMode);
                    setSelectedIds([]);
                  }}
                  style={[
                    styles.smallActionBtn,
                    {
                      borderColor: isSelectMode ? colors.primary : colors.border,
                      backgroundColor: isSelectMode ? colors.surface2 : 'transparent',
                      borderRadius: borderRadius.sm,
                      marginLeft: spacing.xs,
                    },
                  ]}
                >
                  <Text style={[typo.caption, { color: isSelectMode ? colors.primary : colors.textDim }]}>
                    {isSelectMode ? 'Cancel' : 'Select 2 to Compare'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isSelectMode && (
            <View style={[styles.selectBanner, { backgroundColor: colors.surface2, borderRadius: borderRadius.md, marginBottom: spacing.sm }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
              <Text style={[typo.caption, { color: colors.text, marginLeft: spacing.xs }]}>
                {selectedIds.length === 0
                  ? 'Tap any 2 analyses to compare them.'
                  : selectedIds.length === 1
                  ? 'Tap 1 more analysis to compare.'
                  : 'Comparing 2 analyses.'}
              </Text>
            </View>
          )}

          {history.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={isSelectMode ? 0.7 : 1}
                onPress={() => {
                  if (isSelectMode) {
                    handleToggleSelect(item);
                  }
                }}
              >
                <Card
                  style={StyleSheet.flatten([
                    styles.timelineCard,
                    { marginBottom: spacing.md },
                    isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                  ])}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.row}>
                      {isSelectMode && (
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textDim}
                          style={{ marginRight: spacing.sm }}
                        />
                      )}
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[typo.body, { color: colors.text, fontWeight: '600' }]}>{dateStr}</Text>
                    </View>

                    <View style={styles.row}>
                      <View
                        style={[
                          styles.pillBadge,
                          {
                            backgroundColor: item.photoType === 'ONBOARDING' ? colors.surface2 : colors.primary,
                            borderRadius: borderRadius.full,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typo.caption,
                            {
                              color: item.photoType === 'ONBOARDING' ? colors.textDim : colors.textOnPrimary,
                              fontWeight: '600',
                              fontSize: 10,
                            },
                          ]}
                        >
                          {item.photoType === 'ONBOARDING' ? 'BASELINE' : 'PROGRESS'}
                        </Text>
                      </View>
                      {!isSelectMode && (
                        <TouchableOpacity
                          onPress={() => handleDelete(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ marginLeft: spacing.sm }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.textDim} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={[styles.statsRow, { borderColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.xs }]}>
                    <View style={styles.statCol}>
                      <Text style={[typo.caption, { color: colors.textDim }]}>Body Fat</Text>
                      <Text style={[typo.body, { color: colors.warning, fontWeight: '700' }]}>
                        {item.analysisResult?.estimatedBodyFatPct ?? 'N/A'}%
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[typo.caption, { color: colors.textDim }]}>Muscle Mass</Text>
                      <Text style={[typo.body, { color: colors.primary, fontWeight: '700' }]}>
                        {item.analysisResult?.estimatedMuscleMassPct ?? 'N/A'}%
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[typo.caption, { color: colors.textDim }]}>Physique</Text>
                      <Text style={[typo.bodySmall, { color: colors.text, fontWeight: '600', textTransform: 'capitalize' }]}>
                        {item.analysisResult?.physiqueType?.replace('_', ' ').toLowerCase() ?? 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[typo.caption, { color: colors.textDim }]}>Goal</Text>
                      <Text style={[typo.bodySmall, { color: colors.text, fontWeight: '600', textTransform: 'capitalize' }]}>
                        {item.analysisResult?.recommendedGoal?.replace('_', ' ').toLowerCase() ?? 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {item.analysisResult?.notes ? (
                    <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]} numberOfLines={2}>
                      "{item.analysisResult.notes}"
                    </Text>
                  ) : null}
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── SECTION C: Comparison Modal ── */}
      <Modal
        visible={!!comparisonItems}
        animationType="slide"
        transparent
        onRequestClose={() => setComparisonItems(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderRadius: borderRadius.lg }]}>
            {comparisonItems && (
              <>
                <View style={[styles.rowBetween, { marginBottom: spacing.md }]}>
                  <View style={styles.row}>
                    <Ionicons name="git-compare" size={22} color={colors.primary} style={{ marginRight: spacing.xs }} />
                    <Text style={[typo.h3, { color: colors.text }]}>Progress Comparison</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setComparisonItems(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color={colors.textDim} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Delta Highlights */}
                  {(() => {
                    const [older, newer] = comparisonItems;
                    const bfDiff = +(
                      (newer.analysisResult?.estimatedBodyFatPct ?? 0) -
                      (older.analysisResult?.estimatedBodyFatPct ?? 0)
                    ).toFixed(1);
                    const mmDiff = +(
                      (newer.analysisResult?.estimatedMuscleMassPct ?? 0) -
                      (older.analysisResult?.estimatedMuscleMassPct ?? 0)
                    ).toFixed(1);
                    const days = Math.max(
                      1,
                      Math.round(
                        (new Date(newer.createdAt).getTime() - new Date(older.createdAt).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    );

                    return (
                      <View style={[styles.deltaHighlightCard, { backgroundColor: colors.surface2, borderRadius: borderRadius.md, marginBottom: spacing.md }]}>
                        <Text style={[typo.caption, { color: colors.textDim, textAlign: 'center', marginBottom: spacing.xs }]}>
                          Time between scans: {days} days
                        </Text>
                        <View style={styles.rowAround}>
                          <View style={{ alignItems: 'center' }}>
                            <Text style={[typo.caption, { color: colors.textDim }]}>Body Fat</Text>
                            <Text
                              style={[
                                typo.h3,
                                { color: bfDiff <= 0 ? colors.primary : colors.warning },
                              ]}
                            >
                              {bfDiff > 0 ? `+${bfDiff}%` : `${bfDiff}%`}
                            </Text>
                          </View>
                          <View style={{ width: 1, height: 30, backgroundColor: colors.border }} />
                          <View style={{ alignItems: 'center' }}>
                            <Text style={[typo.caption, { color: colors.textDim }]}>Muscle Mass</Text>
                            <Text
                              style={[
                                typo.h3,
                                { color: mmDiff >= 0 ? colors.primary : colors.warning },
                              ]}
                            >
                              {mmDiff > 0 ? `+${mmDiff}%` : `${mmDiff}%`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Side-by-side Columns */}
                  <View style={styles.compareGrid}>
                    {/* Left: Baseline (Older) */}
                    <View style={[styles.compareCol, { backgroundColor: colors.surface2, borderRadius: borderRadius.md, marginRight: spacing.xs }]}>
                      <View
                        style={[
                          styles.pillBadge,
                          {
                            backgroundColor: colors.border,
                            borderRadius: borderRadius.full,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                          },
                        ]}
                      >
                        <Text style={[typo.caption, { color: colors.textDim, fontWeight: '700', fontSize: 10 }]}>BEFORE</Text>
                      </View>
                      <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>
                        {new Date(comparisonItems[0].createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>

                      <View style={{ marginTop: spacing.sm, width: '100%' }}>
                        <Text style={[typo.caption, { color: colors.textDim }]}>Body Fat</Text>
                        <Text style={[typo.h3, { color: colors.warning }]}>
                          {comparisonItems[0].analysisResult?.estimatedBodyFatPct ?? 0}%
                        </Text>

                        <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>Muscle Mass</Text>
                        <Text style={[typo.h3, { color: colors.primary }]}>
                          {comparisonItems[0].analysisResult?.estimatedMuscleMassPct ?? 0}%
                        </Text>

                        <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>Physique</Text>
                        <Text style={[typo.bodySmall, { color: colors.text, textTransform: 'capitalize' }]}>
                          {comparisonItems[0].analysisResult?.physiqueType?.replace('_', ' ').toLowerCase() ?? 'N/A'}
                        </Text>

                        <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>Fitness Level</Text>
                        <Text style={[typo.bodySmall, { color: colors.text, textTransform: 'capitalize' }]}>
                          {comparisonItems[0].analysisResult?.estimatedFitnessLevel?.toLowerCase() ?? 'N/A'}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Current (Newer) */}
                    <View style={[styles.compareCol, { backgroundColor: colors.surface2, borderRadius: borderRadius.md, marginLeft: spacing.xs }]}>
                      <View
                        style={[
                          styles.pillBadge,
                          {
                            backgroundColor: colors.primary,
                            borderRadius: borderRadius.full,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                          },
                        ]}
                      >
                        <Text style={[typo.caption, { color: colors.textOnPrimary, fontWeight: '700', fontSize: 10 }]}>AFTER</Text>
                      </View>
                      <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>
                        {new Date(comparisonItems[1].createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>

                      <View style={{ marginTop: spacing.sm, width: '100%' }}>
                        <Text style={[typo.caption, { color: colors.textDim }]}>Body Fat</Text>
                        <Text style={[typo.h3, { color: colors.warning }]}>
                          {comparisonItems[1].analysisResult?.estimatedBodyFatPct ?? 0}%
                        </Text>

                        <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>Muscle Mass</Text>
                        <Text style={[typo.h3, { color: colors.primary }]}>
                          {comparisonItems[1].analysisResult?.estimatedMuscleMassPct ?? 0}%
                        </Text>

                        <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>Physique</Text>
                        <Text style={[typo.bodySmall, { color: colors.text, textTransform: 'capitalize' }]}>
                          {comparisonItems[1].analysisResult?.physiqueType?.replace('_', ' ').toLowerCase() ?? 'N/A'}
                        </Text>

                        <Text style={[typo.caption, { color: colors.textDim, marginTop: spacing.xs }]}>Fitness Level</Text>
                        <Text style={[typo.bodySmall, { color: colors.text, textTransform: 'capitalize' }]}>
                          {comparisonItems[1].analysisResult?.estimatedFitnessLevel?.toLowerCase() ?? 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Button
                    title="Close"
                    onPress={() => setComparisonItems(null)}
                    variant="outline"
                    style={{ marginTop: spacing.lg }}
                  />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAround: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  pillBadge: {
    alignSelf: 'flex-start',
  },
  upgradeBox: {
    borderWidth: 1,
  },
  hintBox: {},
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  selectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  timelineCard: {
    padding: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  statCol: {
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '85%',
    padding: 20,
  },
  deltaHighlightCard: {
    padding: 12,
  },
  compareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compareCol: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
});
