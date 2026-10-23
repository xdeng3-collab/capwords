import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { APP_LINKS } from '../../config';
import { COLORS, RADIUS } from '../../theme';
import ShareCard from '../ui/ShareCard';
import { PixelButton } from '../ui/PixelButton';

/**
 * Previews a ShareCard and hands a picture of it to the iOS share sheet.
 * `card` is ShareCard's props; `message` goes along as the post's text where
 * the target app takes one, with the download link once there is one.
 *
 * The card is drawn nearly as wide as the screen and captured at the
 * screen's own pixel density, never resized: about 1080x1440 on a phone,
 * sharp, and always 3:4.
 */
export default function ShareSheet({ visible, card, message, onClose, onShared }) {
  const cardRef = useRef(null);
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(screenWidth - 32, 380);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const link = APP_LINKS.download;
      const text = link && message ? `${message} ${link}` : message;
      const result = await Share.share({ url: uri, message: text });
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
          {card ? <ShareCard ref={cardRef} {...card} width={cardWidth} /> : null}
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sheet: { alignItems: 'center', gap: 14 },
  button: { alignSelf: 'stretch', borderRadius: RADIUS.sm },
  error: { color: '#FBF3E0', fontSize: 13, fontWeight: '700' },
  close: { color: '#FBF3E0', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
