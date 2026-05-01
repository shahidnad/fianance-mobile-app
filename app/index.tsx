import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function Index() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();

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
    }
  }, [isSignedIn, isLoaded, user]);

  if (!isLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4318FF" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-up" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back,</Text>
      <Text style={styles.name}>{user?.firstName || user?.primaryEmailAddress?.emailAddress}</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardText}>You are successfully logged in!</Text>
        <Text style={styles.cardSubText}>Your profile information has been synced to Firestore.</Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
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
    backgroundColor: '#F4F7FE',
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: '#A3AED0',
    marginBottom: 4,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2B3674',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
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
    color: '#2B3674',
    marginBottom: 8,
  },
  cardSubText: {
    fontSize: 15,
    color: '#A3AED0',
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
