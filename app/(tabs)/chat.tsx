import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ChatScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>AI Advisor</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Chat with your personalized financial AI.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
  },
});
