import React, { useCallback } from 'react';
import { StyleSheet, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleOnPress?: number;
  hapticFeedback?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection';
}

export function AnimatedButton({
  children,
  style,
  scaleOnPress = 0.95,
  hapticFeedback = true,
  hapticType = 'light',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback((e: any) => {
    scale.value = withSpring(scaleOnPress, { damping: 15, stiffness: 400 });

    if (hapticFeedback && !disabled) {
      const hapticStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
        selection: null,
      }[hapticType];

      if (hapticType === 'selection') {
        Haptics.selectionAsync();
      } else if (hapticStyle) {
        Haptics.impactAsync(hapticStyle);
      }
    }

    onPressIn?.(e);
  }, [scaleOnPress, hapticFeedback, hapticType, disabled, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    onPressOut?.(e);
  }, [onPressOut]);

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

export default AnimatedButton;
