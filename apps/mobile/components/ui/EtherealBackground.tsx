/**
 * EtherealBackground Component
 *
 * Provides the ethereal gradient background for screens.
 * Uses LinearGradient for smooth sky-to-purple transitions.
 *
 * Usage:
 *   <EtherealBackground>
 *     <YourContent />
 *   </EtherealBackground>
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

interface EtherealBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Use reversed gradient (purple to sky) */
  reversed?: boolean;
}

export function EtherealBackground({
  children,
  style,
  reversed = false,
}: EtherealBackgroundProps) {
  const gradientColors = reversed
    ? [...gradients.etherealBackground].reverse()
    : gradients.etherealBackground;

  return (
    <LinearGradient
      colors={gradientColors as [string, string, ...string[]]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default EtherealBackground;
