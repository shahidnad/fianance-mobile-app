import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Fallback token cache using AsyncStorage
const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await AsyncStorage.getItem(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await AsyncStorage.removeItem(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await AsyncStorage.setItem(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
