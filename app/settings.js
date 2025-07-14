import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

// Function to generate a random unique ID
const generateSecretCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function CouplePage() {
  const router = useRouter();
  const [partnerSecretCode, setpartnerSecretCode] = useState('');
  const [currentPartner, setCurrentPartner] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('');
  const [mySecretCode, setMySecretCode] = useState('');
  const [myNickname, setMyNickname] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingSecretCode, setGeneratingSecretCode] = useState(false);
  const [notification, setNotification] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Simple notification function that works on web
  const showNotification = (title, message) => {
    console.log(`${title}: ${message}`);
    setNotification(`${title}: ${message}`);
    setTimeout(() => setNotification(''), 3000);
  };

  // Load current partner and my unique ID on mount
  const loadData = async (user) => {
    if (!user) return;
    
    try {
      setMyEmail(user.email || '');
      const userDoc = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.secretCode) {
          setMySecretCode(data.secretCode);
        }
        if (data.nickname) {
          setMyNickname(data.nickname);
          setNewNickname(data.nickname);
        }
        if (data.partnerSecretCode) {
          setCurrentPartner(data.partnerSecretCode);
          // Fetch partner's nickname by secret code
          const q = query(collection(db, 'users'), where('secretCode', '==', data.partnerSecretCode));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const partnerData = querySnapshot.docs[0].data();
            setPartnerNickname(partnerData.nickname || 'Unknown');
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        router.replace('/login');
      } else {
        loadData(user);
      }
    });

    return unsubscribe;
  }, []);

  const createSecretCode = async () => {
    if (!auth.currentUser) return;
    
    setGeneratingSecretCode(true);
    try {
      const secretCode = generateSecretCode();
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDoc, { secretCode: secretCode }, { merge: true });
      setMySecretCode(secretCode);
      showNotification('Success', 'Secret code created successfully!');
    } catch (error) {
      showNotification('Error', 'Failed to create secret code. Please try again.');
    } finally {
      setGeneratingSecretCode(false);
    }
  };

  const generateNewSecretCode = async () => {
    if (!auth.currentUser) return;
    
    setGeneratingSecretCode(true);
    try {
      // First, unlink current partner if any
      if (currentPartner) {
        try {
          // Remove partner unique ID from current user
          const userDoc = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userDoc, { partnerSecretCode: null }, { merge: true });

          // Remove current user's unique ID from partner's document
          const q = query(collection(db, 'users'), where('secretCode', '==', currentPartner));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const partnerDoc = querySnapshot.docs[0];
            await setDoc(partnerDoc.ref, { partnerSecretCode: null }, { merge: true });
          }

          // Update local state
          setCurrentPartner('');
          setPartnerNickname('');
        } catch (unlinkError) {
          console.log('Failed to unlink partner during ID generation:', unlinkError);
          // Continue with ID generation even if unlinking fails
        }
      }

      const oldSecretCode = mySecretCode;
      const newSecretCode = generateSecretCode();
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      
      // Update current user's secret code
      await setDoc(userDoc, { secretCode: newSecretCode }, { merge: true });
      setMySecretCode(newSecretCode);
      
      // Clear any ex-partner's partnerSecretCode field that references the old secret code
      try {
        const q = query(collection(db, 'users'), where('partnerSecretCode', '==', oldSecretCode));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const exPartnerDoc = querySnapshot.docs[0];
          const exPartnerData = exPartnerDoc.data();
          
          // Only clear if the ex-partner's partnerSecretCode actually matches the old secret code
          if (exPartnerData.partnerSecretCode === oldSecretCode) {
            await setDoc(exPartnerDoc.ref, { partnerSecretCode: null }, { merge: true });
            console.log('Cleared ex-partner\'s partnerSecretCode field');
          } else {
            console.log('Ex-partner\'s partnerSecretCode does not match old secret code, no changes made');
          }
        } else {
          console.log('No ex-partner found with the old secret code');
        }
      } catch (partnerWriteError) {
        console.log('Failed to clear ex-partner\'s partnerSecretCode (expected due to permissions):', partnerWriteError);
        // This is expected due to Firestore permissions
      }
      
      showNotification('Success', 'New secret code generated! You have been automatically unlinked from your partner and previous partners can no longer access your data.');
    } catch (error) {
      showNotification('Error', 'Failed to generate new secret code. Please try again.');
    } finally {
      setGeneratingSecretCode(false);
    }
  };

  const updateNickname = async () => {
    if (!auth.currentUser || !newNickname.trim()) return;
    
    if (newNickname.trim().length < 2) {
      showNotification('Error', 'Nickname must be at least 2 characters long');
      return;
    }

    try {
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDoc, { nickname: newNickname.trim() }, { merge: true });
      setMyNickname(newNickname.trim());
      setEditingNickname(false);
      showNotification('Success', 'Nickname updated successfully!');
    } catch (error) {
      showNotification('Error', 'Failed to update nickname. Please try again.');
    }
  };

  const handlePasswordReset = async () => {
    if (!auth.currentUser?.email) {
      showNotification('Error', 'No email address found');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      showNotification('Success', 'Password reset email sent! Check your inbox.');
    } catch (error) {
      showNotification('Error', 'Failed to send password reset email. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser) {
      showNotification('Error', 'You must be logged in');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('Error', 'New password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Change password
      await updatePassword(auth.currentUser, newPassword);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      
      showNotification('Success', 'Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        showNotification('Error', 'Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        showNotification('Error', 'New password is too weak');
      } else {
        showNotification('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const linkPartner = async () => {
    if (!partnerSecretCode.trim()) {
      showNotification('Error', 'Please enter your partner\'s secret code');
      return;
    }

    if (!auth.currentUser) {
      showNotification('Error', 'You must be logged in');
      return;
    }

    if (!mySecretCode) {
      showNotification('Error', 'You must create a secret code first');
      return;
    }

    if (partnerSecretCode.trim() === mySecretCode) {
      showNotification('Error', 'You cannot link with yourself');
      return;
    }

    try {
      // Find partner by secret code
      const q = query(collection(db, 'users'), where('secretCode', '==', partnerSecretCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showNotification('Error', 'No user found with that secret code');
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerData = partnerDoc.data();

      if (partnerData.partnerSecretCode) {
        showNotification('Error', 'This user is already linked with another partner');
        return;
      }

      // Link both users
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDoc, { partnerSecretCode: partnerSecretCode.trim() }, { merge: true });
      await setDoc(partnerDoc.ref, { partnerSecretCode: mySecretCode }, { merge: true });

      setCurrentPartner(partnerSecretCode.trim());
      setPartnerNickname(partnerData.nickname || 'Unknown');
      setpartnerSecretCode('');
      showNotification('Success', 'Successfully linked with your partner!');
    } catch (error) {
      console.error('Error linking partner:', error);
      showNotification('Error', 'Failed to link with partner. Please try again.');
    }
  };

  const unlinkPartner = async () => {
    if (!currentPartner || !auth.currentUser) return;

    try {
      // Remove partner unique ID from current user
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDoc, { partnerSecretCode: null }, { merge: true });

      // Remove current user's unique ID from partner's document
      const q = query(collection(db, 'users'), where('secretCode', '==', currentPartner));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const partnerDoc = querySnapshot.docs[0];
        await setDoc(partnerDoc.ref, { partnerSecretCode: null }, { merge: true });
      }

      setCurrentPartner('');
      setPartnerNickname('');
      showNotification('Success', 'Successfully unlinked from your partner');
    } catch (error) {
      console.error('Error unlinking partner:', error);
      showNotification('Error', 'Failed to unlink from partner. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      showNotification('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) {
      showNotification('Error', 'You must be logged in to delete your account');
      return;
    }

    try {
      // Delete user document from Firestore
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDoc, { deleted: true }, { merge: true });
      
      // Delete the user account from Firebase Auth
      await auth.currentUser.delete();
      
      showNotification('Success', 'Account deleted successfully');
      router.replace('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      showNotification('Error', 'Failed to delete account. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header with title and home button */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
      }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
            Settings
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
            Manage your account and link with your partner
          </Text>
        </View>
        
        {/* Home button */}
        <Pressable
          onPress={() => router.push('/calendar')}
          style={{
            padding: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 24, color: '#666' }}>⌂</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1, padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {notification ? (
          <View style={{ 
            backgroundColor: notification.includes('Error') ? '#ffebee' : '#e8f5e8', 
            padding: 10, 
            borderRadius: 5, 
            marginBottom: 20,
            border: notification.includes('Error') ? '1px solid #f44336' : '1px solid #4caf50'
          }}>
            <Text style={{ 
              color: notification.includes('Error') ? '#d32f2f' : '#2e7d32',
              textAlign: 'center'
            }}>
              {notification}
            </Text>
          </View>
        ) : null}

        {/* Section 1: Your Profile */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 15, 
          padding: 20, 
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' }}>
            Your Profile
          </Text>
          
          {/* Nickname */}
          <View style={{ marginBottom: 20 }}>
            {editingNickname ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#555', minWidth: 80 }}>
                  Nickname
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 5,
                    padding: 10,
                  }}
                  placeholder="New nickname"
                  value={newNickname}
                  onChangeText={setNewNickname}
                  autoCapitalize="words"
                />
                <Pressable
                  onPress={updateNickname}
                  style={{
                    padding: 10,
                    backgroundColor: '#999',
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>Save</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditingNickname(false);
                    setNewNickname(myNickname);
                  }}
                  style={{
                    padding: 10,
                    backgroundColor: '#999',
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#555', minWidth: 80 }}>
                    Nickname
                  </Text>
                  <Text style={{ fontSize: 16, color: '#333' }}>
                    {myNickname || 'No nickname set'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditingNickname(true)}
                  style={{
                    padding: 10,
                    backgroundColor: '#999',
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>Edit</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Email */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#555', minWidth: 80 }}>
                Email
              </Text>
              <Text style={{ fontSize: 16, color: '#666' }}>
                {myEmail}
              </Text>
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#555' }}>
                Password
              </Text>
            </View>
            
            {/* Change Password Section */}
            <View style={{ marginTop: 10 }}>
              
              {/* Current Password */}
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
                  Enter your current password to verify your identity
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 5 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 10,
                      fontSize: 14,
                    }}
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      padding: 10,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: '#666' }}>
                      {showCurrentPassword ? 'HIDE' : 'SHOW'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              
              {/* New Password */}
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 5 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 10,
                      fontSize: 14,
                    }}
                    placeholder="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      padding: 10,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: '#666' }}>
                      {showNewPassword ? 'HIDE' : 'SHOW'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              
              {/* Confirm New Password */}
              <View style={{ marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 5 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 10,
                      fontSize: 14,
                    }}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      padding: 10,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: '#666' }}>
                      {showConfirmPassword ? 'HIDE' : 'SHOW'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              
              {/* Change Password Button */}
              <Pressable
                onPress={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                style={{
                  padding: 10,
                  backgroundColor: changingPassword || !currentPassword || !newPassword || !confirmPassword ? '#ccc' : '#999',
                  borderRadius: 5,
                  opacity: changingPassword || !currentPassword || !newPassword || !confirmPassword ? 0.6 : 1,
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Account Actions */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#555' }}>
                Account Actions
              </Text>
            </View>
            
            {/* Sign Out */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 10 }}>
              <Pressable
                onPress={handleSignOut}
                style={{
                  padding: 10,
                  backgroundColor: '#999',
                  borderRadius: 5,
                  minWidth: 120,
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>Sign Out</Text>
              </Pressable>
              <Text style={{ fontSize: 12, color: '#666', flex: 1 }}>
                Sign out of your account. You can sign back in anytime.
              </Text>
            </View>
            
            {/* Delete Account */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              <Pressable
                onPress={handleDeleteAccount}
                style={{
                  padding: 10,
                  backgroundColor: '#999',
                  borderWidth: 3,
                  borderColor: '#ff4444',
                  borderRadius: 5,
                  minWidth: 120,
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>Delete Account</Text>
              </Pressable>
              <Text style={{ fontSize: 12, color: '#666', flex: 1 }}>
                Permanently delete your account and all data. This action cannot be undone.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: Linking with Partner */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 15, 
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' }}>
            Linking with Partner
          </Text>
          
          {/* Secret Code */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#555' }}>
              Your Secret Code
            </Text>
            {mySecretCode ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 }}>
                  {mySecretCode}
                </Text>
                <Text style={{ fontSize: 12, textAlign: 'center', color: '#666' }}>
                  Share this code with your partner
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={createSecretCode}
                disabled={generatingSecretCode}
                style={{
                  padding: 10,
                  backgroundColor: generatingSecretCode ? '#ccc' : '#999',
                  borderRadius: 5,
                  opacity: generatingSecretCode ? 0.6 : 1,
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>
                  {generatingSecretCode ? 'Creating...' : 'Create Secret Code'}
                </Text>
              </Pressable>
            )}
          </View>

          {currentPartner ? (
            // When linked: show partner status and action buttons
            <>
              {/* Partner Status */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#555', minWidth: 80 }}>
                    Partner Status
                  </Text>
                  <Text style={{ fontSize: 16, color: '#333' }}>
                    You are linked with {partnerNickname}
                  </Text>
                </View>
              </View>

              {/* Partner Actions */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#555' }}>
                  Partner Actions
                </Text>
                
                {/* Unlink Partner */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                  <Pressable
                    onPress={unlinkPartner}
                    disabled={generatingSecretCode}
                    style={{
                      padding: 10,
                      backgroundColor: generatingSecretCode ? '#ccc' : '#999',
                      borderWidth: 3,
                      borderColor: '#ff4444',
                      borderRadius: 5,
                      opacity: generatingSecretCode ? 0.6 : 1,
                      minWidth: 120,
                    }}
                  >
                    <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>Unlink Partner</Text>
                  </Pressable>
                  <Text style={{ fontSize: 12, color: '#666', flex: 1 }}>
                    You and your partner will be unlinked from each other, but they may still be able to link with you again with your secret code.
                  </Text>
                </View>
                
                {/* Generate New Secret Code */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <Pressable
                    onPress={generateNewSecretCode}
                    disabled={generatingSecretCode}
                    style={{
                      padding: 10,
                      backgroundColor: generatingSecretCode ? '#ccc' : '#999',
                      borderWidth: 3,
                      borderColor: '#ff4444',
                      borderRadius: 5,
                      opacity: generatingSecretCode ? 0.6 : 1,
                      minWidth: 120,
                    }}
                  >
                    <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>
                      {generatingSecretCode ? 'Generating...' : 'Regenerate Secret Code'}
                    </Text>
                  </Pressable>
                  <Text style={{ fontSize: 12, color: '#666', flex: 1 }}>
                    This will automatically unlink you from your partner and prevent them from accessing your data.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            // When not linked: show link partner input
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#555' }}>
                  Link with Partner
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 5,
                    padding: 10,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    letterSpacing: 1,
                  }}
                  placeholder="Enter partner's secret code"
                  value={partnerSecretCode}
                  onChangeText={setpartnerSecretCode}
                  autoCapitalize="characters"
                />
                
                <Pressable
                  onPress={linkPartner}
                  style={{
                    padding: 10,
                    backgroundColor: '#999',
                    borderRadius: 5,
                    minWidth: 120,
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontSize: 14 }}>Link Partner</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
} 