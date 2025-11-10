import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './LoginScreen'; // your login screen
import SignupScreen from './SignupScreen';
import HomeScreen from './HomeScreen';
import RoomListScreen from './RoomListScreen';
import AddEditRoomScreen from './AddEditRoomScreen';
const Stack = createNativeStackNavigator();
import { initDB } from '../utils/db';
const AuthNavigator = () => {
  
   useEffect(() => {
      initDB();
    }, []);

    return(
  <Stack.Navigator>
    <Stack.Screen  name="Login" component={LoginScreen} options={{ headerShown: false, headerTitleAlign: 'center', }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'SIGN UP', headerTitleAlign: 'center', }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'HOME', headerTitleAlign: 'center', }}/>
      <Stack.Screen name="RoomList" component={RoomListScreen} options={{ title: 'ROOMS', headerTitleAlign: 'center', }}/>
      <Stack.Screen name="AddEditRoom" component={AddEditRoomScreen} options={{ title: 'MANAGE ROOMS', headerTitleAlign: 'center', }}/>
  </Stack.Navigator>);
};

export default AuthNavigator;