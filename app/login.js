import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [notification, setNotification] = useState('');

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
      router.replace('/calendar');
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 30 }}>
        {isSignup ? 'Sign Up' : 'Login'}
      </Text>

      {notification ? (
        <View style={{ 
          backgroundColor: notification.includes('Error') ? '#ffebee' : '#e8f5e8', 
          padding: 10, 
          borderRadius: 5, 
          marginBottom: 20,
          border: notification.includes('Error') ? '1px solid #f44336' : '1px solid #4caf50',
          width: '100%',
        }}>
          <Text style={{ 
            color: notification.includes('Error') ? '#d32f2f' : '#2e7d32',
            textAlign: 'center'
          }}>
            {notification}
          </Text>
        </View>
      ) : null}

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

      {isSignup && (
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
      )}

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
        onPress={handleAuth}
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
          <Text style={{ color: 'purple' }}>
            {isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up'}
          </Text>
        </Pressable>
        
        {!isSignup && (
          <Pressable
            onPress={handlePasswordReset}
            disabled={resettingPassword}
          >
            <Text style={{ color: 'purple', opacity: resettingPassword ? 0.6 : 1 }}>
              {resettingPassword ? 'Sending...' : 'Forgot Password?'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
