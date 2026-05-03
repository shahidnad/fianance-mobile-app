import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export default function AddAccountScreen() {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState(CURRENCIES[0]); // INR default
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const handleCreateAccount = async () => {
    if (!name.trim() || !user) return;
    
    setLoading(true);
    try {
      const parsedBalance = balance ? parseFloat(balance) : 0;
      
      const accountsRef = collection(db, 'users', user.id, 'accounts');
      await addDoc(accountsRef, {
        name: name.trim(),
        balance: isNaN(parsedBalance) ? 0 : parsedBalance,
        currency: currency.code,
        currencySymbol: currency.symbol,
        createdAt: serverTimestamp(),
      });
      
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error creating account:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {router.canGoBack() ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add New Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconContainer}>
          <View style={[styles.walletIconCircle, { backgroundColor: colors.card }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Create a wallet to track your money</Text>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Wallet Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g. Main Checking, Cash"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.text }]}>Choose Currency</Text>
        <View style={styles.currencyGrid}>
          {CURRENCIES.map((item) => (
            <TouchableOpacity 
              key={item.code} 
              style={[
                styles.currencyChip, 
                { backgroundColor: colors.card, borderColor: colors.border },
                currency.code === item.code && { borderColor: colors.primary, backgroundColor: isDark ? colors.primaryLight : '#F0FDF4' }
              ]}
              onPress={() => setCurrency(item)}
            >
              <Text style={[styles.currencySymbol, { color: colors.textMuted }, currency.code === item.code && { color: colors.primary }]}>
                {item.symbol}
              </Text>
              <Text style={[styles.currencyCode, { color: colors.textMuted }, currency.code === item.code && { color: colors.primary }]}>
                {item.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Initial Balance (Optional)</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.currencyPrefix, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
            <Text style={[styles.prefixText, { color: colors.primary }]}>{currency.symbol}</Text>
          </View>
          <TextInput
            style={[styles.flexInput, { color: colors.text }]}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={balance}
            onChangeText={setBalance}
            keyboardType="numeric"
            selectionColor={colors.primary}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }, (!name.trim() || loading) && styles.buttonDisabled]} 
          onPress={handleCreateAccount}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create Wallet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  walletIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 20,
    padding: 18,
    fontSize: 16,
    marginBottom: 32,
    borderWidth: 1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 40,
    height: 70,
  },
  currencyPrefix: {
    paddingHorizontal: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1.5,
    borderRightColor: 'rgba(0,0,0,0.1)',
    minWidth: 85,
  },
  prefixText: {
    fontSize: 24,
    fontWeight: '800',
  },
  flexInput: {
    flex: 1,
    paddingHorizontal: 20,
    fontSize: 22,
    fontWeight: '700',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  currencyChip: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
  },
  currencyCode: {
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
