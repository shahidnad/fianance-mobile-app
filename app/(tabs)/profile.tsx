import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch, ScrollView } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { toggleTheme, isDark, colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.primaryEmailAddress?.emailAddress}</Text>
        </View>

        {/* Appearance Settings */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {/* Dark Mode Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? colors.primaryLight : '#E8F5E9' }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Manage Wallets Navigation */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/manage-wallets')}
          >
            <View style={styles.settingInfo}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Manage Wallets</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: isDark ? '#450a0a' : '#FFEBEE' }]} 
          onPress={async () => {
            await AsyncStorage.removeItem('hasSeenOnboarding');
            signOut();
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={isDark ? '#f87171' : '#D32F2F'} style={{ marginRight: 8 }} />
          <Text style={[styles.signOutButtonText, { color: isDark ? '#f87171' : '#D32F2F' }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
    opacity: 0.7,
  },
  section: {
    borderRadius: 24,
    padding: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
    opacity: 0.5,
  },
  signOutButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
