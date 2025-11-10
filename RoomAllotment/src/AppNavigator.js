import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';

import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import RoomListScreen from './screens/RoomListScreen';
import AddEditRoomScreen from './screens/AddEditRoomScreen';
import { initDB } from './utils/db';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen  name="Login" component={LoginScreen} options={{ headerShown: false, headerTitleAlign: 'center', }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'SIGN UP', headerTitleAlign: 'center', }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'HOME', headerTitleAlign: 'center', }}/>
      <Stack.Screen name="RoomList" component={RoomListScreen} options={{ title: 'ROOMS', headerTitleAlign: 'center', }}/>
      <Stack.Screen name="AddEditRoom" component={AddEditRoomScreen} options={{ title: 'MANAGE ROOMS', headerTitleAlign: 'center', }}/>
    </Stack.Navigator>
  );
};

export default AppNavigator;