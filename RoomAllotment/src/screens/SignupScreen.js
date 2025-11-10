import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { getDB } from '../utils/db';
import StyledInput from '../components/StyledInput';
import StyledButton from '../components/StyledButton';


const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signup = () => {
  if (email === "" || password === "") {
    Alert.alert('Please enter user name and password');
    return;
  }

  const db = getDB();
  db.transaction(tx => {
    // Check if the user already exists
    tx.executeSql(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      (_, { rows }) => {
        if (rows.length > 0) {
          Alert.alert('User already exists', 'An account with this user name already exists.');
        } else {
          // Proceed with signup if not duplicate
          tx.executeSql(
            `INSERT INTO users (email, password) VALUES (?, ?)`,
            [email, password],
            () => {
              Alert.alert('Signup successful');
              navigation.navigate('Login');
            },
            (error) => {
              console.error('Insert error:', error);
              Alert.alert('Error', 'Signup failed. Please try again.');
            }
          );
        }
      },
      (error) => {
        console.error('Select error:', error);
        Alert.alert('Error', 'Something went wrong while checking for existing users.');
      }
    );
  });
};

  return (
    <View style={styles.container}>
      <View style={styles.formWrapper}>
        <StyledInput placeholder="User Name" value={email} onChangeText={setEmail} />
        <StyledInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <StyledButton title="SIGNUP" onPress={signup} />
      </View>
    </View>
  )
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    // center vertically
    justifyContent:'flex-start',
    alignItems: 'center',       // center horizontally
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 50,
    paddingTop:20

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

export default SignupScreen;