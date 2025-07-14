import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { useColorScheme } from '../hooks/useColorScheme';

export default function Login() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [notification, setNotification] = useState('');

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
    notification: {
      padding: 10,
      borderRadius: 5,
      marginBottom: 20,
      width: '100%',
    },
    notificationText: {
      textAlign: 'center',
    },
  };

  // Simple notification function that works on web
  const showNotification = (title, message) => {
    console.log(`${title}: ${message}`);
    setNotification(`${title}: ${message}`);
    setTimeout(() => setNotification(''), 5000);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showNotification('Error', 'Please fill in all fields');
      return;
    }

    if (isSignup && !nickname.trim()) {
      showNotification('Error', 'Please enter a nickname');
      return;
    }

    if (isSignup && nickname.trim().length < 2) {
      showNotification('Error', 'Nickname must be at least 2 characters long');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
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
        showNotification('Success', 'Account created successfully!');
      } else {
      await signInWithEmailAndPassword(auth, email, password);
        showNotification('Success', 'Logged in successfully!');
      }
      router.replace('/');
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      showNotification('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      showNotification('Error', 'Please enter your email address first');
      return;
    }

    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showNotification('Success', 'Password reset email sent! Check your inbox and spam folder.');
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      showNotification('Error', errorMessage);
    } finally {
      setResettingPassword(false);
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
          {isSignup ? 'Sign Up' : 'Login'}
        </Text>

        {notification ? (
          <View style={[styles.notification, { 
            backgroundColor: notification.includes('Error') ? '#ffebee' : '#e8f5e8', 
            border: notification.includes('Error') ? '1px solid #f44336' : '1px solid #4caf50',
          }]}>
            <Text style={[styles.notificationText, { 
              color: notification.includes('Error') ? '#d32f2f' : '#2e7d32',
            }]}>
              {notification}
            </Text>
          </View>
        ) : null}

      <TextInput
          style={styles.input}
        placeholder="Email"
          placeholderTextColor={isDark ? '#888888' : '#999999'}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        />

        {isSignup && (
          <TextInput
            style={styles.input}
            placeholder="Nickname (can be changed later)"
            placeholderTextColor={isDark ? '#888888' : '#999999'}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
          />
        )}

      <TextInput
          style={styles.input}
        placeholder="Password"
          placeholderTextColor={isDark ? '#888888' : '#999999'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        />

        <Pressable
          onPress={handleAuth}
          disabled={loading}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Login')}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
          <Pressable
            onPress={() => {
              setIsSignup(!isSignup);
              setNickname(''); // Clear nickname when switching modes
              setNotification(''); // Clear any existing notifications
            }}
          >
            <Text style={styles.linkText}>
              {isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </Text>
          </Pressable>
          
          {!isSignup && (
            <Pressable
              onPress={handlePasswordReset}
              disabled={resettingPassword}
            >
              <Text style={[styles.linkText, { opacity: resettingPassword ? 0.6 : 1 }]}>
                {resettingPassword ? 'Sending...' : 'Forgot Password?'}
              </Text>
      </Pressable>
          )}
    </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
