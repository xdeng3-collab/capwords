import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LANGUAGES, PRICING } from '../config';
import {
  getUserProfile,
  updateUserProfile,
  getStreak,
  getSubscription,
  getStickers,
  canChangeGoal,
} from '../services/storageService';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [subscription, setSubscription] = useState(null);
  const [totalWords, setTotalWords] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getUserProfile();
    const s = await getStreak();
    const sub = await getSubscription();
    const stickers = await getStickers();
    
    setProfile(p);
    setStreak(s);
    setSubscription(sub);
    setTotalWords(stickers.length);
  };

  const handleChangeGoal = async () => {
    const canChange = await canChangeGoal();
    if (!canChange) {
      Alert.alert('Cannot Change', 'You can only change your daily goal once a week.');
      return;
    }
    navigation.navigate('GoalSetting');
  };

  if (!profile) return null;

  const targetLang = LANGUAGES.find(l => l.code === profile.targetLanguage);

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{profile.name}</Text>
          <Text style={styles.userSubtext}>
            Learning {targetLang?.flag} {targetLang?.name}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalWords}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{streak.current}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{streak.longest}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>
        </View>
      </View>

      {/* Subscription Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <TouchableOpacity 
          style={styles.subscriptionCard}
          onPress={() => navigation.navigate('Subscription')}
        >
          <View style={styles.subInfo}>
            <Ionicons 
              name={subscription?.type === 'free' ? 'star-outline' : 'star'} 
              size={24} 
              color={COLORS.warning} 
            />
            <View style={styles.subTextContainer}>
              <Text style={styles.subType}>
                {subscription?.type === 'free' ? 'Free Plan' : 
                 subscription?.type === 'monthly' ? 'Monthly Pro' :
                 subscription?.type === 'yearly' ? 'Yearly Pro' :
                 'Pay Per Word'}
              </Text>
              <Text style={styles.subDetail}>
                {subscription?.type === 'free' ? '3 free words/day' :
                 subscription?.type === 'per_word' ? `${subscription.wordBalance} words remaining` :
                 'Unlimited words'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Daily Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Goal</Text>
        <TouchableOpacity style={styles.menuItem} onPress={handleChangeGoal}>
          <View style={styles.menuLeft}>
            <Ionicons name="flag-outline" size={22} color={COLORS.primary} />
            <Text style={styles.menuText}>{profile.dailyGoal} words per day</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Language Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('LanguageSelect', {
            current: profile.targetLanguage,
            onSelect: async (code) => {
              await updateUserProfile({ targetLanguage: code });
              loadData();
            }
          })}
        >
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>{targetLang?.flag}</Text>
            <Text style={styles.menuText}>Target: {targetLang?.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
          <View style={styles.menuLeft}>
            <Ionicons name="settings-outline" size={22} color={COLORS.textLight} />
            <Text style={styles.menuText}>App Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="help-circle-outline" size={22} color={COLORS.textLight} />
            <Text style={styles.menuText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.textLight} />
            <Text style={styles.menuText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Pricing Info */}
      <View style={styles.pricingSection}>
        <Text style={styles.pricingTitle}>💰 Pricing</Text>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Per word:</Text>
          <Text style={styles.pricingValue}>${PRICING.perWord}</Text>
        </View>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Monthly:</Text>
          <Text style={styles.pricingValue}>${PRICING.monthly}/mo</Text>
        </View>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Yearly:</Text>
          <Text style={styles.pricingValue}>${PRICING.yearly}/yr (save 33%)</Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subTextContainer: {},
  subType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  subDetail: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuText: {
    fontSize: 15,
    color: COLORS.text,
  },
  pricingSection: {
    margin: 20,
    backgroundColor: COLORS.primary + '08',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  pricingLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  bottomPadding: {
    height: 40,
  },
});
