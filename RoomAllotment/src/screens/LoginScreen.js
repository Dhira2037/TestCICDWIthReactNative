import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, Image, StyleSheet } from 'react-native';
import { getDB } from '../utils/db';
import StyledInput from '../components/StyledInput';
import StyledButton from '../components/StyledButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadDefaultRoomsIfEmpty();
  }, []);

  useEffect(() => {
    const checkLogin = async () => {
      const loggedIn = await AsyncStorage.getItem('isLoggedIn');
      if (loggedIn === 'true') {
        navigation.replace('Home');
      }
    };
    checkLogin();
  }, []);

  const defaultRooms = [
    { floor: 'GROUND FLOOR', roomNumber: '0.01', acType: 'NON AC', totalBeds: 9, occupiedBeds: 0 },
    { floor: 'GROUND FLOOR', roomNumber: '0.02', acType: 'NON AC', totalBeds: 4, occupiedBeds: 0 },
    { floor: 'GROUND FLOOR', roomNumber: '0.03', acType: 'NON AC', totalBeds: 1, occupiedBeds: 0 },
    { floor: 'GROUND FLOOR', roomNumber: '0.04', acType: 'NON AC', totalBeds: 7, occupiedBeds: 0 },
    { floor: 'GROUND FLOOR', roomNumber: '0.05', acType: 'NON AC', totalBeds: 3, occupiedBeds: 0 },

    { floor: '1ST FLOOR', roomNumber: '101', acType: 'AC', totalBeds: 2, occupiedBeds: 0 },
    { floor: '1ST FLOOR', roomNumber: '102', acType: 'NON AC', totalBeds: 7, occupiedBeds: 0 },
    { floor: '1ST FLOOR', roomNumber: '103', acType: 'AC', totalBeds: 2, occupiedBeds: 0 },
    { floor: '1ST FLOOR', roomNumber: '104', acType: 'AC', totalBeds: 3, occupiedBeds: 0 },
    { floor: '1ST FLOOR', roomNumber: '105', acType: 'AC', totalBeds: 1, occupiedBeds: 0 },

    { floor: '2ND FLOOR', roomNumber: '201', acType: 'AC', totalBeds: 2, occupiedBeds: 0 },
    { floor: '2ND FLOOR', roomNumber: '202', acType: 'NON AC', totalBeds: 8, occupiedBeds: 0 },
    { floor: '2ND FLOOR', roomNumber: '203', acType: 'NON AC', totalBeds: 4, occupiedBeds: 0 },
    { floor: '2ND FLOOR', roomNumber: '204', acType: 'AC', totalBeds: 3, occupiedBeds: 0 },
    { floor: '2ND FLOOR', roomNumber: '205', acType: 'AC', totalBeds: 3, occupiedBeds: 0 },

    { floor: '3RD FLOOR', roomNumber: '301', acType: 'AC', totalBeds: 2, occupiedBeds: 0 },
    { floor: '3RD FLOOR', roomNumber: '302', acType: 'NON AC', totalBeds: 8, occupiedBeds: 0 },
    { floor: '3RD FLOOR', roomNumber: '303', acType: 'NON AC', totalBeds: 4, occupiedBeds: 0 },
    { floor: '3RD FLOOR', roomNumber: '304', acType: 'AC', totalBeds: 3, occupiedBeds: 0 },
    { floor: '3RD FLOOR', roomNumber: '305', acType: 'AC', totalBeds: 3, occupiedBeds: 0 },
    { floor: '3RD FLOOR', roomNumber: '306', acType: 'NON AC', totalBeds: 2, occupiedBeds: 0 },
    { floor: '3RD FLOOR', roomNumber: '307', acType: 'NON AC', totalBeds: 3, occupiedBeds: 0 },

    { floor: '4TH FLOOR', roomNumber: '401', acType: 'NON AC', totalBeds: 4, occupiedBeds: 0 },
    { floor: '4TH FLOOR', roomNumber: '402', acType: 'NON AC', totalBeds: 9, occupiedBeds: 0 },
    { floor: '4TH FLOOR', roomNumber: '403', acType: 'NON AC', totalBeds: 10, occupiedBeds: 0 },
  ];


  const loadDefaultRoomsIfEmpty = async () => {
    const hasInserted = await AsyncStorage.getItem('hasInsertedDefaults');
    if (hasInserted === 'true') {
      console.log('Default rooms already inserted');
      return;
    }

    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT COUNT(*) AS count FROM rooms',
        [],
        async (_, { rows }) => {
          const count = rows.item(0).count;
          if (count === 0) {
            console.log('No rooms found, inserting default data...');
            defaultRooms.forEach(room => {
              tx.executeSql(
                'INSERT INTO rooms (floor, roomNumber, acType, totalBeds, occupiedBeds) VALUES (?, ?, ?, ?, ?)',
                [room.floor, room.roomNumber, room.acType, room.totalBeds, room.occupiedBeds]
              );
            });

            // Set flag so it's not inserted again next time
            await AsyncStorage.setItem('hasInsertedDefaults', 'true');
          }
        },
        error => {
          console.error('Error checking initial room count:', error);
        }
      );
    });
  };


  const login = () => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM users WHERE email = ? AND password = ?`,
        [email, password],
        async (_, { rows }) => {
          if (rows.length > 0) {
            await AsyncStorage.setItem('isLoggedIn', 'true');
            navigation.replace('Home');
          } else {
            Alert.alert('Invalid credentials');
          }
        }
      );
    });
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <View style={styles.formWrapper}>
        <StyledInput placeholderTextColor="#888888" placeholder="User Name" value={email} onChangeText={setEmail} />
        <StyledInput placeholderTextColor="#888888" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <StyledButton title="LOGIN" onPress={login} />
        <StyledButton title="SIGNUP" onPress={() => navigation.navigate('Signup')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // center vertically
    alignItems: 'center',       // center horizontally
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 50,

  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 0,
    resizeMode: 'contain',
    marginTop: 50
  },
  formWrapper: {
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
    justifyContent: 'flex-start'
  },
});

export default LoginScreen;