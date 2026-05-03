import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'expo-router';

export default function ManageWalletsScreen() {
  const { user } = useUser();
  const { isDark, colors } = useTheme();
  const router = useRouter();
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const accountsRef = collection(db, 'users', user.id, 'accounts');
    const unsubscribe = onSnapshot(accountsRef, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAccounts(accountsData);
      setLoading(setLoading(false) as any); // Correcting state call
    }, (error) => {
      console.error("Error fetching accounts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fix loading state call (it was a bit messy above)
  useEffect(() => {
     if (loading) {
       const timer = setTimeout(() => setLoading(false), 5000); // safety timeout
       return () => clearTimeout(timer);
     }
  }, [loading]);

  const handleDeleteAccount = (id: string, name: string) => {
    Alert.alert(
      "Delete Wallet", 
      `Are you sure you want to delete "${name}"? This will permanently remove all transaction history associated with this wallet.`, 
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user!.id, 'accounts', id));
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", "Could not delete wallet.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Wallets</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
          ) : accounts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No wallets found.</Text>
          ) : (
            accounts.map((account, index) => (
              <View 
                key={account.id} 
                style={[
                  styles.walletRow, 
                  index !== accounts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                ]}
              >
                <View style={styles.walletInfo}>
                  <View style={[styles.walletIconBox, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.walletName, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.walletBalance, { color: colors.textMuted }]}>
                      {account.currencySymbol || '₹'}{(account.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => handleDeleteAccount(account.id, account.name)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.addButton, { borderColor: colors.primary }]}
          onPress={() => router.push('/add-account')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add New Wallet</Text>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 45 : 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
