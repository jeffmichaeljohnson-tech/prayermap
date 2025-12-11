/**
 * VideoTextEditor - TikTok/Instagram-style video text overlay editor
 *
 * UI Layout (matching TikTok/Instagram):
 * - Full-screen looping video preview
 * - Top bar: Back (left), Title (center), Next (right)
 * - Right sidebar: Text, Stickers icons (vertically stacked)
 * - Text overlays with drag, pinch-to-resize, two-finger rotate
 * - Bottom sheet for text styling when editing
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Text overlay data structure (stored in database)
export interface TextOverlay {
  id: string;
  text: string;
  x: number; // 0-1 relative position
  y: number; // 0-1 relative position
  scale: number;
  rotation: number; // degrees
  color: string;
  fontStyle: 'default' | 'bold' | 'serif' | 'script';
}

// Available colors (TikTok-style palette)
const COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#FF0050', // TikTok Red/Pink
  '#00F2EA', // TikTok Cyan
  '#FFD700', // Gold
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#A855F7', // Purple
  '#F59E0B', // Amber
  '#10B981', // Green
];

// Font styles
const FONT_STYLES: { key: TextOverlay['fontStyle']; label: string }[] = [
  { key: 'default', label: 'Classic' },
  { key: 'bold', label: 'Bold' },
  { key: 'serif', label: 'Serif' },
  { key: 'script', label: 'Script' },
];

interface VideoTextEditorProps {
  videoUri: string;
  videoDuration: number;
  onComplete: (videoUri: string, overlays: TextOverlay[]) => void;
  onCancel: () => void;
}

export function VideoTextEditor({
  videoUri,
  videoDuration,
  onComplete,
  onCancel,
}: VideoTextEditorProps) {
  const insets = useSafeAreaInsets();

  // Video player hook (expo-video) - loop continuously
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
  });

  // Ensure video autoplays and loops
  React.useEffect(() => {
    // Delay to ensure player is fully initialized before playing
    const playTimer = setTimeout(() => {
      player.play();
    }, 300);

    // Subscribe to playToEnd event to ensure looping works
    const subscription = player.addListener('playToEnd', () => {
      // Seek back to start and play again
      player.currentTime = 0;
      player.play();
    });

    return () => {
      clearTimeout(playTimer);
      subscription.remove();
    };
  }, [player]);

  // State
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [selectedFontStyle, setSelectedFontStyle] = useState<TextOverlay['fontStyle']>('default');
  const [showStylePanel, setShowStylePanel] = useState(false);

  // Get selected overlay
  const selectedOverlay = textOverlays.find(o => o.id === selectedOverlayId);
  const editingOverlay = textOverlays.find(o => o.id === editingOverlayId);

  // Add new text overlay
  const handleAddText = useCallback(() => {
    if (!newText.trim()) {
      setIsAddingText(false);
      setEditingOverlayId(null);
      return;
    }

    if (editingOverlayId) {
      // Update existing overlay
      setTextOverlays(prev =>
        prev.map(o =>
          o.id === editingOverlayId
            ? { ...o, text: newText.trim(), color: selectedColor, fontStyle: selectedFontStyle }
            : o
        )
      );
      setEditingOverlayId(null);
    } else {
      // Create new overlay
      const newOverlay: TextOverlay = {
        id: Date.now().toString(),
        text: newText.trim(),
        x: 0.5,
        y: 0.4,
        scale: 1,
        rotation: 0,
        color: selectedColor,
        fontStyle: selectedFontStyle,
      };
      setTextOverlays(prev => [...prev, newOverlay]);
      setSelectedOverlayId(newOverlay.id);
    }

    setNewText('');
    setIsAddingText(false);
  }, [newText, selectedColor, selectedFontStyle, editingOverlayId]);

  // Start editing existing overlay
  const startEditingOverlay = useCallback((overlay: TextOverlay) => {
    setEditingOverlayId(overlay.id);
    setNewText(overlay.text);
    setSelectedColor(overlay.color);
    setSelectedFontStyle(overlay.fontStyle);
    setIsAddingText(true);
  }, []);

  // Update overlay position
  const updateOverlayPosition = useCallback((id: string, x: number, y: number) => {
    setTextOverlays(prev =>
      prev.map(o => (o.id === id ? { ...o, x, y } : o))
    );
  }, []);

  // Update overlay scale
  const updateOverlayScale = useCallback((id: string, scale: number) => {
    setTextOverlays(prev =>
      prev.map(o => (o.id === id ? { ...o, scale: Math.max(0.5, Math.min(3, scale)) } : o))
    );
  }, []);

  // Update overlay rotation
  const updateOverlayRotation = useCallback((id: string, rotation: number) => {
    setTextOverlays(prev =>
      prev.map(o => (o.id === id ? { ...o, rotation } : o))
    );
  }, []);

  // Delete selected overlay
  const deleteSelectedOverlay = useCallback(() => {
    if (selectedOverlayId) {
      setTextOverlays(prev => prev.filter(o => o.id !== selectedOverlayId));
      setSelectedOverlayId(null);
    }
  }, [selectedOverlayId]);

  // Handle done - pass overlay data back
  const handleDone = useCallback(() => {
    onComplete(videoUri, textOverlays);
  }, [videoUri, textOverlays, onComplete]);

  // Deselect when tapping video background
  const handleBackgroundTap = useCallback(() => {
    if (selectedOverlayId && !isAddingText) {
      setSelectedOverlayId(null);
    }
  }, [selectedOverlayId, isAddingText]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen looping video */}
      <Pressable style={styles.videoContainer} onPress={handleBackgroundTap}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
      </Pressable>

      {/* Text overlays */}
      {textOverlays.map(overlay => (
        <DraggableText
          key={overlay.id}
          overlay={overlay}
          isSelected={overlay.id === selectedOverlayId}
          onSelect={() => setSelectedOverlayId(overlay.id)}
          onDoublePress={() => startEditingOverlay(overlay)}
          onPositionChange={(x, y) => updateOverlayPosition(overlay.id, x, y)}
          onScaleChange={(scale) => updateOverlayScale(overlay.id, scale)}
          onRotationChange={(rotation) => updateOverlayRotation(overlay.id, rotation)}
        />
      ))}

      {/* Top bar - TikTok style */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.topBackButton} onPress={onCancel}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>

        <Text style={styles.topTitle}>Edit</Text>

        <Pressable style={styles.nextButton} onPress={handleDone}>
          <Text style={styles.nextButtonText}>Next</Text>
        </Pressable>
      </View>

      {/* Right sidebar - TikTok style - more prominent */}
      <View style={[styles.rightSidebar, { top: insets.top + 80 }]}>
        {/* Add Text Button - made more visible */}
        <Pressable
          style={styles.sidebarButton}
          onPress={() => {
            setEditingOverlayId(null);
            setNewText('');
            setIsAddingText(true);
          }}
        >
          <View style={styles.sidebarIconBgProminent}>
            <Ionicons name="text" size={26} color="#fff" />
          </View>
          <Text style={styles.sidebarLabelProminent}>Text</Text>
        </Pressable>

        {/* Delete Button (only when text selected) */}
        {selectedOverlayId && (
          <Pressable style={styles.sidebarButton} onPress={deleteSelectedOverlay}>
            <View style={[styles.sidebarIconBg, styles.deleteIconBg]}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.sidebarLabel}>Delete</Text>
          </Pressable>
        )}
      </View>

      {/* Bottom hint */}
      {!isAddingText && (
        <View style={[styles.bottomHint, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.hintText}>
            {selectedOverlayId
              ? 'Drag to move • Pinch to resize • Double-tap to edit'
              : textOverlays.length > 0
              ? 'Tap text to select'
              : 'Tap "Text" to add caption'}
          </Text>
        </View>
      )}

      {/* Text input modal - TikTok style */}
      {isAddingText && (
        <KeyboardAvoidingView
          style={styles.textInputModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.textInputBackdrop}
            onPress={() => {
              setIsAddingText(false);
              setEditingOverlayId(null);
              setNewText('');
            }}
          />

          <View style={[styles.textInputArea, { paddingBottom: insets.bottom + 20 }]}>
            {/* Color picker row */}
            <View style={styles.colorPickerRow}>
              {COLORS.map(color => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    color === selectedColor && styles.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            {/* Font style picker */}
            <View style={styles.fontStyleRow}>
              {FONT_STYLES.map(style => (
                <Pressable
                  key={style.key}
                  style={[
                    styles.fontStyleButton,
                    style.key === selectedFontStyle && styles.fontStyleButtonSelected,
                  ]}
                  onPress={() => setSelectedFontStyle(style.key)}
                >
                  <Text
                    style={[
                      styles.fontStyleText,
                      style.key === selectedFontStyle && styles.fontStyleTextSelected,
                    ]}
                  >
                    {style.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Text input with done button */}
            <View style={styles.textInputRow}>
              <TextInput
                style={[styles.textInput, { color: selectedColor }]}
                value={newText}
                onChangeText={setNewText}
                placeholder="Type text..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoFocus
                multiline
                maxLength={150}
              />
              <Pressable
                style={[styles.textDoneButton, !newText.trim() && styles.textDoneButtonDisabled]}
                onPress={handleAddText}
                disabled={!newText.trim()}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </GestureHandlerRootView>
  );
}

// Draggable text component with gesture support
interface DraggableTextProps {
  overlay: TextOverlay;
  isSelected: boolean;
  onSelect: () => void;
  onDoublePress: () => void;
  onPositionChange: (x: number, y: number) => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
}

function DraggableText({
  overlay,
  isSelected,
  onSelect,
  onDoublePress,
  onPositionChange,
  onScaleChange,
  onRotationChange,
}: DraggableTextProps) {
  const translateX = useSharedValue(overlay.x * SCREEN_WIDTH);
  const translateY = useSharedValue(overlay.y * SCREEN_HEIGHT);
  const scale = useSharedValue(overlay.scale);
  const rotation = useSharedValue(overlay.rotation);

  const savedTranslateX = useSharedValue(overlay.x * SCREEN_WIDTH);
  const savedTranslateY = useSharedValue(overlay.y * SCREEN_HEIGHT);
  const savedScale = useSharedValue(overlay.scale);
  const savedRotation = useSharedValue(overlay.rotation);

  const lastTap = useSharedValue(0);

  // Track element dimensions for proper centering
  const elementWidth = useSharedValue(0);
  const elementHeight = useSharedValue(0);

  const handleLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    elementWidth.value = width;
    elementHeight.value = height;
  }, []);

  const updatePosition = useCallback((x: number, y: number) => {
    onPositionChange(x / SCREEN_WIDTH, y / SCREEN_HEIGHT);
  }, [onPositionChange]);

  // Pan gesture - single finger only for dragging
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      runOnJS(updatePosition)(translateX.value, translateY.value);
    });

  // Pinch gesture - two fingers for scaling
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
    })
    .onEnd(() => {
      runOnJS(onScaleChange)(scale.value);
    });

  // Rotation gesture - two fingers for rotating
  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      rotation.value = savedRotation.value + (event.rotation * 180 / Math.PI);
    })
    .onEnd(() => {
      runOnJS(onRotationChange)(rotation.value);
    });

  // Tap gesture for selection and double-tap for edit
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      const now = Date.now();
      if (now - lastTap.value < 300) {
        runOnJS(onDoublePress)();
      } else {
        runOnJS(onSelect)();
      }
      lastTap.value = now;
    });

  // Two-finger gestures (pinch + rotate) run simultaneously
  const twoFingerGestures = Gesture.Simultaneous(pinchGesture, rotationGesture);

  // Compose: tap always active, pan OR two-finger (race), but allow simultaneous transforms
  const composedGesture = Gesture.Simultaneous(
    tapGesture,
    Gesture.Race(panGesture, twoFingerGestures)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      // Offset by half the element dimensions to center on the position point
      { translateX: translateX.value - SCREEN_WIDTH / 2 - elementWidth.value / 2 },
      { translateY: translateY.value - SCREEN_HEIGHT / 2 - elementHeight.value / 2 },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // Font family based on style
  const getFontStyle = () => {
    switch (overlay.fontStyle) {
      case 'bold':
        return { fontWeight: '900' as const };
      case 'serif':
        return { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };
      case 'script':
        return { fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive', fontStyle: 'italic' as const };
      default:
        return { fontWeight: '600' as const };
    }
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.textOverlay,
          animatedStyle,
          isSelected && styles.textOverlaySelected,
        ]}
        onLayout={handleLayout}
      >
        <Text
          style={[
            styles.textOverlayText,
            {
              color: overlay.color,
              textShadowColor: overlay.color === '#000000' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.75)',
            },
            getFontStyle(),
          ]}
        >
          {overlay.text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  topBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#FF0050',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  rightSidebar: {
    position: 'absolute',
    right: 8,
    alignItems: 'center',
    gap: 20,
  },
  sidebarButton: {
    alignItems: 'center',
  },
  sidebarIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sidebarIconBgProminent: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteIconBg: {
    backgroundColor: 'rgba(255,0,80,0.4)',
  },
  sidebarLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  sidebarLabelProminent: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
  },
  textOverlay: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2,
    left: SCREEN_WIDTH / 2,
    padding: 8,
  },
  textOverlaySelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  textOverlayText: {
    fontSize: 32,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  textInputModal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  textInputBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  textInputArea: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  colorPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  fontStyleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  fontStyleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fontStyleButtonSelected: {
    backgroundColor: '#FF0050',
  },
  fontStyleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  fontStyleTextSelected: {
    color: '#fff',
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    minHeight: 44,
    maxHeight: 120,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  textDoneButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF0050',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textDoneButtonDisabled: {
    backgroundColor: 'rgba(255,0,80,0.3)',
  },
});

export default VideoTextEditor;
