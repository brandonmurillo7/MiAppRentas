import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';

const COUNTRY_CODES = [
  { country: 'Honduras', code: '+504' },
  { country: 'Guatemala', code: '+502' },
  { country: 'El Salvador', code: '+503' },
  { country: 'Nicaragua', code: '+505' },
  { country: 'Costa Rica', code: '+506' },
  { country: 'Panama', code: '+507' },
  { country: 'Mexico', code: '+52' },
  { country: 'Colombia', code: '+57' },
  { country: 'Estados Unidos', code: '+1' },
  { country: 'Espana', code: '+34' },
];

export const RegisterScreen = ({ navigation }: any) => {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identityDocument, setIdentityDocument] = useState('');
  const [countryCode, setCountryCode] = useState('+504');
  const [showCountryCodeList, setShowCountryCodeList] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'member' | 'seller' | ''>('');
  const [interestType, setInterestType] = useState<'rent' | 'buy' | 'both' | ''>('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [countryCodeError, setCountryCodeError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [interestTypeError, setInterestTypeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    let valid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const identityRegex = /^\d{13}$/;
    const phoneRegex = /^\d{8,15}$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{10,}$/;

    if (!firstName.trim()) {
      setFirstNameError('Los nombres son obligatorios.');
      valid = false;
    } else {
      setFirstNameError('');
    }

    if (!lastName.trim()) {
      setLastNameError('Los apellidos son obligatorios.');
      valid = false;
    } else {
      setLastNameError('');
    }

    if (!identityRegex.test(identityDocument.trim())) {
      setIdentityError('El documento debe tener exactamente 13 números.');
      valid = false;
    } else {
      setIdentityError('');
    }

    if (!phoneRegex.test(phone.trim())) {
      setPhoneError('El teléfono debe contener solo números.');
      valid = false;
    } else {
      setPhoneError('');
    }

    if (!countryCode) {
      setCountryCodeError('Selecciona el código de área de tu país.');
      valid = false;
    } else {
      setCountryCodeError('');
    }

    if (!emailRegex.test(email.trim())) {
      setEmailError('Ingresa un correo válido con @.');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!passwordRegex.test(password)) {
      setPasswordError('La contraseña debe tener mínimo 10 caracteres, una mayúscula y un carácter especial.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!role) {
      setRoleError('Selecciona el tipo de cuenta.');
      valid = false;
    } else {
      setRoleError('');
    }

    if (role === 'member' && !interestType) {
      setInterestTypeError('Selecciona tu tipo de interés.');
      valid = false;
    } else {
      setInterestTypeError('');
    }

    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    const ok = await signUp({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      identityDocument: identityDocument.trim(),
      countryCode,
      phone: phone.trim(),
      email: email.trim(),
      password,
      role: role as 'member' | 'seller',
      interestType: role === 'member' && interestType ? interestType : undefined,
    });
    setIsLoading(false);

    if (ok) {
      navigation.replace('Login');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Registro de Usuario</Text>
        <Text style={styles.subtitle}>Completa tus datos para crear tu cuenta</Text>

        <CustomInput
          placeholder="Nombres"
          value={firstName}
          onChangeText={(text) => {
            setFirstName(text);
            setFirstNameError('');
          }}
          error={firstNameError}
        />

        <CustomInput
          placeholder="Apellidos"
          value={lastName}
          onChangeText={(text) => {
            setLastName(text);
            setLastNameError('');
          }}
          error={lastNameError}
        />

        <CustomInput
          placeholder="Documento de identidad"
          value={identityDocument}
          onChangeText={(text) => {
            setIdentityDocument(text.replace(/\D/g, '').slice(0, 13));
            setIdentityError('');
          }}
          error={identityError}
          keyboardType="numeric"
        />

        <Text style={styles.roleLabel}>Teléfono</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity
            style={styles.countryCodeSelectorInline}
            onPress={() => setShowCountryCodeList((current) => !current)}
          >
            <Text style={styles.countryCodeSelectorText}>{countryCode}</Text>
            <Text style={styles.countryCodeSelectorChevron}>{showCountryCodeList ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          <View style={styles.phoneInputWrap}>
            <TextInput
              style={styles.phoneInput}
              placeholder="Teléfono"
              placeholderTextColor="#888"
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/\D/g, ''));
                setPhoneError('');
              }}
              keyboardType="phone-pad"
            />
          </View>
        </View>
        {showCountryCodeList && (
          <View style={styles.countryCodeList}>
            {COUNTRY_CODES.map((item) => (
              <TouchableOpacity
                key={`${item.country}-${item.code}`}
                style={styles.countryCodeItem}
                onPress={() => {
                  setCountryCode(item.code);
                  setCountryCodeError('');
                  setShowCountryCodeList(false);
                }}
              >
                <Text style={styles.countryCodeItemText}>{item.country} ({item.code})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!!phoneError && <Text style={styles.inlineError}>{phoneError}</Text>}
        {!!countryCodeError && <Text style={styles.inlineError}>{countryCodeError}</Text>}

        <CustomInput
          placeholder="Correo Electrónico"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError('');
          }}
          error={emailError}
          keyboardType="email-address"
        />

        <CustomInput
          placeholder="Contraseña"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError('');
          }}
          error={passwordError}
          secureTextEntry={true}
        />

        <Text style={styles.roleLabel}>Tipo de cuenta</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleOption, role === 'member' && styles.roleSelected]}
            onPress={() => {
              setRole('member');
              setRoleError('');
              setInterestTypeError('');
            }}
          >
            <Text style={[styles.roleText, role === 'member' && styles.roleTextSelected]}>Inquilino</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, role === 'seller' && styles.roleSelected]}
            onPress={() => {
              setRole('seller');
              setRoleError('');
              setInterestType('');
              setInterestTypeError('');
            }}
          >
            <Text style={[styles.roleText, role === 'seller' && styles.roleTextSelected]}>Propietario</Text>
          </TouchableOpacity>
        </View>
        {!!roleError && <Text style={styles.inlineError}>{roleError}</Text>}

        {role === 'member' && (
          <>
            <Text style={styles.roleLabel}>Tipo de interés</Text>
            <View style={styles.roleRow}
            >
              <TouchableOpacity
                style={[styles.roleOption, interestType === 'rent' && styles.roleSelected]}
                onPress={() => {
                  setInterestType('rent');
                  setInterestTypeError('');
                }}
              >
                <Text style={[styles.roleText, interestType === 'rent' && styles.roleTextSelected]}>Alquilar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, interestType === 'buy' && styles.roleSelected]}
                onPress={() => {
                  setInterestType('buy');
                  setInterestTypeError('');
                }}
              >
                <Text style={[styles.roleText, interestType === 'buy' && styles.roleTextSelected]}>Comprar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, interestType === 'both' && styles.roleSelected]}
                onPress={() => {
                  setInterestType('both');
                  setInterestTypeError('');
                }}
              >
                <Text style={[styles.roleText, interestType === 'both' && styles.roleTextSelected]}>Ambos</Text>
              </TouchableOpacity>
            </View>
            {!!interestTypeError && <Text style={styles.inlineError}>{interestTypeError}</Text>}
          </>
        )}

        <View style={styles.buttonWrapper}>
          <CustomButton title={isLoading ? 'Registrando...' : 'Crear cuenta'} onPress={handleRegister} disabled={isLoading} />
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
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 18,
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
    marginBottom: 12,
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
  },
  roleSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  roleText: {
    color: '#1E293B',
    fontWeight: '700',
  },
  roleTextSelected: {
    color: '#FFFFFF',
  },
  buttonWrapper: {
    marginTop: 12,
  },
  inlineError: {
    color: 'red',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
    marginLeft: 4,
  },
  phoneRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  countryCodeSelectorInline: {
    width: '34%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  phoneInputWrap: {
    width: '64%',
  },
  phoneInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  countryCodeSelectorText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  countryCodeSelectorChevron: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  countryCodeList: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    maxHeight: 220,
  },
  countryCodeItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  countryCodeItemText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
});
