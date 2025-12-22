import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuthStore } from '@/lib/useAuthStore';
import { colors, gradients, glass, borderRadius, shadows } from '@/constants/theme';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp, signInWithApple, resetPassword, isLoading, isAppleAuthAvailable } = useAuthStore();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (mode === 'forgotPassword') {
      const { error } = await resetPassword(email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Check your email for reset instructions');
        setMode('signIn');
      }
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (mode === 'signIn') {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.back();
      }
    } else {
      if (!firstName.trim()) {
        Alert.alert('Error', 'Please enter your first name');
        return;
      }
      if (!lastInitial.trim()) {
        Alert.alert('Error', 'Please enter your last initial');
        return;
      }
      // Create display name as "FirstName L."
      const displayName = `${firstName.trim()} ${lastInitial.trim().charAt(0).toUpperCase()}.`;
      const { error } = await signUp(email, password, displayName);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Success',
          'Check your email to confirm your account',
          [{ text: 'OK', onPress: () => setMode('signIn') }]
        );
      }
    }
  };

  const handleAppleSignIn = async () => {
    const { error } = await signInWithApple();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signIn':
        return 'Welcome Back';
      case 'signUp':
        return 'Create Account';
      case 'forgotPassword':
        return 'Reset Password';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'signIn':
        return 'Sign In';
      case 'signUp':
        return 'Create Account';
      case 'forgotPassword':
        return 'Send Reset Link';
    }
  };

  return (
    <LinearGradient
      colors={gradients.etherealBackground as [string, string, ...string[]]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Close button */}
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <View style={styles.closeButtonCircle}>
            <FontAwesome name="times" size={18} color={colors.gray[600]} />
          </View>
        </Pressable>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <FontAwesome name="map-marker" size={40} color={colors.purple[400]} />
            </View>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>
              {mode === 'forgotPassword'
                ? "Enter your email and we'll send you reset instructions"
                : 'Join the PrayerMap community'}
            </Text>
          </View>

          {/* Form - Glass Card */}
          <View style={styles.formCard}>
            {mode === 'signUp' && (
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.firstNameInput]}>
                  <FontAwesome name="user" size={18} color={colors.purple[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor={colors.gray[400]}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoComplete="given-name"
                  />
                </View>
                <View style={[styles.inputContainer, styles.lastInitialInput]}>
                  <TextInput
                    style={[styles.input, styles.lastInitialText]}
                    placeholder="Last Initial"
                    placeholderTextColor={colors.gray[400]}
                    value={lastInitial}
                    onChangeText={(text) => setLastInitial(text.slice(0, 1).toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={1}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <FontAwesome name="envelope" size={18} color={colors.purple[400]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.gray[400]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {mode !== 'forgotPassword' && (
              <View style={styles.inputContainer}>
                <FontAwesome name="lock" size={20} color={colors.purple[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.gray[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <FontAwesome
                    name={showPassword ? 'eye-slash' : 'eye'}
                    size={18}
                    color={colors.gray[400]}
                  />
                </Pressable>
              </View>
            )}

            {mode === 'signIn' && (
              <Pressable onPress={() => setMode('forgotPassword')}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
                pressed && styles.submitButtonPressed,
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>{getButtonText()}</Text>
              )}
            </Pressable>

            {/* Apple Sign In - only show on sign in/sign up screens on iOS */}
            {mode !== 'forgotPassword' && isAppleAuthAvailable && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={borderRadius.lg}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {mode === 'signIn' ? (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable onPress={() => setMode('signUp')}>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </Pressable>
              </View>
            ) : mode === 'signUp' ? (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Pressable onPress={() => setMode('signIn')}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setMode('signIn')}>
                <Text style={styles.footerLink}>Back to Sign In</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.white85,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.white30,
    ...shadows.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass.white85,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.white30,
    ...shadows.ethereal,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Cinzel-SemiBold',
    color: colors.gray[800],
    marginTop: 20,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: colors.gray[600],
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  formCard: {
    // Faux-glass card styling
    backgroundColor: colors.glass.white85,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.white30,
    padding: 24,
    marginBottom: 24,
    ...shadows.ethereal,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.glass.white30,
  },
  inputIcon: {
    width: 24,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    color: colors.gray[800],
  },
  forgotPassword: {
    color: colors.purple[400],
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'right',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: colors.purple[400],
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: 8,
    ...shadows.medium,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
  },
  footerText: {
    color: colors.gray[600],
    fontSize: 16,
    fontFamily: 'Inter',
  },
  footerLink: {
    color: colors.purple[400],
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  firstNameInput: {
    flex: 2,
  },
  lastInitialInput: {
    flex: 1,
    paddingHorizontal: 12,
  },
  lastInitialText: {
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.gray[500],
    fontSize: 14,
    fontFamily: 'Inter',
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
});
