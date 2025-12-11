import { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuthStore } from '@/lib/useAuthStore';
import { useMyPrayersStore } from '@/lib/useMyPrayers';
import { CATEGORY_EMOJIS } from '@/lib/types/prayer';
import { EtherealBackground, GlassCard } from '@/components';
import { colors, glass, borderRadius, shadows, gradients } from '@/constants/theme';

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isLoading: authLoading } = useAuthStore();
  const {
    prayers,
    isLoading,
    stats,
    fetchMyPrayers,
    deletePrayer,
  } = useMyPrayersStore();

  // Fetch prayers on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchMyPrayers();
    }
  }, [user, fetchMyPrayers]);

  const handleRefresh = useCallback(() => {
    if (user) {
      fetchMyPrayers();
    }
  }, [user, fetchMyPrayers]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleDeletePrayer = (prayerId: string) => {
    Alert.alert(
      'Delete Prayer',
      'Are you sure you want to delete this prayer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePrayer(prayerId);
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to delete prayer');
            }
          },
        },
      ]
    );
  };

  // Get display name
  const displayName = user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Guest User';

  return (
    <EtherealBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.purple[400]}
          />
        }
      >
        {/* Header with safe area */}
        <View style={{ paddingTop: insets.top + 16 }} />

        {/* Avatar and user info - Glass Card */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <FontAwesome name="user" size={40} color={user ? colors.purple[400] : colors.gray[400]} />
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>
            {user ? user.email : 'Sign in to save your prayers'}
          </Text>
        </View>

        {/* Stats - Glass Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalPrayers}</Text>
              <Text style={styles.statLabel}>Prayers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalPrayedFor}</Text>
              <Text style={styles.statLabel}>Prayed For</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>Answered</Text>
            </View>
          </View>
        </View>

        {/* Auth Button */}
        {user ? (
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSignOut}
            disabled={authLoading}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        )}

        {/* My Prayers Section */}
        {user && (
          <View style={styles.prayersSection}>
            <Text style={styles.sectionTitle}>My Prayers</Text>

            {isLoading && prayers.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.purple[400]} />
              </View>
            )}

            {!isLoading && prayers.length === 0 && (
              <View style={styles.emptyPrayers}>
                <Text style={styles.emptyText}>No prayers yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the + button on the map to share your first prayer
                </Text>
              </View>
            )}

            {prayers.map((prayer) => (
              <View key={prayer.id} style={styles.prayerCard}>
                <View style={styles.prayerHeader}>
                  <View style={styles.prayerEmojiContainer}>
                    <Text style={styles.prayerEmoji}>
                      {CATEGORY_EMOJIS[prayer.category] || '🙏'}
                    </Text>
                  </View>
                  <View style={styles.prayerInfo}>
                    <Text style={styles.prayerTitle} numberOfLines={1}>
                      {prayer.title || prayer.content.substring(0, 40)}
                    </Text>
                    <View style={styles.prayerMeta}>
                      <Text style={styles.prayerDate}>
                        {formatDate(prayer.created_at)}
                      </Text>
                      {prayer.is_anonymous && (
                        <View style={styles.anonymousBadge}>
                          <FontAwesome name="user-secret" size={10} color={colors.gray[400]} />
                          <Text style={styles.anonymousText}>Anonymous</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeletePrayer(prayer.id)}
                  >
                    <FontAwesome name="trash-o" size={18} color={colors.error} />
                  </Pressable>
                </View>

                {prayer.response_count > 0 && (
                  <View style={styles.responseIndicator}>
                    <FontAwesome name="heart" size={12} color={colors.pink[400]} />
                    <Text style={styles.responseCount}>
                      {prayer.response_count} {prayer.response_count === 1 ? 'person has' : 'people have'} prayed
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem icon="bell" label="Notification Settings" />
          <MenuItem icon="lock" label="Privacy" />
          <MenuItem icon="question-circle" label="Help & Support" />
          <MenuItem icon="info-circle" label="About PrayerMap" />
        </View>
      </ScrollView>
    </EtherealBackground>
  );
}

function MenuItem({ icon, label }: { icon: string; label: string }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
    >
      <FontAwesome name={icon as any} size={20} color={colors.purple[400]} style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{label}</Text>
      <FontAwesome name="chevron-right" size={14} color={colors.gray[300]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    backgroundColor: colors.glass.white85,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.white30,
    ...shadows.ethereal,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass.white92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.glass.white30,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Cinzel-SemiBold',
    color: colors.gray[800],
  },
  email: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.gray[500],
    marginTop: 4,
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.glass.white85,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glass.white30,
    paddingVertical: 16,
    ...shadows.default,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.glass.white30,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.purple[400],
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.gray[500],
    marginTop: 4,
  },
  signInButton: {
    backgroundColor: colors.purple[400],
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  signInText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  signOutButton: {
    backgroundColor: colors.glass.white85,
    borderWidth: 1,
    borderColor: colors.error,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.error,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  // My Prayers Section
  prayersSection: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: colors.glass.white85,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.white30,
    paddingTop: 16,
    paddingBottom: 8,
    ...shadows.default,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cinzel-SemiBold',
    color: colors.gray[800],
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyPrayers: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.gray[500],
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: 4,
  },
  prayerCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.white30,
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerEmojiContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.white92,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prayerEmoji: {
    fontSize: 18,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: colors.gray[800],
  },
  prayerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  prayerDate: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.gray[400],
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  anonymousText: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: colors.gray[400],
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 48,
    gap: 6,
  },
  responseCount: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.pink[400],
  },
  // Menu Section
  menuSection: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: colors.glass.white85,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.white30,
    overflow: 'hidden',
    ...shadows.default,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.white30,
  },
  menuItemPressed: {
    backgroundColor: colors.glass.white20,
  },
  menuIcon: {
    width: 28,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
    color: colors.gray[800],
  },
});
