
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

const StyledInput = (props) => (
  <TextInput {...props} placeholderTextColor="#999"  style={[styles.input, props.style]} />
);

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    color: '#000', // <-- Ensure text is visible
    borderRadius: 5,
    padding: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
  },
});

export default StyledInput;