import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { colors, glass, borderRadius, shadows } from '@/constants/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? colors.purple[300] : colors.purple[400],
        tabBarInactiveTintColor: isDark ? colors.gray[500] : colors.gray[400],
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          // Faux-glass styling (no BlurView)
          backgroundColor: isDark ? glass.dark.backgroundColor : colors.glass.white92,
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.glass.white30,
          // Ethereal shadow
          ...Platform.select({
            ios: {
              shadowColor: '#1F2687',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.3 : 0.15,
              shadowRadius: 16,
            },
            android: {
              elevation: 8,
            },
          }),
          // Rounded top corners for ethereal look
          borderTopLeftRadius: borderRadius['2xl'],
          borderTopRightRadius: borderRadius['2xl'],
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        headerStyle: {
          backgroundColor: isDark ? glass.dark.backgroundColor : colors.glass.white85,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.glass.white30,
        },
        headerTitleStyle: {
          fontFamily: 'Cinzel-SemiBold',
          fontSize: 18,
          color: isDark ? colors.white : colors.gray[800],
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="map-marker" color={color} />,
          headerShown: false, // Map will be full screen
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <TabBarIcon name="play-circle" color={color} />,
          headerShown: false, // Feed is full screen immersive
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => <TabBarIcon name="inbox" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
