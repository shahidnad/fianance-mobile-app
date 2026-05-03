import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import Svg, { G, Circle } from 'react-native-svg';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

const { width } = Dimensions.get('window');

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

export default function SpendingDetailScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user: clerkUser } = useUser();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [activeCurrency, setActiveCurrency] = useState('₹');

  useEffect(() => {
    const loadData = async () => {
      const savedId = await AsyncStorage.getItem('activeWalletId');
      setActiveWalletId(savedId);
      
      if (clerkUser && savedId) {
        // Fetch wallet currency
        const accountRef = collection(db, 'users', clerkUser.id, 'accounts');
        const unsubscribeAcc = onSnapshot(accountRef, (snapshot) => {
          const acc = snapshot.docs.find(d => d.id === savedId);
          if (acc) setActiveCurrency(acc.data().currencySymbol || '₹');
        });

        const txRef = collection(db, 'users', clerkUser.id, 'transactions');
        const q = query(txRef, where('accountId', '==', savedId), where('type', '==', 'expense'));
        
        const unsubscribeTx = onSnapshot(q, (snapshot) => {
          const txData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          setTransactions(txData);
        });

        return () => {
          unsubscribeAcc();
          unsubscribeTx();
        };
      }
    };
    loadData();
  }, [clerkUser]);

  const categoryData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    const totals: Record<string, number> = {};
    transactions.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    
    const totalExp = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: (amount / totalExp) * 100,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Others']
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalSpending = useMemo(() => {
    return categoryData.reduce((sum, cat) => sum + cat.amount, 0);
  }, [categoryData]);

  // Donut logic
  const radius = 85;
  const strokeWidth = 25;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Spending Analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <Animated.View entering={FadeInUp.delay(100)} style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={styles.donutSection}>
            <Svg width={250} height={250} viewBox="0 0 250 250">
              <G rotation="-90" origin="125, 125">
                {categoryData.length === 0 ? (
                  <Circle cx="125" cy="125" r={radius} stroke={isDark ? '#2D3748' : '#F3F4F6'} strokeWidth={strokeWidth} fill="transparent" />
                ) : (
                  categoryData.map((cat, i) => {
                    const segmentLength = (cat.percent / 100) * circumference;
                    const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
                    const strokeDashoffset = -currentOffset;
                    currentOffset += segmentLength;
                    
                    return (
                      <Circle
                        key={i}
                        cx="125" cy="125" r={radius}
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
            <View style={styles.donutCenter}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Monthly Total</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{activeCurrency}{totalSpending.toLocaleString()}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.legendSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
          {categoryData.map((cat, i) => (
            <Animated.View entering={FadeInRight.delay(200 + (i * 100))} key={i} style={[styles.categoryCard, { backgroundColor: colors.card }]}>
              <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
              <View style={styles.amountInfo}>
                <Text style={[styles.categoryAmount, { color: colors.text }]}>{activeCurrency}{cat.amount.toLocaleString()}</Text>
                <Text style={[styles.categoryPercent, { color: colors.textMuted }]}>{cat.percent.toFixed(1)}%</Text>
              </View>
            </Animated.View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    marginTop: Platform.OS === 'android' ? 25 : 0
  },
  backButton: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20 },
  chartCard: { borderRadius: 32, padding: 20, alignItems: 'center', marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  donutSection: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: '800' },
  legendSection: { marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5 },
  categoryIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  categoryInfo: { flex: 1, marginRight: 16 },
  categoryName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  progressContainer: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  amountInfo: { alignItems: 'flex-end' },
  categoryAmount: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  categoryPercent: { fontSize: 12, fontWeight: '600' },
});
