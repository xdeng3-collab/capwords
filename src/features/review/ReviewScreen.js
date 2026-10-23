import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LANGUAGES } from '../../config';
import { COLORS, RADIUS, SHADOW, getCategoryStyle } from '../../theme';
import {
  BackButton,
  EmptyState,
  PetSprite,
  PixelButton,
  PixelIcon,
  ProgressBar,
} from '../../components';
import { getPet } from '../../services/petService';
import { answerReview, finishReviewSession, getReviewSession } from '../../services/reviewService';
import { speakWord } from '../../utils/audio';
import { errorFeedback, selectFeedback, successFeedback } from '../../utils/haptics';
import { formatPronunciation } from '../../utils/text';

/**
 * Today's review: up to REVIEW.sessionSize words that are due, one question
 * each (see reviewService.buildQuestion), then a short wrap-up that pays the
 * daily review bonus.
 */
export default function ReviewScreen({ navigation }) {
  const [session, setSession] = useState(null);
  const [pet, setPet] = useState(null);
  const [index, setIndex] = useState(0);
  // The choice tapped (a sticker id), or for a flip card, true once revealed.
  const [picked, setPicked] = useState(null);
  const [remembered, setRemembered] = useState(0);
  const [result, setResult] = useState(null);
  // The answer being saved. Finishing waits for it: both write the same key.
  const saving = useRef(Promise.resolve());

  useEffect(() => {
    getReviewSession().then(setSession);
    getPet().then(setPet).catch(() => {});
  }, []);

  const question = session?.questions[index];
  const languageName = question
    ? LANGUAGES.find((l) => l.code === question.sticker.language)?.name || question.sticker.language
    : '';

  const say = useCallback((s) => speakWord(s.word, s.language), []);

  // A listening question plays the word as it comes up.
  useEffect(() => {
    if (question?.kind === 'listen') say(question.sticker);
  }, [question, say]);

  const record = async (knewIt) => {
    if (knewIt) {
      successFeedback();
      setRemembered((n) => n + 1);
    } else {
      errorFeedback();
    }
    await answerReview(question.sticker, knewIt);
  };

  const choose = (choice) => {
    if (picked) return;
    setPicked(choice.id);
    say(question.sticker);
    saving.current = record(choice.id === question.sticker.id);
  };

  const reveal = () => {
    selectFeedback();
    setPicked(true);
    say(question.sticker);
  };

  const next = async () => {
    selectFeedback();
    await saving.current;
    if (index + 1 < session.questions.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    setResult(await finishReviewSession());
  };

  if (!session) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  // Words finished so far: a choice counts once it is picked, a flip card
  // once "I knew it" or "Not yet" moves on.
  const done = index + (question && question.kind !== 'flip' && picked !== null ? 1 : 0);

  const header = (
    <View style={styles.header}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>REVIEW</Text>
      <Text style={styles.count}>
        {question && !result ? `${done}/${session.questions.length}` : ''}
      </Text>
    </View>
  );

  if (!session.questions.length) {
    return (
      <View style={styles.container}>
        {header}
        <EmptyState
          mood="happy"
          species={pet?.species}
          outfit={pet?.equippedOutfit}
          title="All caught up"
          subtitle="Words come back here the day after you learn them, then again after longer and longer gaps."
        />
      </View>
    );
  }

  if (result) {
    const total = session.questions.length;
    const left = session.dueCount - total;
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.done}>
          <PetSprite mood="happy" species={pet?.species} outfit={pet?.equippedOutfit} pixelSize={8} />
          <Text style={styles.doneTitle}>SUPPLIES PACKED!</Text>
          <Text style={styles.doneText}>
            You remembered {remembered} of {total} {total === 1 ? 'word' : 'words'}.
            {remembered < total ? ' The ones you missed come back tomorrow.' : ''}
          </Text>
          {result.coinsEarned > 0 ? (
            <View style={styles.coins}>
              <PixelIcon name="coin" size={18} color={COLORS.sun} />
              <Text style={styles.coinsText}>+{result.coinsEarned} coins</Text>
            </View>
          ) : null}
          {left > 0 ? (
            <PixelButton
              label={`Review ${Math.min(left, total)} more`}
              icon="book"
              color={COLORS.water}
              onPress={() => {
                setSession(null);
                setIndex(0);
                setPicked(null);
                setRemembered(0);
                setResult(null);
                getReviewSession().then(setSession);
              }}
              size="lg"
              style={styles.wide}
            />
          ) : null}
          <PixelButton
            label="Done"
            icon="check"
            color={COLORS.leaf}
            onPress={() => navigation.goBack()}
            size="lg"
            style={styles.wide}
          />
        </View>
      </View>
    );
  }

  const { sticker } = question;
  const answered = picked !== null;

  return (
    <View style={styles.container}>
      {header}
      <View style={styles.progress}>
        <ProgressBar progress={done / session.questions.length} segments={session.questions.length} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {question.kind === 'listen' ? (
          <>
            <Text style={styles.prompt}>Which one is this?</Text>
            <TouchableOpacity
              style={styles.speaker}
              onPress={() => say(sticker)}
              accessibilityLabel="Hear the word again"
            >
              <PixelIcon name="sound" size={40} color={COLORS.surface} />
            </TouchableOpacity>
            {answered ? <Answer sticker={sticker} /> : null}
            <View style={styles.photoGrid}>
              {question.choices.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.photoChoice, answered && markStyle(c, question, picked)]}
                  onPress={() => choose(c)}
                  disabled={answered}
                  accessibilityLabel={answered ? c.word : 'Photo choice'}
                >
                  <Image source={{ uri: c.imageUri }} style={styles.photoChoiceImage} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.prompt}>
              {question.kind === 'flip' ? `Say it in ${languageName}` : `What is this in ${languageName}?`}
            </Text>
            <Photo sticker={sticker} />
            {question.kind === 'photo' ? (
              <View style={styles.wordChoices}>
                {question.choices.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.wordChoice, answered && markStyle(c, question, picked)]}
                    onPress={() => choose(c)}
                    disabled={answered}
                  >
                    <Text style={styles.wordChoiceText}>{c.word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {answered ? <Answer sticker={sticker} /> : null}
            {question.kind === 'flip' && !answered ? (
              <PixelButton
                label="Show the word"
                icon="sound"
                color={COLORS.water}
                onPress={reveal}
                size="lg"
                style={styles.wide}
              />
            ) : null}
          </>
        )}

        {question.kind === 'flip' && answered ? (
          <View style={styles.flipButtons}>
            <PixelButton
              label="Not yet"
              color={COLORS.secondary}
              onPress={async () => {
                await record(false);
                next();
              }}
              size="lg"
              style={styles.half}
            />
            <PixelButton
              label="I knew it"
              icon="check"
              color={COLORS.leaf}
              onPress={async () => {
                await record(true);
                next();
              }}
              size="lg"
              style={styles.half}
            />
          </View>
        ) : null}

        {question.kind !== 'flip' && answered ? (
          <PixelButton
            label={index + 1 < session.questions.length ? 'Next' : 'Finish'}
            icon="chevron"
            color={COLORS.primary}
            onPress={next}
            size="lg"
            style={styles.wide}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function markStyle(choice, question, picked) {
  if (choice.id === question.sticker.id) return styles.right;
  if (choice.id === picked) return styles.wrong;
  return styles.faded;
}

function Photo({ sticker }) {
  const category = getCategoryStyle(sticker.category);
  return (
    <View style={styles.photo}>
      {sticker.imageUri ? (
        <Image source={{ uri: sticker.imageUri }} style={styles.photoImage} />
      ) : (
        <PixelIcon name={category.icon} size={72} color={category.color} />
      )}
    </View>
  );
}

function Answer({ sticker }) {
  return (
    <View style={styles.answer}>
      <Text style={styles.answerWord}>{sticker.word}</Text>
      {sticker.pronunciation ? (
        <Text style={styles.answerSub}>{formatPronunciation(sticker.pronunciation)}</Text>
      ) : null}
      {sticker.english ? <Text style={styles.answerEnglish}>{sticker.english}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  count: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: '900', color: COLORS.textLight },
  progress: { marginHorizontal: 20, marginBottom: 6 },
  content: { padding: 20, paddingBottom: 140, alignItems: 'center', gap: 16 },
  prompt: { fontSize: 18, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  photo: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  photoImage: { width: '100%', height: '100%' },
  wordChoices: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wordChoice: {
    flexBasis: '47%',
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  wordChoiceText: { fontSize: 17, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  speaker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.water,
    borderWidth: 3,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  photoGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoChoice: {
    flexBasis: '47%',
    flexGrow: 1,
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
  },
  photoChoiceImage: { width: '100%', height: '100%' },
  right: { borderColor: COLORS.leaf, borderWidth: 5, backgroundColor: '#E3F0D6' },
  wrong: { borderColor: COLORS.danger, borderWidth: 5, backgroundColor: '#F6DAD5' },
  faded: { opacity: 0.45 },
  answer: { alignItems: 'center' },
  answerWord: { fontSize: 30, fontWeight: '900', color: COLORS.text },
  answerSub: { fontSize: 15, fontWeight: '700', color: COLORS.water, marginTop: 2 },
  answerEnglish: { fontSize: 14, fontWeight: '600', color: COLORS.textLight, marginTop: 2 },
  flipButtons: { width: '100%', flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  wide: { alignSelf: 'stretch' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  doneTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  doneText: { fontSize: 15, fontWeight: '600', color: COLORS.textLight, textAlign: 'center', lineHeight: 21 },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinsText: { fontSize: 16, fontWeight: '900', color: COLORS.primaryDark },
});
