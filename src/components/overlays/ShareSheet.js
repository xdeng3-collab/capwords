import React, { useRef, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { COLORS, RADIUS } from '../../theme';
import ShareCard from '../ui/ShareCard';
import { PixelButton } from '../ui/PixelButton';

/**
 * Previews a ShareCard and hands a picture of it to the iOS share sheet.
 * `card` is ShareCard's props; `message` goes along as the post's text where
 * the target app takes one.
 */
export default function ShareSheet({ visible, card, message, onClose, onShared }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: 1200 });
      const result = await Share.share({ url: uri, message });
      if (result.action === Share.sharedAction) onShared?.(result.activityType);
    } catch (error) {
      console.error('Sharing the card failed', error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.sheet}>
          {card ? <ShareCard ref={cardRef} {...card} /> : null}
          {failed ? (
            <Text style={styles.error}>Couldn't make the picture. Try again.</Text>
          ) : null}
          <PixelButton
            label={busy ? 'Getting it ready...' : 'Share'}
            icon="share"
            color={COLORS.secondary}
            onPress={share}
            disabled={busy}
            size="lg"
            style={styles.button}
          />
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>NOT NOW</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,22,14,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { alignItems: 'center', gap: 14 },
  button: { alignSelf: 'stretch', borderRadius: RADIUS.sm },
  error: { color: '#FBF3E0', fontSize: 13, fontWeight: '700' },
  close: { color: '#FBF3E0', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
