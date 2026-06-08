import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { CustomButton } from '../components/CustomButton';

// Pantallas temporales para rellenar tus Tabs y que compile sin errores
const HomeScreen = () => (
  <View style={styles.center}><Text style={styles.text}>Lista de Apartamentos (Próximamente)</Text></View>
);
const ProfileScreen = ({ navigation }: any) => (
  <View style={styles.center}>
    <Text style={styles.text}>Mi Perfil de Inquilino</Text>
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
  text: { fontSize: 18, color: '#1E293B', fontWeight: 'bold' },
  buttonWrapper: {
    width: '80%',
    marginTop: 20,
  },
});