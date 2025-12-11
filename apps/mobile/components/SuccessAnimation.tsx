import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

interface SuccessAnimationProps {
  visible: boolean;
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

export function SuccessAnimation({
  visible,
  message = 'Success!',
  onComplete,
  duration = 1500,
}: SuccessAnimationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset values
      scale.value = 0;
      opacity.value = 0;
      checkScale.value = 0;
      ringScale.value = 0;
      ringOpacity.value = 1;

      // Animate in
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });

      // Check mark bounce
      checkScale.value = withDelay(
        200,
        withSpring(1, { damping: 10, stiffness: 300 })
      );

      // Ring pulse
      ringScale.value = withDelay(
        300,
        withSequence(
          withTiming(1.5, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(2, { duration: 300 })
        )
      );
      ringOpacity.value = withDelay(
        300,
        withTiming(0, { duration: 700 })
      );

      // Auto dismiss
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 }, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onComplete]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, containerStyle]}>
          {/* Ring pulse effect */}
          <Animated.View style={[styles.ring, ringStyle]} />

          {/* Check circle */}
          <Animated.View style={[styles.checkCircle, checkStyle]}>
            <FontAwesome name="check" size={40} color="#fff" />
          </Animated.View>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    padding: 40,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#10B981',
    top: 40,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  message: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default SuccessAnimation;
