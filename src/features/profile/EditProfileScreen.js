import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS } from '../../theme';
import { BackButton, PixelButton, useAlert } from '../../components';
import { useSession } from '../../hooks/useSession';
import {
  checkUsername,
  isValidUsername,
  setUsername,
  updateMyProfile,
} from '../../services/accountService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { successFeedback } from '../../utils/haptics';

const NAME_MAX = 40;

/**
 * Name and username together, Instagram/Duolingo style: the name is what
 * pals see, the username is the unique handle they use to find and add you.
 * The username only exists with an account, so signed out this is just the
 * name.
 */
export default function EditProfileScreen({ navigation }) {
  const showAlert = useAlert();
  const { user, account, refreshAccount } = useSession();
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [handle, setHandle] = useState(account?.username || '');
  // idle | checking | available | taken | invalid | mine | error
  const [handleState, setHandleState] = useState('mine');
  const [suggestion, setSuggestion] = useState(null);
  const [saving, setSaving] = useState(false);
  const checkSeq = useRef(0);

  const originalHandle = account?.username || '';
  const hasAccount = Boolean(user);

  useEffect(() => {
    getUserProfile().then((p) => {
      setName(p.name || '');
      setOriginalName(p.name || '');
    });
  }, []);

  // Live availability, debounced so we ask once the typing pauses.
  useEffect(() => {
    if (!hasAccount) return undefined;
    setSuggestion(null);
    if (handle === originalHandle) {
      setHandleState('mine');
      return undefined;
    }
    if (!isValidUsername(handle)) {
      setHandleState(handle.length ? 'invalid' : 'idle');
      return undefined;
    }
    setHandleState('checking');
    const seq = ++checkSeq.current;
    const timer = setTimeout(async () => {
      const result = await checkUsername(handle);
      if (seq !== checkSeq.current) return; // a newer keystroke won
      if (!result.ok) {
        setHandleState('error');
        return;
      }
      setHandleState(result.available ? 'available' : 'taken');
      setSuggestion(result.suggestion || null);
    }, 450);
    return () => clearTimeout(timer);
  }, [handle, originalHandle, hasAccount]);

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== originalName;
  const handleChanged = hasAccount && handle !== originalHandle;
  const handleOk = !handleChanged || handleState === 'available';
  const canSave = !saving && trimmedName.length > 0 && (nameChanged || handleChanged) && handleOk;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (handleChanged) {
        const result = await setUsername(handle);
        if (!result.ok) {
          // Someone may have claimed it between the check and the save.
          showAlert('That did not work', result.error);
          setHandleState('taken');
          return;
        }
      }
      if (nameChanged) {
        await updateUserProfile({ name: trimmedName });
        if (hasAccount) {
          const result = await updateMyProfile({ display_name: trimmedName });
          if (!result.ok) {
            // The phone already has the new name; the account catches up later.
            showAlert('Saved on this phone', 'Your pals will see your new name next time you are online.');
          }
        }
      }
      if (hasAccount) await refreshAccount();
      successFeedback();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>EDIT PROFILE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Preview of how pals will see you */}
        <View style={styles.preview}>
          <Text style={styles.previewName} numberOfLines={1}>
            {trimmedName || 'Your name'}
          </Text>
          {hasAccount ? (
            <Text style={styles.previewHandle} numberOfLines={1}>
              @{handle || 'username'}
            </Text>
          ) : null}
        </View>

        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={COLORS.textMuted}
          maxLength={NAME_MAX}
          returnKeyType="done"
        />
        <Text style={styles.help}>What pals see. Any characters, up to {NAME_MAX}.</Text>

        {hasAccount ? (
          <>
            <Text style={[styles.label, styles.labelSpaced]}>USERNAME</Text>
            <View style={styles.handleInputWrap}>
              <Text style={styles.at}>@</Text>
              <TextInput
                style={styles.handleInput}
                value={handle}
                onChangeText={(v) => setHandle(v.toLowerCase().replace(/\s/g, ''))}
                placeholder="username"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
              />
              {handleState === 'checking' ? (
                <ActivityIndicator size="small" color={COLORS.textMuted} />
              ) : null}
            </View>
            <HandleStatus state={handleState} suggestion={suggestion} onUse={setHandle} />
            <Text style={styles.help}>
              How pals find and add you. Letters, numbers and _ only, 3-20 characters.
            </Text>
          </>
        ) : (
          <View style={styles.signedOutNote}>
            <Text style={styles.signedOutText}>
              Sign in to get a username, so pals can find and add you.
            </Text>
          </View>
        )}

        <PixelButton
          label={saving ? 'Saving...' : 'Save'}
          icon="check"
          color={COLORS.leaf}
          size="lg"
          style={styles.save}
          onPress={save}
          disabled={!canSave}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HandleStatus({ state, suggestion, onUse }) {
  if (state === 'available') return <Text style={[styles.status, styles.ok]}>✓ Available</Text>;
  if (state === 'mine') return <Text style={[styles.status, styles.muted]}>This is your username</Text>;
  if (state === 'invalid') {
    return <Text style={[styles.status, styles.bad]}>3-20 characters: letters, numbers or _</Text>;
  }
  if (state === 'error') {
    return <Text style={[styles.status, styles.bad]}>Could not check right now. Are you online?</Text>;
  }
  if (state === 'taken') {
    return (
      <View style={styles.takenRow}>
        <Text style={[styles.status, styles.bad]}>✗ Already taken</Text>
        {suggestion ? (
          <TouchableOpacity onPress={() => onUse(suggestion)} hitSlop={8}>
            <Text style={styles.suggestion}>Try @{suggestion}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
  return <Text style={styles.status}> </Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSpacer: { width: 40 },
  content: { padding: 22, paddingBottom: 140 },
  preview: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
  },
  previewName: { fontSize: 22, fontWeight: '900', color: COLORS.text, maxWidth: '90%' },
  previewHandle: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '900', color: COLORS.textLight, letterSpacing: 1, marginBottom: 8 },
  labelSpaced: { marginTop: 22 },
  input: {
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
  handleInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
  },
  at: { fontSize: 16, fontWeight: '900', color: COLORS.textMuted, marginRight: 2 },
  handleInput: { flex: 1, paddingVertical: 13, fontSize: 16, fontWeight: '700', color: COLORS.text },
  status: { fontSize: 13, fontWeight: '800', marginTop: 8, color: COLORS.textMuted },
  ok: { color: COLORS.leafDark },
  bad: { color: COLORS.danger },
  muted: { color: COLORS.textMuted },
  takenRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  suggestion: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.water,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  help: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, marginTop: 6, lineHeight: 17 },
  signedOutNote: {
    marginTop: 22,
    padding: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.outlineSoft,
  },
  signedOutText: { fontSize: 13, fontWeight: '700', color: COLORS.textLight },
  save: { marginTop: 30 },
});
