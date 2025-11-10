import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const StyledNavButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 0,
    width:60
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default StyledNavButton