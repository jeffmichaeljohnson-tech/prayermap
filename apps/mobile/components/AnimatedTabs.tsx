import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

interface Tab {
  key: string;
  label: string;
  badge?: number;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeKey: string;
  onTabPress: (key: string) => void;
}

export function AnimatedTabs({ tabs, activeKey, onTabPress }: AnimatedTabsProps) {
  const activeIndex = tabs.findIndex(t => t.key === activeKey);
  const indicatorPosition = useSharedValue(0);
  const tabWidths = useSharedValue<number[]>(tabs.map(() => 0));

  // Update indicator position when active tab changes
  useEffect(() => {
    const targetX = tabWidths.value
      .slice(0, activeIndex)
      .reduce((sum, w) => sum + w + 8, 0); // 8 = gap

    indicatorPosition.value = withSpring(targetX, {
      damping: 20,
      stiffness: 200,
    });
  }, [activeIndex, tabWidths.value]);

  const indicatorStyle = useAnimatedStyle(() => {
    const width = tabWidths.value[activeIndex] || 100;
    return {
      transform: [{ translateX: indicatorPosition.value }],
      width,
    };
  });

  const handleTabLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    const newWidths = [...tabWidths.value];
    newWidths[index] = width;
    tabWidths.value = newWidths;
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab, index) => {
          const isActive = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => onTabPress(tab.key)}
              onLayout={(e) => handleTabLayout(index, e)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.badge !== undefined && tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4169E1',
  },
  indicator: {
    position: 'absolute',
    bottom: 12,
    height: 36,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    zIndex: 0,
  },
  badge: {
    backgroundColor: '#EC4899',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default AnimatedTabs;
