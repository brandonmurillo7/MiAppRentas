import React, { useState } from 'react';
import { View, StyleSheet, Image, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [role, setRole] = useState<'member' | 'seller'>('member');

  const validarFormulario = () => {
    let esValido = true;
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setEmailError('El correo electrónico es obligatorio.');
      esValido = false;
    } else if (!regexEmail.test(email)) {
      setEmailError('Favor introduce un correo válido.');
      esValido = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('La contraseña es obligatoria.');
      esValido = false;
    } else if (password.length < 6) {
      setPasswordError('La contraseña debe contener al menos 6 caracteres.');
      esValido = false;
    } else {
      setPasswordError('');
    }

    return esValido;
  };

  const handleLogin = () => {
    if (validarFormulario()) {
      // Si pasa las validaciones, pasa a (Home/Tabs)
      navigation.replace('HomeTabs', { role });
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* REQUISITO: Imagen local renderizada correctamente */}
        <Image
          source={require('../../assets/inmobiliaria-granada-granatte-71.jpg')}
          style={styles.headerImage}
          resizeMode="cover"
        />

        <Text style={styles.title}>Bienvenido a Rentas de Honduras</Text>
        <Text style={styles.subtitle}>¡Tu siguiente hogar puede estar aquí!</Text>

        <Text style={styles.roleLabel}>Selecciona tu rol</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleOption, role === 'member' && styles.roleSelected]}
            onPress={() => setRole('member')}
          >
            <Text style={[styles.roleText, role === 'member' && styles.roleTextSelected]}>Member</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, role === 'seller' && styles.roleSelected]}
            onPress={() => setRole('seller')}
          >
            <Text style={[styles.roleText, role === 'seller' && styles.roleTextSelected]}>Seller</Text>
          </TouchableOpacity>
        </View>

        {/* Formulario con validaciones en tiempo de ejecución */}
        <CustomInput
          placeholder="Correo Electrónico"
          value={email}
          onChangeText={(text) => { setEmail(text); setEmailError(''); }}
          error={emailError}
          keyboardType="email-address"
        />

        <CustomInput
          placeholder="Contraseña"
          value={password}
          onChangeText={(text) => { setPassword(text); setPasswordError(''); }}
          error={passwordError}
          secureTextEntry={true}
        />

        <CustomButton title="Iniciar Sesión" onPress={handleLogin} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',     
    paddingHorizontal: 25,
    paddingTop: 20,
  },
  headerImage: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20,
  },
  roleLabel: {
    width: '100%',
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'left',
  },
  roleRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  roleText: {
    color: '#1E293B',
    fontWeight: 'bold',
  },
  roleTextSelected: {
    color: '#FFFFFF',
  },
});