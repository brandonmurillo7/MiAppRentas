import React from 'react';
import { View, TextInput, Text, StyleSheet, KeyboardTypeOptions } from 'react-native';

interface CustomInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, error ? styles.inputError : styles.inputSuccess]}
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    height: 50,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  inputSuccess: {
    borderColor: 'green',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 10,
    marginTop: 5,
    marginLeft: 5,
  },
});