import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { collection, addDoc, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

import { AIReceiptScanner } from '../../components/AIReceiptScanner';
import { AIVoiceRecorder } from '../../components/AIVoiceRecorder';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Salary', 'Investment', 'Other'];

export default function TransactionsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  // Fetch accounts to populate wallet selector
  useEffect(() => {
    if (!user) return;
    const accountsRef = collection(db, 'users', user.id, 'accounts');
    const unsubscribe = onSnapshot(accountsRef, async (snapshot) => {
      const accountsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccounts(accountsData);
      
      if (accountsData.length > 0 && !selectedWalletId) {
        const savedId = await AsyncStorage.getItem('activeWalletId');
        if (savedId && accountsData.some(a => a.id === savedId)) {
          setSelectedWalletId(savedId);
        } else {
          setSelectedWalletId(accountsData[0].id);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const saveTransactionToDB = async (txData: { amount: number, title: string, category: string, type: 'income'|'expense', date: Date }) => {
    if (!selectedWalletId || !user) throw new Error("Wallet or User missing");

    const walletRef = doc(db, 'users', user.id, 'accounts', selectedWalletId);
    const walletSnap = await getDoc(walletRef);
    
    if (!walletSnap.exists()) throw new Error("Wallet not found");

    const currentBalance = walletSnap.data().balance || 0;
    const newBalance = txData.type === 'income' 
      ? currentBalance + txData.amount 
      : currentBalance - txData.amount;

    await setDoc(walletRef, { balance: newBalance }, { merge: true });

    const txRef = collection(db, 'users', user.id, 'transactions');
    await addDoc(txRef, {
      accountId: selectedWalletId,
      amount: txData.amount,
      type: txData.type,
      title: txData.title,
      category: txData.category,
      date: txData.date,
    });
  };

  const handleSaveManualTransaction = async () => {
    if (!amount || !title.trim() || !selectedWalletId) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid positive amount.');
      return;
    }

    setLoading(true);
    try {
      await saveTransactionToDB({
        amount: parsedAmount,
        title: title.trim(),
        category,
        type,
        date
      });

      Alert.alert('Success', 'Transaction logged successfully!', [
        { text: 'OK', onPress: () => {
            setAmount('');
            setTitle('');
        }}
      ]);
    } catch (error) {
      console.error('Error logging transaction:', error);
      Alert.alert('Error', 'Failed to log transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceParsed = async (data: any) => {
    if (!selectedWalletId) {
      Alert.alert('Error', 'Please select a wallet first.');
      return;
    }

    setLoading(true);
    try {
      const parsedAmount = parseFloat(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");

      const symbol = accounts.find(a => a.id === selectedWalletId)?.currencySymbol || '₹';

      await saveTransactionToDB({
        amount: parsedAmount,
        title: data.title,
        category: data.category,
        type: data.type,
        date: data.date
      });

      Alert.alert('Success', `Logged ${data.type} of ${symbol}${parsedAmount.toFixed(2)} for ${data.title}!`);
    } catch (error) {
      console.error('Voice Save Error:', error);
      Alert.alert('Error', 'Failed to save voice transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptScanned = (data: any) => {
    setAmount(data.amount);
    setTitle(data.title);
    setCategory(data.category);
    setDate(data.date);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerRow}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Log Transaction</Text>
          </View>

          <View style={styles.aiRow}>
            <AIVoiceRecorder onVoiceParsed={handleVoiceParsed} />
            <AIReceiptScanner onScanSuccess={handleReceiptScanned} />
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR ENTER MANUALLY</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Type Toggle */}
          <View style={[styles.toggleContainer, { backgroundColor: isDark ? colors.card : '#F3F4F6' }]}>
            <TouchableOpacity 
              style={[
                styles.toggleButton, 
                type === 'expense' && { backgroundColor: isDark ? '#450a0a' : '#FFEBEE' }
              ]}
              onPress={() => setType('expense')}
            >
              <Text style={[
                styles.toggleText, 
                { color: colors.textMuted },
                type === 'expense' && { color: isDark ? '#f87171' : colors.text }
              ]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.toggleButton, 
                type === 'income' && { backgroundColor: isDark ? colors.primaryLight : '#E8F5E9' }
              ]}
              onPress={() => setType('income')}
            >
              <Text style={[
                styles.toggleText, 
                { color: colors.textMuted },
                type === 'income' && { color: isDark ? colors.primary : colors.text }
              ]}>Income</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>
              {accounts.find(a => a.id === selectedWalletId)?.currencySymbol || '₹'}
            </Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.border}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              maxLength={10}
            />
          </View>

          {/* Wallet Selector */}
          <Text style={[styles.label, { color: colors.text }]}>Select Wallet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {accounts.map(acc => {
              const symbol = acc.currencySymbol || '₹';
              return (
                <TouchableOpacity 
                  key={acc.id} 
                  style={[
                    styles.walletChip, 
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedWalletId === acc.id && { borderColor: colors.primary, backgroundColor: isDark ? colors.primaryLight : '#F0FDF4' }
                  ]}
                  onPress={() => setSelectedWalletId(acc.id)}
                >
                  <Ionicons 
                    name="wallet" 
                    size={16} 
                    color={selectedWalletId === acc.id ? colors.primary : colors.textMuted} 
                  />
                  <Text style={[
                    styles.walletChipText, 
                    { color: colors.textMuted },
                    selectedWalletId === acc.id && { color: colors.primary }
                  ]}>
                    {acc.name} ({symbol}{acc.balance.toFixed(2)})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Date Picker */}
          <Text style={[styles.label, { color: colors.text }]}>Date</Text>
          <TouchableOpacity 
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* Details */}
          <Text style={[styles.label, { color: colors.text }]}>Title / Merchant</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Starbucks, Salary"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Category Selector */}
          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[
                  styles.categoryChip, 
                  { backgroundColor: colors.card, borderColor: colors.border },
                  category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[
                  styles.categoryChipText, 
                  { color: colors.textMuted },
                  category === cat && { color: '#FFFFFF' }
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }, loading && { opacity: 0.5 }]} 
            onPress={handleSaveManualTransaction}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Save {type === 'income' ? 'Income' : 'Expense'}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  aiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 64,
    fontWeight: '800',
    minWidth: 150,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  horizontalScroll: {
    marginBottom: 24,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  walletChipText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 40,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
