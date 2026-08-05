/**
 * ProgressRing — Circular SVG ring for calorie progress.
 *
 * Stroke fill: primary (lime) on a border-colored track.
 * Center displays consumed/goal text.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';
import { formatCalories } from '../utils/format';

export interface ProgressRingProps {
  consumed: number;
  goal: number;
  /** Diameter in px (default 140) */
  size?: number;
  /** Stroke width in px (default 10) */
  strokeWidth?: number;
  /** Label shown below the number (default "kcal") */
  label?: string;
}

export function ProgressRing({
  consumed,
  goal,
  size = 140,
  strokeWidth = 10,
  label = 'kcal',
}: ProgressRingProps) {
  const { colors, typography: typo } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const diff = goal - consumed;
  const isOver = diff < 0;
  const displayValue = formatCalories(Math.abs(diff));
  const activeColor = isOver ? colors.warning : colors.primary;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center text */}
      <View style={styles.centerText}>
        <Text style={[typo.h2, { color: isOver ? colors.warning : colors.text }]}>
          {displayValue}
        </Text>
        <Text style={[typo.caption, { color: isOver ? colors.warning : colors.textDim, marginTop: -2 }]}>
          {label} {isOver ? 'over' : 'left'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
  },
});
