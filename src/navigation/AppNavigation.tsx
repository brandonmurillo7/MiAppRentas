import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { CustomButton } from '../components/CustomButton';

// Pantallas temporales para rellenar tus Tabs y que compile sin errores
const HomeScreen = () => (
  <View style={styles.center}>
    <Image source={require('../../assets/inmobiliaria-granada-granatte-71.jpg')} style={styles.homeImage} resizeMode="cover" />
    <Text style={styles.text}>Bienvenido a Rentas de Honduras</Text>
    <Text style={styles.subtitle}>¡Tu siguiente hogar puede estar aquí!</Text>
  </View>
);
const ProfileScreen = ({ navigation }: any) => (
  <View style={styles.center}>
    <Image source={require('../../assets/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_1978396.jpg')} style={styles.profileImage} resizeMode="contain" />
    <Text style={styles.text}>Mi Perfil</Text>
    <Text style={styles.subtitle}>Aquí puedes cerrar sesión y volver al inicio.</Text>
    <View style={styles.buttonWrapper}>
      <CustomButton
        title="Cerrar sesión"
        onPress={() => navigation.getParent()?.replace('Login')}
      />
    </View>
  </View>
);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 1. Configuramos las pestañas inferiores (Tabs)
function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1E3A8A' }, headerTintColor: '#fff' }}>
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Apartamentos' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Mi Perfil' }} />
    </Tab.Navigator>
  );
}

// 2. Configuramos el flujo principal (Stack) que controla el acceso
export const AppNavigation = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="HomeTabs" component={HomeTabs} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  text: { fontSize: 18, color: '#1E293B', fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 10, textAlign: 'center', maxWidth: '90%' },
  homeImage: { width: 180, height: 180, marginBottom: 20 },
  profileImage: { width: 220, height: 140, marginBottom: 20 },
  buttonWrapper: {
    width: '80%',
    marginTop: 20,
  },
});