import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

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
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 20,
          paddingTop: 60,
          paddingBottom: 60
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 24, marginBottom: 30 }}>
          Sign Up
        </Text>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 5,
            padding: 10,
            marginBottom: 10,
            width: '100%',
          }}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 5,
            padding: 10,
            marginBottom: 10,
            width: '100%',
          }}
          placeholder="Nickname (can be changed later)"
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
        />

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 5,
            padding: 10,
            marginBottom: 20,
            width: '100%',
          }}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          onPress={handleSignup}
          disabled={loading}
          style={{
            padding: 10,
            backgroundColor: 'purple',
            borderRadius: 5,
            width: '100%',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/login')}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: 'purple' }}>
            Already have an account? Login
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
