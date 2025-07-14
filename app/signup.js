import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { useColorScheme } from '../hooks/useColorScheme';

export default function Signup() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  // Dark mode styles
  const isDark = colorScheme === 'dark';
  const styles = {
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#f5f5f5',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      paddingTop: 60,
      paddingBottom: 60,
      backgroundColor: isDark ? '#121212' : '#f5f5f5',
    },
    title: {
      fontSize: 24,
      marginBottom: 30,
      color: isDark ? '#ffffff' : '#333333',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#444444' : '#cccccc',
      borderRadius: 5,
      padding: 10,
      marginBottom: 10,
      width: '100%',
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
      color: isDark ? '#ffffff' : '#333333',
    },
    button: {
      padding: 10,
      backgroundColor: 'purple',
      borderRadius: 5,
      width: '100%',
      opacity: loading ? 0.6 : 1,
    },
    buttonText: {
      color: 'white',
      textAlign: 'center',
    },
    linkText: {
      color: 'purple',
    },
  };

  const handleSignup = async () => {
    if (!email || !password || !nickname.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (nickname.trim().length < 2) {
      alert('Nickname must be at least 2 characters long');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save user data to Firestore
      const userDoc = doc(db, 'users', user.uid);
      await setDoc(userDoc, {
        email: email,
        nickname: nickname.trim(),
        createdAt: new Date(),
        periodDates: []
      });
      
      router.replace('/');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          Sign Up
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={isDark ? '#888888' : '#999999'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Nickname (can be changed later)"
          placeholderTextColor={isDark ? '#888888' : '#999999'}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={isDark ? '#888888' : '#999999'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          onPress={handleSignup}
          disabled={loading}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/login')}
          style={{ marginTop: 20 }}
        >
          <Text style={styles.linkText}>
            Already have an account? Login
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
