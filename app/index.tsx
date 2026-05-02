import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const syncUserToFirestore = async () => {
      if (isSignedIn && user) {
        try {
          // Use Clerk's user ID as the document ID in Firestore
          const userRef = doc(db, 'users', user.id);
          await setDoc(userRef, {
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            lastLoginAt: serverTimestamp(),
            createdAt: user.createdAt,
          }, { merge: true }); // Merge true updates existing docs or creates new ones
        } catch (error) {
          console.error("Error syncing user to Firestore:", error);
        }
      }
    };

    if (isLoaded && isSignedIn) {
      syncUserToFirestore();
      
      // Check onboarding status
      const checkOnboarding = async () => {
        try {
          const value = await AsyncStorage.getItem('hasSeenOnboarding');
          if (value === 'true') {
            setHasSeenOnboarding(true);
          } else {
            setHasSeenOnboarding(false);
            // Redirect imperatively to avoid flash
            setTimeout(() => {
              router.replace('/welcome');
            }, 0);
          }
        } catch (error) {
          setHasSeenOnboarding(false);
          setTimeout(() => {
            router.replace('/welcome');
          }, 0);
        }
      };
      
      checkOnboarding();
    }
  }, [isSignedIn, isLoaded, user]);

  if (!isLoaded || (isSignedIn && hasSeenOnboarding !== true)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back,</Text>
      <Text style={styles.name}>{user?.firstName || user?.primaryEmailAddress?.emailAddress}</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardText}>You are successfully logged in!</Text>
        <Text style={styles.cardSubText}>Your profile information has been synced to Firestore.</Text>
      </View>

      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={async () => {
          await AsyncStorage.removeItem('hasSeenOnboarding');
          signOut();
        }}
      >
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.background,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 32,
  },
  card: {
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 32,
  },
  cardText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  cardSubText: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  signOutButton: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '700',
  },
});
