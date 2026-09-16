import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS } from '../config';
import { PixelButton } from '../components/UI';
import PixelIcon from '../components/PixelIcon';
import PetSprite from '../components/PetSprite';
import {
  isAppleSignInAvailable,
  onAuthChange,
  resendConfirmation,
  sendPasswordReset,
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
} from '../services/accountService';

/**
 * Sign in or make an account.
 *
 * Reachable from two places and it has to behave the same in both: the
 * account step in onboarding, and the account row in Profile. `onDone` fires
 * only on a real signed-in session, and is handed `{ signedUp }` so the caller
 * can tell a fresh account from a returning one.
 *
 * With email confirmation turned on, signing up lands on the "check your
 * inbox" panel instead, because there is no session yet. Tapping the link in
 * that email deep-links back into the app, which lands the session and moves
 * this screen on by itself.
 */
/**
 * A quiet text action. Same reason as onboarding's: the rule is a border under
 * the tap target, because `textDecorationLine: 'underline'` runs through
 * descenders and turns a 'y' before a space into a stray full stop.
 */
function LinkText({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={styles.link}
    >
      <Text style={styles.linkText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AuthScreen({ onDone, onCancel, initialMode = 'signin' }) {
  // 'signin' | 'signup' | 'sent'
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [appleReady, setAppleReady] = useState(false);

  // Drawn only where it actually works. On a build signed by a free Apple
  // team the capability is missing, so the button hides rather than failing
  // under the user's finger.
  useEffect(() => {
    let alive = true;
    isAppleSignInAvailable().then((ok) => alive && setAppleReady(ok));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (task) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      return await task();
    } finally {
      setBusy(false);
    }
  };

  // `signedUp` matters to onboarding: a brand new account holds nothing worth
  // restoring, so it has to keep asking the setup questions.
  const succeed = (signedUp) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onDone?.({ signedUp: Boolean(signedUp) });
  };

  const handleEmailSubmit = () =>
    run(async () => {
      if (!email.trim() || !password) {
        setError('Fill in your email and password first.');
        return;
      }

      const result =
        mode === 'signup'
          ? await signUpWithEmail(email, password, displayName)
          : await signInWithEmail(email, password);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.needsConfirmation) {
        setMode('sent');
        return;
      }
      succeed(mode === 'signup');
    });

  const handleApple = () =>
    run(async () => {
      const result = await signInWithApple();
      if (result.ok) {
        succeed(false);
        return;
      }
      // Backing out of Apple's sheet is a choice, not a problem to report.
      if (!result.cancelled) setError(result.error);
    });

  const handleForgotPassword = () =>
    run(async () => {
      if (!email.trim()) {
        setError('Type your email above first, then tap this again.');
        return;
      }
      const result = await sendPasswordReset(email);
      if (result.ok) setNotice('Password reset link sent. Check your inbox.');
      else setError(result.error);
    });

  const handleResend = () =>
    run(async () => {
      const result = await resendConfirmation(email);
      if (result.ok) setNotice('Sent again. It can take a minute to arrive.');
      else setError(result.error);
    });

  // While the "check your inbox" panel is up, the confirmation link is the
  // thing we are waiting on: tapping it in Mail comes back through the app's
  // deep link and lands a session here. Move on the moment that happens rather
  // than making someone who just tapped it type their password again.
  useEffect(() => {
    if (mode !== 'sent') return undefined;
    let armed = false;
    const stop = onAuthChange((session) => {
      // The first callback reports the session as it already is; only a change
      // after that is the link being tapped.
      if (!armed) {
        armed = true;
        return;
      }
      if (session) succeed(true);
    });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---- "check your inbox" ----
  if (mode === 'sent') {
    return (
      <View style={styles.screen}>
        <View style={styles.centered}>
          <PetSprite mood="content" pixelSize={10} />
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.body}>
            We sent a confirmation link to {email.trim()}. Tap it and this screen lets you
            straight in — no need to type anything again.
          </Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <View style={styles.footer}>
          <PixelButton
            label="BACK TO LOG IN"
            size="lg"
            style={styles.fill}
            onPress={() => {
              setMode('signin');
              setPassword('');
              setError('');
              setNotice('');
            }}
          />
          <LinkText label="Send it again" onPress={handleResend} disabled={busy} />
        </View>
      </View>
    );
  }

  const signingUp = mode === 'signup';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.top}>
        {onCancel ? (
          <TouchableOpacity onPress={onCancel} style={styles.back} activeOpacity={0.7}>
            <PixelIcon name="chevron" size={18} color={COLORS.text} style={styles.backIcon} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PetSprite mood="happy" pixelSize={9} />
        <Text style={styles.title}>{signingUp ? 'Make an account' : 'Welcome back'}</Text>
        <Text style={styles.body}>
          {signingUp
            ? 'An account keeps your pals and your progress if you change phones. Your photos stay on this one.'
            : 'Log back in to find your pals waiting.'}
        </Text>

        {signingUp ? (
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={40}
            returnKeyType="next"
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder={signingUp ? 'Password (6+ characters)' : 'Password'}
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          // Tells the keychain to offer a strong password on sign-up and the
          // saved one on log in, instead of guessing from the field order.
          textContentType={signingUp ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={handleEmailSubmit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <PixelButton
          label={busy ? 'ONE MOMENT...' : signingUp ? 'CREATE ACCOUNT' : 'LOG IN'}
          size="lg"
          style={styles.fill}
          disabled={busy}
          onPress={handleEmailSubmit}
        />

        {!signingUp ? (
          <LinkText
            label="Forgot your password?"
            onPress={handleForgotPassword}
            disabled={busy}
          />
        ) : null}

        {appleReady ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            {/* Apple's own button, as their guidelines require. The corner
                radius is dialled down to sit with the pixel styling. */}
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                signingUp
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={RADIUS.md}
              style={styles.appleButton}
              onPress={handleApple}
            />
          </>
        ) : null}

        {busy ? <ActivityIndicator color={COLORS.primary} style={styles.spinner} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <LinkText
          label={signingUp ? 'I already have an account' : 'New here? Make an account'}
          onPress={() => {
            setMode(signingUp ? 'signin' : 'signup');
            setError('');
            setNotice('');
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  top: { paddingHorizontal: 24, height: 40, justifyContent: 'center' },
  back: { width: 36, height: 36, marginLeft: -8, justifyContent: 'center' },
  backIcon: { transform: [{ rotate: '180deg' }] },

  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 30,
    paddingVertical: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 30,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 4,
  },

  input: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  fill: { alignSelf: 'stretch', width: '100%', marginTop: 4 },

  error: {
    alignSelf: 'stretch',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.danger,
    textAlign: 'center',
  },
  notice: {
    alignSelf: 'stretch',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.leafDark,
    textAlign: 'center',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  dividerLine: { flex: 1, height: 2, backgroundColor: COLORS.panel },
  dividerText: { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: COLORS.textMuted },
  appleButton: { alignSelf: 'stretch', height: 50 },

  spinner: { marginTop: 4 },

  // gap keeps the quiet link off the button's drop shadow; the bottom padding
  // keeps it off the home indicator, which eats taps meant for it.
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 56,
    paddingTop: 12,
    gap: 18,
    alignItems: 'center',
  },
  link: {
    alignSelf: 'center',
    paddingBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryDark,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
});
