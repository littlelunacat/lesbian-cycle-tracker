import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { auth, db } from '../firebaseConfig';

// Custom day component for side-by-side dots
const CustomDay = ({ date, state, marking, onPress }) => {
  const hasUserPeriod = marking?.selected;
  const hasPartnerPeriod = marking?.dots?.length > 0;
  const hasSexy = marking?.sexy;
  const hasPartnerSexy = marking?.partnerSexy;
  const isToday = state === 'today';
  return (
    <Pressable
      onPress={() => onPress(date)}
      style={{
        width: 32,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{
        // No border for today, just bold font
      }}>
        <Text style={{
          fontSize: 16,
          color: state === 'disabled' ? '#d9e1e8' : '#333',
          fontWeight: isToday ? 'bold' : 'normal',
        }}>
          {date.day}
        </Text>
      </View>
      {/* Dots container */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginTop: 2,
        height: 14,
      }}>
        {hasUserPeriod && (
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: 'green',
            marginHorizontal: 1,
          }} />
        )}
        {hasPartnerPeriod && (
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: 'orange',
            marginHorizontal: 1,
          }} />
        )}
        {hasSexy && (
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: 'purple',
            marginHorizontal: 1,
            shadowColor: 'green', // user's sexy: green glow
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 1,
            shadowRadius: 3,
            elevation: 12,
          }} />
        )}
        {hasPartnerSexy && (
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: 'purple',
            marginHorizontal: 1,
            shadowColor: 'orange', // partner's sexy: orange glow
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 1,
            shadowRadius: 3,
            elevation: 12,
          }} />
        )}
      </View>
    </Pressable>
  );
};

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const [partnerDates, setPartnerDates] = useState({});
  const [combinedDates, setCombinedDates] = useState({});
  const [partnerId, setPartnerId] = useState('');
  const [myNickname, setMyNickname] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('');
  const [trackingFor, setTrackingFor] = useState('self'); // 'self' or 'partner'
  const [trackingType, setTrackingType] = useState('bloody'); // 'bloody' or 'sexy'
  const [sexyDates, setSexyDates] = useState({}); // for user's sexy dates
  const [partnerSexyDates, setPartnerSexyDates] = useState({}); // for partner's sexy dates

  // Load marked dates and partner data
  const fetchData = async (user) => {
    if (!user) return;
    
    const userDoc = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDoc);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Load current user's period dates
      if (data.periodDates) {
        const marks = {};
        data.periodDates.forEach(date => {
          marks[date] = { 
            selected: true,
            selectedColor: 'green'
          };
        });
        setMarkedDates(marks);
      }
      
      // Load user's nickname
      if (data.nickname) {
        setMyNickname(data.nickname);
      }
      
      // Load user's sexy dates
      if (data.sexyDates) {
        const sexy = {};
        data.sexyDates.forEach(date => {
          sexy[date] = true;
        });
        setSexyDates(sexy);
      }
      
      // Load partner secret code and fetch partner's data
      console.log('User data:', data);
      if (data.partnerSecretCode) {
        console.log('Partner secret code found:', data.partnerSecretCode);
        setPartnerId(data.partnerSecretCode);
        await loadPartnerDates(data.partnerSecretCode);
      } else {
        console.log('No partner linked');
        // Clear partner data if no partner is linked
        setPartnerId('');
        setPartnerDates({});
      }
    }
  };

  // Load partner's dates
  const loadPartnerDates = async (partnerSecretCode) => {
    try {
      console.log('Loading partner dates for secret code:', partnerSecretCode);
      const q = query(collection(db, 'users'), where('secretCode', '==', partnerSecretCode));
      const querySnapshot = await getDocs(q);

      console.log('Query result:', querySnapshot.size, 'documents found');

      if (!querySnapshot.empty) {
        const partnerDoc = querySnapshot.docs[0];
        const data = partnerDoc.data();
        console.log('Partner data:', data);
        
        if (data.periodDates) {
          console.log('Partner period dates found:', data.periodDates);
          const marks = {};
          data.periodDates.forEach(date => {
            marks[date] = { 
              selected: true,
              selectedColor: 'orange'
            };
          });
          setPartnerDates(marks);
          console.log('Partner marks set:', marks);
        } else {
          console.log('No period dates found for partner');
        }
        // Set partner's nickname
        if (data.nickname) {
          setPartnerNickname(data.nickname);
        }
        // Load partner's sexy dates
        if (data.sexyDates) {
          const sexy = {};
          data.sexyDates.forEach(date => {
            sexy[date] = true;
          });
          setPartnerSexyDates(sexy);
        } else {
          setPartnerSexyDates({});
        }
      } else {
        console.log('No partner found with secret code:', partnerSecretCode);
      }
    } catch (error) {
      console.error('Error loading partner dates:', error);
    }
  };

  // Combine current user and partner dates, and add sexyDates
  useEffect(() => {
    const combined = { ...markedDates };
    // Add user's sexy dates (purple dot)
    Object.keys(sexyDates).forEach(date => {
      if (combined[date]) {
        combined[date] = { ...combined[date], sexy: true };
      } else {
        combined[date] = { sexy: true };
      }
    });
    // Add partner's sexy dates (purple dot, but distinguishable by order)
    Object.keys(partnerSexyDates).forEach(date => {
      if (combined[date]) {
        // If already has user's dot(s), add partner's sexy as a second purple dot
        combined[date] = {
          ...combined[date],
          partnerSexy: true
        };
      } else {
        combined[date] = { partnerSexy: true };
      }
    });
    if (Object.keys(partnerDates).length > 0) {
      Object.keys(partnerDates).forEach(date => {
        if (combined[date]) {
          // Both users have this date - show both dots side by side
          combined[date] = { 
            ...combined[date],
            selected: true,
            dots: [
              { key: 'partner', color: 'orange' }
            ]
          };
        } else {
          // Only partner has this date - show as orange dot
          combined[date] = { 
            selected: false,
            dots: [
              { key: 'partner', color: 'orange' }
            ]
          };
        }
      });
    }
    setCombinedDates(combined);
  }, [markedDates, partnerDates, sexyDates, partnerSexyDates]);

  // Toggle date and save
  const onDayPress = async (day) => {
    const date = day.dateString;
    if (trackingType === 'bloody') {
      if (trackingFor === 'self') {
        // Toggle current user's period dates
        let newMarkedDates = { ...markedDates };
        if (newMarkedDates[date]) {
          delete newMarkedDates[date];
        } else {
          newMarkedDates[date] = { 
            selected: true,
            selectedColor: 'green'
          };
        }
        setMarkedDates(newMarkedDates);
        // Save to Firestore as array of date strings
        const datesArray = Object.keys(newMarkedDates);
        if (auth.currentUser) {
          const userDoc = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userDoc, { periodDates: datesArray }, { merge: true });
        }
      } else {
        // Toggle partner's period dates (temporary, not saved to database)
        let newPartnerDates = { ...partnerDates };
        if (newPartnerDates[date]) {
          delete newPartnerDates[date];
        } else {
          newPartnerDates[date] = { 
            selected: true,
            selectedColor: 'orange'
          };
        }
        setPartnerDates(newPartnerDates);
        // Note: Partner dates are not saved to database - they're temporary
      }
    } else if (trackingType === 'sexy') {
      if (trackingFor === 'self') {
        // Toggle user's sexy dates
        let newSexyDates = { ...sexyDates };
        if (newSexyDates[date]) {
          delete newSexyDates[date];
        } else {
          newSexyDates[date] = true;
        }
        setSexyDates(newSexyDates);
        // Save to Firestore as array of date strings
        const sexyArray = Object.keys(newSexyDates);
        if (auth.currentUser) {
          const userDoc = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userDoc, { sexyDates: sexyArray }, { merge: true });
        }
      } else {
        // Toggle partner's sexy dates (temporary, not saved to database)
        let newPartnerSexyDates = { ...partnerSexyDates };
        if (newPartnerSexyDates[date]) {
          delete newPartnerSexyDates[date];
        } else {
          newPartnerSexyDates[date] = true;
        }
        setPartnerSexyDates(newPartnerSexyDates);
        // Not saved to database
      }
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        router.replace('/login');
      } else {
        fetchData(user).then(() => {
          setLoading(false);
        });
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header with welcome message and account button */}
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
            Welcome, {myNickname || 'User'}!
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
            Track your cycles together
          </Text>
        </View>
        
        {/* Settings button */}
        <Pressable
          onPress={() => router.push('/settings')}
          style={{
            padding: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 20, color: '#666', fontWeight: 'bold' }}>⋮</Text>
        </Pressable>
      </View>

      {/* Scrollable content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {partnerId && (
          <View style={{ 
            padding: 10, 
            marginBottom: 15,
          }}>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Pressable
                onPress={() => setTrackingFor('self')}
                style={{
                  padding: 10,
                  paddingHorizontal: 20,
                  backgroundColor: 'green',
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: trackingFor === 'self' ? 'transparent' : 'transparent',
                  shadowColor: trackingFor === 'self' ? 'black' : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: trackingFor === 'self' ? 1 : 0,
                  shadowRadius: trackingFor === 'self' ? 6 : 0,
                  elevation: trackingFor === 'self' ? 12 : 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 110,
                }}
              >
                <Text style={{ 
                  fontSize: 14, 
                  color: 'white',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                  {myNickname || 'You'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTrackingFor('partner')}
                style={{
                  padding: 10,
                  paddingHorizontal: 20,
                  backgroundColor: 'orange',
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: trackingFor === 'partner' ? 'transparent' : 'transparent',
                  shadowColor: trackingFor === 'partner' ? 'black' : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: trackingFor === 'partner' ? 1 : 0,
                  shadowRadius: trackingFor === 'partner' ? 6 : 0,
                  elevation: trackingFor === 'partner' ? 12 : 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 110,
                }}
              >
                <Text style={{ 
                  fontSize: 14, 
                  color: 'white',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                  {partnerNickname || 'Partner'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        
        {/* Toggle for "bloody" vs. "sexy" */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable
            onPress={() => setTrackingType('bloody')}
            style={{
              padding: 10,
              paddingHorizontal: 20,
              backgroundColor: '#ccc',
              borderRadius: 20,
              borderWidth: 3,
              borderColor: trackingType === 'bloody' ? 'transparent' : 'transparent',
              shadowColor: trackingType === 'bloody' ? 'black' : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: trackingType === 'bloody' ? 1 : 0,
              shadowRadius: trackingType === 'bloody' ? 6 : 0,
              elevation: trackingType === 'bloody' ? 12 : 0,
              alignItems: 'center',
              justifyContent: 'center',
              width: 110,
            }}
          >
            <Text style={{ 
              fontSize: 14, 
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              Bloody
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTrackingType('sexy')}
            style={{
              padding: 10,
              paddingHorizontal: 20,
              backgroundColor: 'purple',
              borderRadius: 20,
              borderWidth: 3,
              borderColor: trackingType === 'sexy' ? 'transparent' : 'transparent',
              shadowColor: trackingType === 'sexy' ? 'black' : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: trackingType === 'sexy' ? 1 : 0,
              shadowRadius: trackingType === 'sexy' ? 6 : 0,
              elevation: trackingType === 'sexy' ? 12 : 0,
              alignItems: 'center',
              justifyContent: 'center',
              width: 110,
            }}
          >
            <Text style={{ 
              fontSize: 14, 
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              Sexy
            </Text>
          </Pressable>
        </View>
        
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
          <Calendar 
            onDayPress={onDayPress} 
            markedDates={combinedDates}
            dayComponent={CustomDay}
            enableSwipeMonths={true}
            hideExtraDays={false}
            renderArrow={(direction) => (
              <Text style={{ 
                fontSize: 20, 
                color: '#000000',
                fontWeight: 'bold',
                padding: 10
              }}>
                {direction === 'left' ? '‹' : '›'}
              </Text>
            )}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: '#333',
              selectedDayBackgroundColor: 'transparent',
              selectedDayTextColor: '#333',
              todayTextColor: 'purple',
              dayTextColor: '#333',
              textDisabledColor: '#d9e1e8',
              arrowColor: '#000000',
              monthTextColor: '#333',
              indicatorColor: 'purple',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              'stylesheet.calendar.header': {
                dayHeader: {
                  color: '#333',
                },
                arrow: {
                  color: '#000000',
                },
                arrowImage: {
                  tintColor: '#000000',
                },
                arrowContainer: {
                  backgroundColor: 'transparent',
                },
              },
              'stylesheet.calendar.main': {
                arrow: {
                  color: '#000000',
                },
                arrowImage: {
                  tintColor: '#000000',
                },
                arrowContainer: {
                  backgroundColor: 'transparent',
                },
              },
            }}
          />
        </View>
        
        {/* Credits */}
        <View style={{ 
          padding: 20, 
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          backgroundColor: 'transparent'
        }}>
          <Text style={{ 
            fontSize: 12, 
            color: '#999',
            textAlign: 'center'
          }}>
            This app is developed proudly by Luna and Cat.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
} 