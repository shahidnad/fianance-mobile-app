import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { doc, setDoc, serverTimestamp, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import Svg, { G, Circle } from 'react-native-svg';

type Period = '1W' | '1M' | '6M' | '1Y';

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#FF9F43',
  Shopping: '#FF6B6B',
  Transport: '#54A0FF',
  Bills: '#48DBFB',
  Entertainment: '#1DD1A1',
  Health: '#FECA57',
  Education: '#5F27CD',
  Others: '#8395A7',
};

export default function HomeScreen() {
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1M');

  const { isDark, colors } = useTheme();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  useEffect(() => {
    const syncUserToFirestore = async () => {
      if (isSignedIn && clerkUser) {
        try {
          const userRef = doc(db, 'users', clerkUser.id);
          await setDoc(userRef, {
            email: clerkUser.primaryEmailAddress?.emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            lastLoginAt: serverTimestamp(),
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing user to Firestore:", error);
        }
      }
    };
    syncUserToFirestore();
  }, [isSignedIn, clerkUser]);

  useEffect(() => {
    if (!clerkUser) return;
    
    const accountsRef = collection(db, 'users', clerkUser.id, 'accounts');
    const unsubscribe = onSnapshot(accountsRef, async (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAccounts(accountsData);
      setLoadingAccounts(false);
      
      if (accountsData.length === 0) {
        setTimeout(() => {
          router.replace('/add-account');
        }, 0);
      } else {
        const savedWalletId = await AsyncStorage.getItem('activeWalletId');
        if (accountsData.length === 1) {
          setActiveWalletId(accountsData[0].id);
          await AsyncStorage.setItem('activeWalletId', accountsData[0].id);
        } else if (savedWalletId && accountsData.some(a => a.id === savedWalletId)) {
          setActiveWalletId(savedWalletId);
        } else {
          setActiveWalletId(accountsData[0].id);
          await AsyncStorage.setItem('activeWalletId', accountsData[0].id);
        }
      }
    }, (error) => {
      console.error("Error fetching accounts:", error);
      setLoadingAccounts(false);
    });

    return () => unsubscribe();
  }, [clerkUser]);

  useEffect(() => {
    if (!clerkUser || !activeWalletId) return;

    const txRef = collection(db, 'users', clerkUser.id, 'transactions');
    const q = query(txRef, where('accountId', '==', activeWalletId));

    const unsubscribeTx = onSnapshot(q, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      txData.sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));
      setTransactions(txData);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let inc = 0, exp = 0;
      txData.forEach(tx => {
        const txDate = tx.date?.toDate();
        if (txDate && txDate >= thirtyDaysAgo) {
          if (tx.type === 'income') inc += tx.amount;
          else exp += tx.amount;
        }
      });
      setMonthlyIncome(inc);
      setMonthlyExpense(exp);
    });

    return () => unsubscribeTx();
  }, [clerkUser, activeWalletId]);

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    const now = new Date();
    let data: any[] = [];
    if (selectedPeriod === '1W') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        let inc = 0, exp = 0;
        transactions.forEach(tx => {
          const txDate = tx.date?.toDate();
          if (txDate && txDate.toDateString() === d.toDateString()) {
            if (tx.type === 'income') inc += tx.amount; else exp += tx.amount;
          }
        });
        data.push({ label: dayLabel, income: inc, expense: exp });
      }
    } else if (selectedPeriod === '1M') {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(); start.setDate(now.getDate() - (i + 1) * 7);
        const end = new Date(); end.setDate(now.getDate() - i * 7);
        let inc = 0, exp = 0;
        transactions.forEach(tx => {
          const txDate = tx.date?.toDate();
          if (txDate && txDate >= start && txDate < end) {
            if (tx.type === 'income') inc += tx.amount; else exp += tx.amount;
          }
        });
        data.push({ label: `W${4-i}`, income: inc, expense: exp });
      }
    } else if (selectedPeriod === '6M') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(now.getMonth() - i);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        let inc = 0, exp = 0;
        transactions.forEach(tx => {
          const txDate = tx.date?.toDate();
          if (txDate && txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear()) {
            if (tx.type === 'income') inc += tx.amount; else exp += tx.amount;
          }
        });
        data.push({ label: monthLabel, income: inc, expense: exp });
      }
    } else if (selectedPeriod === '1Y') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(now.getMonth() - i);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        let inc = 0, exp = 0;
        transactions.forEach(tx => {
          const txDate = tx.date?.toDate();
          if (txDate && txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear()) {
            if (tx.type === 'income') inc += tx.amount; else exp += tx.amount;
          }
        });
        data.push({ label: monthLabel, income: inc, expense: exp });
      }
    }
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    return data.map(d => ({ ...d, incomeHeight: (d.income / maxVal) * 100, expenseHeight: (d.expense / maxVal) * 100 }));
  }, [transactions, selectedPeriod]);

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return [];
    
    const totals: Record<string, number> = {};
    expenses.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    
    const totalExp = Object.values(totals).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(totals)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: (amount / totalExp) * 100,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Others']
      }))
      .sort((a, b) => b.amount - a.amount);
      
    return sorted;
  }, [transactions]);

  const handleSelectWallet = async (id: string) => {
    setActiveWalletId(id);
    await AsyncStorage.setItem('activeWalletId', id);
  };

  if (loadingAccounts || accounts.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const activeWallet = accounts.find(a => a.id === activeWalletId) || accounts[0];
  const activeCurrencySymbol = activeWallet.currencySymbol || '₹';
  const totalPortfolioValue = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);

  const radius = 70;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <Animated.View entering={FadeInUp.delay(100)} style={styles.welcomeHeader}>
          <View>
            <Text style={[styles.welcomeLabel, { color: colors.textMuted }]}>Good Morning,</Text>
            <Text style={[styles.welcomeName, { color: colors.text }]}>{clerkUser?.firstName || 'User'}</Text>
          </View>
          <TouchableOpacity style={[styles.profileButton, { backgroundColor: colors.card }]} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="person-circle-outline" size={32} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200)}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.portfolioCard}>
            <View style={styles.portfolioInfo}>
              <Text style={styles.portfolioLabel}>TOTAL PORTFOLIO VALUE</Text>
              <Text style={styles.portfolioValue}>{activeCurrencySymbol}{totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={[styles.depositButton, { backgroundColor: colors.card }]} onPress={() => router.push('/(tabs)/transactions')}>
                <Ionicons name="add-outline" size={20} color={colors.primary} /><Text style={[styles.depositButtonText, { color: colors.primary }]}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.withdrawButton} onPress={() => router.push('/(tabs)/transactions')}>
                <Ionicons name="arrow-up-outline" size={20} color="#FFFFFF" /><Text style={styles.withdrawButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.summaryRow}>
          <Animated.View entering={FadeInUp.delay(300)} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: isDark ? colors.primaryLight : '#E8F5E9' }]}><Ionicons name="trending-up" size={18} color={isDark ? colors.primary : '#059669'} /></View>
            <View><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Income</Text><Text style={[styles.summaryValuePositive, { color: isDark ? colors.primary : '#059669' }]}>+{activeCurrencySymbol}{monthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></View>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(400)} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: isDark ? '#450a0a' : '#FFEBEE' }]}><Ionicons name="trending-down" size={18} color={isDark ? colors.danger : '#DC2626'} /></View>
            <View><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Expense</Text><Text style={[styles.summaryValueNegative, { color: isDark ? colors.danger : '#DC2626' }]}>-{activeCurrencySymbol}{monthlyExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></View>
          </Animated.View>
        </View>

        {/* My Wallets Section (Moved here) */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>My Wallets</Text>
            <TouchableOpacity onPress={() => router.push('/add-account')} style={[styles.addWalletButton, { backgroundColor: colors.primary }]}><Ionicons name="add" size={24} color="#FFFFFF" /></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsList}>
            {accounts.map((account, index) => {
              const isActive = account.id === activeWalletId; const isLocked = accounts.length === 1; const symbol = account.currencySymbol || '₹';
              return (
                <Animated.View entering={FadeInRight.delay(550 + (index * 100))} key={account.id}>
                  <TouchableOpacity onPress={() => !isLocked && handleSelectWallet(account.id)} style={[styles.walletChip, { backgroundColor: colors.card, borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]} activeOpacity={0.8}>
                    <View style={[styles.walletIconBox, { backgroundColor: isDark ? colors.background : '#F3F4F6' }, isActive && { backgroundColor: '#FFFFFF' }]}><Ionicons name="wallet" size={20} color={isActive ? colors.primary : colors.textMuted} /></View>
                    <View><Text style={[styles.walletName, { color: colors.textMuted }, isActive && { color: '#FFFFFF' }]}>{account.name}</Text><Text style={[styles.walletBalance, { color: colors.text }, isActive && { color: '#FFFFFF' }]}>{symbol}{(account.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></View>
                    {isActive && <View style={styles.activeBadge}><View style={styles.activeDot} /></View>}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600)} style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Cash Flow Analytics</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Income</Text></View>
                <View style={[styles.legendItem, { marginLeft: 12 }]}><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Expense</Text></View>
              </View>
            </View>
            <View style={[styles.chartFilters, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
              {(['1W', '1M', '6M', '1Y'] as Period[]).map((p) => (
                <TouchableOpacity key={p} onPress={() => setSelectedPeriod(p)}><Text style={[styles.filterText, { color: colors.textMuted }, selectedPeriod === p && [styles.filterActive, { color: colors.primary, backgroundColor: isDark ? colors.card : '#FFFFFF' }]]}>{p}</Text></TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.chartContainer}>
            {chartData.length === 0 ? <View style={styles.emptyChart}><Text style={{ color: colors.textMuted }}>No data available</Text></View> : chartData.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.dualBarWrapper}>
                  <View style={[styles.bar, { height: `${item.incomeHeight}%`, backgroundColor: colors.primary }]} />
                  <View style={[styles.bar, { height: `${item.expenseHeight}%`, backgroundColor: colors.danger, marginLeft: 2 }]} />
                </View>
                <Text style={[styles.monthText, { color: colors.textMuted }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(700)} style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={[styles.sectionHeader, { marginBottom: 24 }]}>
            <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Spending by Category</Text>
            <TouchableOpacity onPress={() => router.push('/spending-detail')} style={styles.viewDetailBtn}>
              <Text style={[styles.viewDetailText, { color: colors.primary }]}>Detail</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.donutContainer}>
            <View style={styles.svgWrapper}>
              <Svg width={180} height={180} viewBox="0 0 180 180">
                <G rotation="-90" origin="90, 90">
                  {categoryData.length === 0 ? (
                    <Circle cx="90" cy="90" r={radius} stroke={isDark ? '#2D3748' : '#F3F4F6'} strokeWidth={strokeWidth} fill="transparent" />
                  ) : (
                    categoryData.map((cat, i) => {
                      const segmentLength = (cat.percent / 100) * circumference;
                      const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
                      const strokeDashoffset = -currentOffset;
                      currentOffset += segmentLength;
                      return (
                        <Circle
                          key={i}
                          cx="90" cy="90" r={radius}
                          stroke={cat.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="transparent"
                        />
                      );
                    })
                  )}
                </G>
              </Svg>
              <View style={styles.donutCenterText}>
                <Text style={[styles.donutTotalLabel, { color: colors.textMuted }]}>Total</Text>
                <Text style={[styles.donutTotalValue, { color: colors.text, fontSize: 18 }]}>
                  {activeCurrencySymbol}{categoryData.reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>

            <View style={styles.categoryLegend}>
              {categoryData.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>No expenses recorded yet.</Text>
              ) : (
                categoryData.slice(0, 4).map((cat, i) => (
                  <View key={i} style={styles.categoryItem}>
                    <View style={[styles.categoryColor, { backgroundColor: cat.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.categoryName, { color: colors.text, fontSize: 12 }]}>{cat.name}</Text>
                      <Text style={[styles.categoryPercent, { color: colors.textMuted }]}>{cat.percent.toFixed(0)}%</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </Animated.View>



        <Animated.View entering={FadeInUp.delay(900)} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text><TouchableOpacity><Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text></TouchableOpacity></View>
          {transactions.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity yet.</Text> : transactions.slice(0, 5).map((tx, index) => (
            <Animated.View entering={FadeInUp.delay(1000 + (index * 50))} key={tx.id} style={[styles.activityItem, { backgroundColor: colors.card }]}>
              <View style={[styles.activityIconBox, { backgroundColor: tx.type === 'income' ? (isDark ? colors.primaryLight : '#E8F5E9') : (isDark ? '#450a0a' : '#FFEBEE') }]}><Ionicons name={tx.type === 'income' ? 'arrow-up' : 'arrow-down'} size={20} color={tx.type === 'income' ? (isDark ? colors.primary : '#059669') : (isDark ? colors.danger : '#DC2626')} /></View>
              <View style={styles.activityDetails}><Text style={[styles.activityName, { color: colors.text }]}>{tx.title}</Text><Text style={[styles.activityDate, { color: colors.textMuted }]}>{tx.date?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {tx.category}</Text></View>
              <Text style={[tx.type === 'income' ? styles.activityAmountPositive : styles.activityAmountNegative, { color: tx.type === 'income' ? (isDark ? colors.primary : '#059669') : (isDark ? colors.danger : '#DC2626') }]}>{tx.type === 'income' ? '+' : '-'}{activeCurrencySymbol}{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </Animated.View>
          ))}
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  welcomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: Platform.OS === 'android' ? 25 : 10 },
  welcomeLabel: { fontSize: 14, fontWeight: '500' },
  welcomeName: { fontSize: 22, fontWeight: '800' },
  profileButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  portfolioCard: { borderRadius: 24, padding: 24, marginBottom: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  portfolioInfo: { marginBottom: 24 },
  portfolioLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2, marginBottom: 8 },
  portfolioValue: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  actionButtonsRow: { flexDirection: 'row', gap: 12 },
  depositButton: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  depositButtonText: { fontSize: 15, fontWeight: '700' },
  withdrawButton: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', gap: 6 },
  withdrawButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  summaryCard: { width: '48%', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
  summaryIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  summaryValuePositive: { fontSize: 15, fontWeight: '700' },
  summaryValueNegative: { fontSize: 15, fontWeight: '700' },
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  addWalletButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  walletsList: { paddingBottom: 8 },
  walletChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 20, marginRight: 12, borderWidth: 1, minWidth: 160 },
  walletIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  walletName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  walletBalance: { fontSize: 16, fontWeight: '700' },
  activeBadge: { position: 'absolute', top: 10, right: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  chartCard: { borderRadius: 24, padding: 24, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 },
  chartTitleContainer: { flex: 1, minWidth: 150 },
  chartTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },
  chartFilters: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  filterText: { fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 6 },
  filterActive: { borderRadius: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  chartContainer: { flexDirection: 'row', height: 140, justifyContent: 'space-between', alignItems: 'flex-end' },
  emptyChart: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center' },
  barContainer: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  dualBarWrapper: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', marginBottom: 8 },
  bar: { width: 8, borderRadius: 4 },
  monthText: { fontSize: 9, fontWeight: '600' },
  donutContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  svgWrapper: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  donutCenterText: { position: 'absolute', alignItems: 'center' },
  donutTotalLabel: { fontSize: 12, fontWeight: '600' },
  donutTotalValue: { fontSize: 20, fontWeight: '800' },
  categoryLegend: { flex: 1, marginLeft: 20 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryColor: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { fontSize: 13, fontWeight: '600' },
  categoryPercent: { fontSize: 10, fontWeight: '500' },
  categoryAmount: { fontSize: 13, fontWeight: '700' },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5 },
  activityIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  activityDetails: { flex: 1 },
  activityName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  activityDate: { fontSize: 12, fontWeight: '500' },
  activityAmountPositive: { fontSize: 16, fontWeight: '800' },
  activityAmountNegative: { fontSize: 16, fontWeight: '800' },
  emptyText: { textAlign: 'center', padding: 40, fontSize: 14 },
  viewAllText: { fontSize: 14, fontWeight: '700' },
  viewDetailBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  viewDetailText: { fontSize: 12, fontWeight: '700', marginRight: 4 },
});
