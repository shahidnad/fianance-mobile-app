import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface AIVoiceRecorderProps {
  onVoiceParsed: (data: { amount: string, title: string, category: string, date: Date, type: 'income' | 'expense' }) => void;
}

export function AIVoiceRecorder({ onVoiceParsed }: AIVoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function startRecording() {
    setErrorMsg(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      } else {
        setErrorMsg('Microphone permission denied.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setErrorMsg('Failed to start recording.');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      setRecording(null);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        setIsProcessing(true);
        // Using string literal 'base64' to prevent undefined enum errors
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64' as any,
        });
        await analyzeAudio(base64Audio);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setErrorMsg('Failed to process recording.');
      setIsProcessing(false);
    }
  }

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const analyzeAudio = async (base64Audio: string) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMENI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key is missing");

      const prompt = `You are an AI financial assistant. Listen to the audio and extract the transaction details. Return ONLY a valid JSON object with no markdown formatting or code blocks.
      Today's date is ${new Date().toISOString().split('T')[0]}.
      Structure:
      {
        "amount": "The amount as a string (e.g. '15.00', do not include negative signs)",
        "title": "A short descriptive title or merchant name",
        "category": "Pick ONE: Food, Transport, Entertainment, Shopping, Salary, Investment, Other",
        "type": "Pick ONE: 'expense' or 'income' (defaults to expense if unsure)",
        "date": "Extract the date if mentioned (e.g. yesterday). If no date is mentioned, return exactly ${new Date().toISOString().split('T')[0]}"
      }`;

      // Gemini 2.5 Flash supports audio processing
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "audio/m4a", // expo-av HIGH_QUALITY defaults to m4a
                  data: base64Audio
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
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJsonStr);
      
      let parsedDate = new Date();
      if (parsed.date) {
        const d = new Date(parsed.date);
        if (!isNaN(d.getTime())) parsedDate = d;
      }

      onVoiceParsed({
        amount: parsed.amount || '0',
        title: parsed.title || 'Voice Log',
        category: parsed.category || 'Other',
        type: parsed.type?.toLowerCase() === 'income' ? 'income' : 'expense',
        date: parsedDate
      });

    } catch (error: any) {
      console.error('Error analyzing audio:', error);
      setErrorMsg('Could not understand voice note. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, recording && styles.buttonRecording, isProcessing && styles.buttonDisabled]} 
        onPress={toggleRecording}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color={Colors.card} size="small" />
        ) : (
          <>
            <Ionicons name={recording ? "stop" : "mic"} size={22} color={Colors.card} />
            <Text style={styles.buttonText}>
              {recording ? "Stop" : "Speak"}
            </Text>
          </>
        )}
      </TouchableOpacity>
      
      {!recording && !isProcessing && !errorMsg && (
        <Text style={styles.hint}>Auto-saves</Text>
      )}
      
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.danger} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
    flex: 1,
    marginRight: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 30,
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonRecording: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 1.05 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.card,
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  }
});
