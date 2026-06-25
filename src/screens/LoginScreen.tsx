import React, { useState } from 'react';
import { View, StyleSheet, Image, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';

export const LoginScreen = ({ navigation }: any) => {
  const { signIn, theme, toggleTheme } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [role, setRole] = useState<'member' | 'seller'>('member');

  const isDark = theme === 'dark';
  const pageBackground = isDark ? '#0F172A' : '#F1F5F9';
  const cardBackground = isDark ? '#111827' : '#FFFFFF';
  const titleColor = isDark ? '#F8FAFC' : '#1E293B';
  const labelColor = isDark ? '#CBD5E1' : '#334155';
  const linkColor = isDark ? '#93C5FD' : '#1E3A8A';
  

  const validarFormulario = () => {
    let esValido = true;
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const regexPhone = /^\+?\d{8,15}$/;
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      setIdentifierError('El correo o teléfono es obligatorio.');
      esValido = false;
    } else if (normalizedIdentifier.includes('@') && !regexEmail.test(normalizedIdentifier)) {
      setIdentifierError('Favor introduce un correo válido.');
      esValido = false;
    } else if (!normalizedIdentifier.includes('@') && !regexPhone.test(normalizedIdentifier)) {
      setIdentifierError('Ingresa un teléfono válido con código de área. Ejemplo: +50498765432');
      esValido = false;
    } else {
      setIdentifierError('');
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

  const handleLogin = async () => {
    if (validarFormulario()) {
      const ok = await signIn(identifier, password);
      if (ok) {
        // Auth state change switches navigator to authenticated stack.
      } else {
        setPasswordError('Credenciales inválidas o error de servidor.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: pageBackground }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.contentCard, { backgroundColor: cardBackground }]}> 
          <TouchableOpacity style={styles.themeToggleTop} onPress={toggleTheme}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <Image
            source={require('../../assets/inmobiliaria-granada-granatte-71.jpg')}
            style={styles.headerImage}
            resizeMode="cover"
          />

          <Text style={[styles.title, { color: titleColor }]}>Rentas de Honduras</Text>
          <View style={[styles.loginLogoBadge, { backgroundColor: isDark ? '#334155' : '#1E3A8A' }]}>
            <Text style={styles.loginLogoText}>RH</Text>
          </View>

          <Text style={[styles.roleLabel, { color: labelColor }]}>Selecciona tu rol</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'member' && styles.roleSelected]}
              onPress={() => setRole('member')}
            >
              <Text style={[styles.roleText, role === 'member' && styles.roleTextSelected]}>Inquilino</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleOption, role === 'seller' && styles.roleSelected]}
              onPress={() => setRole('seller')}
            >
              <Text style={[styles.roleText, role === 'seller' && styles.roleTextSelected]}>Propietario</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <CustomInput
              placeholder="Correo o Teléfono"
              value={identifier}
              onChangeText={(text) => { setIdentifier(text); setIdentifierError(''); }}
              error={identifierError}
              keyboardType="email-address"
            />

            <CustomInput
              placeholder="Contraseña"
              value={password}
              onChangeText={(text) => { setPassword(text); setPasswordError(''); }}
              error={passwordError}
              secureTextEntry={true}
            />

            <View style={styles.buttonWrapper}>
              <CustomButton title="Iniciar Sesión" onPress={handleLogin} />
            </View>
            <TouchableOpacity style={styles.registerLinkContainer} onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registerLinkText, { color: linkColor }]}>¿No tienes cuenta? Registrate aqui</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  contentCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    position: 'relative',
  },
  themeToggleTop: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImage: {
    width: '100%',
    height: 240,
    borderRadius: 22,
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginLogoBadge: {
    alignSelf: 'center',
    minWidth: 62,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
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
    marginBottom: 24,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 5,
    borderRadius: 16,
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
  formSection: {
    width: '100%',
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 20,
  },
  registerLinkContainer: {
    marginTop: 14,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 13,
    color: '#1E3A8A',
    textAlign: 'center',
    fontWeight: '600',
  },
});
