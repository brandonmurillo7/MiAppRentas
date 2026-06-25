import React, { useCallback, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { MyProductsScreen } from '../screens/MyProductsScreen';
import { CustomButton } from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';

interface OwnerChatItem {
  id: number;
  contact_name: string | null;
  contact_email: string | null;
  listing_title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: 'abierto' | 'pendiente' | 'cerrado' | null;
}

const HomeScreen = ({ navigation }: any) => {
  const { user, theme } = useAuth();
  const [chats, setChats] = useState<OwnerChatItem[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [listingFilter, setListingFilter] = useState<'Venta' | 'Alquiler'>('Venta');
  const backgroundColor = theme === 'light' ? '#F8FAFC' : '#0F172A';
  const cardColor = theme === 'light' ? '#FFFFFF' : '#111827';
  const textColor = theme === 'light' ? '#0F172A' : '#F8FAFC';
  const subtitleColor = theme === 'light' ? '#64748B' : '#CBD5E1';

  const formatDate = (value: string | null) => {
    if (!value) {
      return 'Sin actividad';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Sin actividad';
    }
    return parsed.toLocaleDateString();
  };

  const statusLabel = (value: OwnerChatItem['status']) => {
    if (value === 'cerrado') {
      return 'Cerrado';
    }
    if (value === 'pendiente') {
      return 'Pendiente';
    }
    return 'Abierto';
  };

  const statusStyle = (value: OwnerChatItem['status']) => {
    if (value === 'cerrado') {
      return styles.chatStatusClosed;
    }
    if (value === 'pendiente') {
      return styles.chatStatusPending;
    }
    return styles.chatStatusOpen;
  };

  const fetchOwnerChats = useCallback(async () => {
    if (!user?.email || user.role !== 'seller') {
      setChats([]);
      setIsLoadingChats(false);
      return;
    }

    setIsLoadingChats(true);
    const { data, error } = await supabase
      .from('owner_chats')
      .select('id, contact_name, contact_email, listing_title, last_message, last_message_at, status')
      .eq('owner_email', user.email)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('fetchOwnerChats error', error.message);
      setChats([]);
    } else {
      setChats((data || []) as OwnerChatItem[]);
    }

    setIsLoadingChats(false);
  }, [user?.email, user?.role]);

  useFocusEffect(
    useCallback(() => {
      fetchOwnerChats();
    }, [fetchOwnerChats])
  );

  const filteredChats = chats.filter((chat) => {
    const title = (chat.listing_title || '').toLowerCase();
    if (listingFilter === 'Venta') {
      return title.includes('venta');
    }
    return title.includes('alquiler') || title.includes('renta');
  });

  if (user?.role === 'seller') {
    return (
      <ScrollView contentContainerStyle={[styles.screenContainer, styles.ownerScreenContainer, { backgroundColor }]}> 
        <View style={[styles.welcomeCard, styles.ownerWelcomeCard, { backgroundColor: cardColor }]}> 
          <View style={styles.ownerHeaderRow}>
            <View style={styles.ownerHeaderTextBlock}>
              <Text style={[styles.homeTitle, { color: textColor }]}>Mis Chats</Text>
            </View>
            <TouchableOpacity style={styles.refreshChatsButton} onPress={fetchOwnerChats}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                listingFilter === 'Venta' ? styles.filterOptionActive : styles.filterOptionInactive,
              ]}
              onPress={() => setListingFilter('Venta')}
            >
              <Text style={styles.filterOptionText}>Mis Ventas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                listingFilter === 'Alquiler' ? styles.filterOptionActive : styles.filterOptionInactive,
              ]}
              onPress={() => setListingFilter('Alquiler')}
            >
              <Text style={styles.filterOptionText}>Mis Rentas</Text>
            </TouchableOpacity>
          </View>

          {isLoadingChats ? (
            <View style={styles.chatLoaderWrap}>
              <ActivityIndicator size="small" color="#1E3A8A" />
              <Text style={[styles.chatLoaderText, { color: subtitleColor }]}>Cargando chats...</Text>
            </View>
          ) : filteredChats.length === 0 ? (
            <View style={[styles.chatEmptyCard, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#0F172A' }]}> 
              <Text style={[styles.chatEmptyTitle, { color: textColor }]}>Sin chats en esta vista</Text>
              <Text style={[styles.chatEmptySubtitle, { color: subtitleColor }]}>No hay conversaciones para {listingFilter === 'Venta' ? 'Mis Ventas' : 'Mis Rentas'}.</Text>
            </View>
          ) : (
            filteredChats.map((chat) => (
              <View key={chat.id} style={[styles.chatCard, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#0F172A' }]}>
                <View style={styles.chatTopRow}>
                  <Text style={[styles.chatContact, { color: textColor }]}>
                    {chat.contact_name || chat.contact_email || 'Interesado'}
                  </Text>
                  <View style={[styles.chatStatusPill, statusStyle(chat.status)]}>
                    <Text style={styles.chatStatusText}>{statusLabel(chat.status)}</Text>
                  </View>
                </View>

                <Text style={[styles.chatListing, { color: subtitleColor }]}>
                  {chat.listing_title || 'Publicación sin título'}
                </Text>
                <Text style={[styles.chatMessage, { color: textColor }]} numberOfLines={2}>
                  {chat.last_message || 'Sin mensajes recientes.'}
                </Text>
                <Text style={[styles.chatDate, { color: subtitleColor }]}>Última actividad: {formatDate(chat.last_message_at)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.screenContainer, { backgroundColor }]}>      
      <View style={[styles.welcomeCard, { backgroundColor: cardColor }]}>        
        <Text style={[styles.homeTitle, { color: textColor }]}>Bienvenido a Rentas de Honduras</Text>
        <Text style={[styles.homeSubtitle, { color: subtitleColor }]}>Explora propiedades y gestiona tu perfil con comodidad desde tu teléfono.</Text>
        <View style={[styles.infoBadge, { backgroundColor: theme === 'light' ? '#E0E7FF' : '#1E293B' }]}>          
          <Text style={[styles.badgeText, { color: theme === 'light' ? '#3730A3' : '#E2E8F0' }]}>Rol: Inquilino</Text>
        </View>
      </View>

      <Image
        source={require('../../assets/inmobiliaria-granada-granatte-71.jpg')}
        style={styles.homeImageLarge}
        resizeMode="cover"
      />
    </ScrollView>
  );
};

const ProfileScreen = () => {
  const { user, signOut, theme, toggleTheme } = useAuth();
  const backgroundColor = theme === 'light' ? '#F8FAFC' : '#0F172A';
  const cardColor = theme === 'light' ? '#FFFFFF' : '#111827';
  const textColor = theme === 'light' ? '#0F172A' : '#F8FAFC';
  const subtitleColor = theme === 'light' ? '#64748B' : '#CBD5E1';

  const formatSellerSince = (dateValue: string | null) => {
    if (!dateValue) {
      return 'No disponible';
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return 'No disponible';
    }
    return parsed.toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    const normalized = Math.max(0, Math.min(5, Math.round(rating)));
    const filled = '★'.repeat(normalized);
    const empty = '☆'.repeat(5 - normalized);
    return `${filled}${empty}`;
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const profileHeading = fullName || (user?.email ? user.email.split('@')[0] : 'Usuario');

  return (
    <ScrollView contentContainerStyle={[styles.screenContainer, { backgroundColor }]}>      
      <View style={[styles.profileCard, { backgroundColor: cardColor }]}>        
        <TouchableOpacity style={styles.themeToggleTop} onPress={toggleTheme}>
          <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_1978396.jpg')}
          style={styles.profileImage}
          resizeMode="contain"
        />
        <Text style={[styles.profileTitle, { color: textColor }]}>{profileHeading}</Text>

        <View style={styles.profileInfoRow}>
          <Text style={[styles.profileLabel, { color: subtitleColor }]}>Correo</Text>
          <Text style={[styles.profileValue, { color: textColor }]}>{user ? user.email : 'No disponible'}</Text>
        </View>
        {user?.role === 'seller' && (
          <>
            <View style={styles.profileInfoRow}>
              <Text style={[styles.profileLabel, { color: subtitleColor }]}>Propietario desde:</Text>
              <Text style={[styles.profileValue, { color: textColor }]}>{formatSellerSince(user.sellerSince)}</Text>
            </View>
            <View style={styles.profileInfoRow}>
              <Text style={[styles.profileLabel, { color: subtitleColor }]}>Reseñas de servicio</Text>
              <Text style={[styles.profileStars, { color: textColor }]}>{renderStars(user.sellerRating)} ({user.sellerRating.toFixed(1)}/5)</Text>
            </View>
          </>
        )}
        <View style={styles.buttonWrapper}>
          <CustomButton
            title="Cerrar sesión"
            onPress={() => {
              signOut();
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const { theme, user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: theme === 'light' ? '#64748B' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: theme === 'light' ? '#FFFFFF' : '#0F172A',
          height: 60 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Inicio') {
            return <Ionicons name="home" size={size} color={color} />;
          }
          if (route.name === 'MisProductos') {
            return <Ionicons name="checkmark-done-circle" size={size} color={color} />;
          }
          return <Ionicons name="person" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
          headerTitleAlign: 'left',
          headerTitle: () => (
            <View style={styles.headerLogoBadge}>
              <Text style={styles.headerLogoText}>RH</Text>
            </View>
          ),
        }}
      />
      {user?.role === 'seller' && (
        <Tab.Screen
          name="MisProductos"
          component={MyProductsScreen}
          options={({ navigation }) => ({
            title: 'Mis Productos',
            headerRight: () => (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.getParent()?.navigate('CreateListing')}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ),
          })}
        />
      )}
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Mi Perfil' }} />
    </Tab.Navigator>
  );
}

export const AppNavigation = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="HomeTabs" component={HomeTabs} />
          <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: true, title: 'Crear Nuevo' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Registro' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  ownerScreenContainer: {
    paddingBottom: 0,
  },
  welcomeCard: {
    width: '100%',
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  ownerWelcomeCard: {
    flex: 1,
    marginBottom: 0,
  },
  homeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  homeSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  homeImageLarge: {
    width: '100%',
    height: 260,
    borderRadius: 24,
  },
  ownerHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ownerHeaderTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  refreshChatsButton: {
    backgroundColor: '#1E3A8A',
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 10,
  },
  filterOption: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  filterOptionActive: {
    backgroundColor: '#1E3A8A',
  },
  filterOptionInactive: {
    backgroundColor: '#475569',
  },
  filterOptionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chatLoaderWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  chatLoaderText: {
    marginTop: 8,
    fontSize: 13,
  },
  chatEmptyCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  chatEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chatEmptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  chatCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatContact: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingRight: 8,
  },
  chatStatusPill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chatStatusOpen: {
    backgroundColor: '#16A34A',
  },
  chatStatusPending: {
    backgroundColor: '#EA580C',
  },
  chatStatusClosed: {
    backgroundColor: '#475569',
  },
  chatStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chatListing: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  chatMessage: {
    marginTop: 6,
    fontSize: 13,
  },
  chatDate: {
    marginTop: 8,
    fontSize: 12,
  },
  profileCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    position: 'relative',
  },
  profileTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileInfoRow: {
    width: '100%',
    marginBottom: 14,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  profileValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileStars: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 100,
    marginBottom: 18,
    backgroundColor: '#E2E8F0',
  },
  themeToggleTop: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: '#1E3A8A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 2,
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 18,
  },
  addButton: {
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerLogoBadge: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
