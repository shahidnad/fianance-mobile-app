import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface AIReceiptScannerProps {
  onScanSuccess: (data: { amount: string, title: string, category: string, date: Date }) => void;
}

export function AIReceiptScanner({ onScanSuccess }: AIReceiptScannerProps) {
  const [loading, setLoading] = useState(false);

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery permissions to scan receipts.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      base64: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0].base64) {
      await analyzeReceipt(result.assets[0].base64);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera permissions to scan receipts.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      base64: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0].base64) {
      await analyzeReceipt(result.assets[0].base64);
    }
  };

  const handlePress = () => {
    Alert.alert(
      "Scan Receipt",
      "How would you like to provide the receipt?",
      [
        { text: "Take Photo", onPress: openCamera },
        { text: "Choose from Gallery", onPress: openGallery },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const analyzeReceipt = async (base64Image: string) => {
    setLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMENI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key is missing from environment variables.");

      const prompt = `You are an AI financial assistant. Analyze this receipt and extract the following information. Return ONLY a valid JSON object with no markdown formatting or code blocks.
      Today's date is ${new Date().toISOString().split('T')[0]}.
      Structure:
      {
        "amount": "The total amount as a string (e.g. '12.50')",
        "title": "The name of the merchant or store",
        "category": "Pick ONE of the following: Food, Transport, Entertainment, Shopping, Salary, Investment, Other",
        "date": "The date on the receipt in YYYY-MM-DD format. If not found, use exactly ${new Date().toISOString().split('T')[0]}"
      }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }]
        })
      });

      const json = await response.json();
      
      if (json.error) {
         throw new Error(json.error.message || "Gemini API Error");
      }

      const textOutput = json.candidates[0].content.parts[0].text.trim();
      // Remove any possible markdown formatting
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJsonStr);
      
      let parsedDate = new Date();
      if (parsed.date) {
        const d = new Date(parsed.date);
        if (!isNaN(d.getTime())) parsedDate = d;
      }

      onScanSuccess({
        amount: parsed.amount || '',
        title: parsed.title || 'Unknown Merchant',
        category: parsed.category || 'Other',
        date: parsedDate
      });

    } catch (error: any) {
      console.error('Error analyzing receipt:', error);
      Alert.alert('AI Scan Failed', 'We could not read this receipt. Please try another image or enter manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handlePress} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.buttonText}>Scan Receipt</Text>
          </>
        )}
      </TouchableOpacity>
      {!loading && (
        <Text style={styles.hint}>Auto-fills form</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
    flex: 1,
    marginLeft: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.primary,
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.primary,
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  }
});
