/**
 * GlassCard Component
 *
 * Faux-glass card that mimics glassmorphism without using BlurView.
 * This approach avoids battery drain from backdrop-filter animations.
 *
 * Usage:
 *   <GlassCard>
 *     <Text>Content</Text>
 *   </GlassCard>
 *
 *   <GlassCard variant="strong" rounded="2xl">
 *     <Text>Modal content</Text>
 *   </GlassCard>
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { glass, borderRadius, shadows } from '@/constants/theme';

type GlassVariant = 'light' | 'strong' | 'subtle' | 'dark';
type RoundedSize = 'none' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl' | 'full';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  rounded?: RoundedSize;
  style?: ViewStyle;
  padding?: number;
}

export function GlassCard({
  children,
  variant = 'light',
  rounded = 'xl',
  style,
  padding = 16,
}: GlassCardProps) {
  const glassStyle = glass[variant];
  const radiusValue = borderRadius[rounded];

  return (
    <View
      style={[
        glassStyle,
        {
          borderRadius: radiusValue,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * GlassButton - A pressable glass card
 */
import { Pressable, PressableProps } from 'react-native';

interface GlassButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: GlassVariant;
  rounded?: RoundedSize;
  style?: ViewStyle;
  padding?: number;
}

export function GlassButton({
  children,
  variant = 'light',
  rounded = 'full',
  style,
  padding = 16,
  ...pressableProps
}: GlassButtonProps) {
  const glassStyle = glass[variant];
  const radiusValue = borderRadius[rounded];

  return (
    <Pressable
      style={({ pressed }) => [
        glassStyle,
        {
          borderRadius: radiusValue,
          padding,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}

/**
 * Preset glass card styles for common use cases
 */
export const glassPresets = {
  // Modal container
  modal: {
    ...glass.strong,
    borderRadius: borderRadius['2xl'],
    padding: 24,
  } as ViewStyle,

  // Standard card
  card: {
    ...glass.light,
    borderRadius: borderRadius.xl,
    padding: 16,
  } as ViewStyle,

  // Input field container
  input: {
    ...glass.subtle,
    borderRadius: borderRadius.lg,
    padding: 12,
  } as ViewStyle,

  // Tab bar
  tabBar: {
    ...glass.strong,
    borderRadius: 0,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  } as ViewStyle,

  // Floating action button
  fab: {
    ...glass.strong,
    borderRadius: borderRadius.full,
    ...shadows.xl,
  } as ViewStyle,

  // Toast/notification
  toast: {
    ...glass.strong,
    borderRadius: borderRadius.xl,
    padding: 12,
    ...shadows.large,
  } as ViewStyle,
};

export default GlassCard;
