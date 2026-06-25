import React, { useCallback, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Alert, Linking, View, Text, Image, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { MyProductsScreen } from '../screens/MyProductsScreen';
import { CustomButton } from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';

interface OwnerChatItem {
  id: number;
  owner_email?: string | null;
  contact_name: string | null;
  contact_email: string | null;
  listing_title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: 'abierto' | 'pendiente' | 'cerrado' | null;
  is_read_by_owner?: boolean;
  is_read_by_tenant?: boolean;
}

interface OwnerChatMessageItem {
  id: number;
  chat_id: number;
  sender_role: 'owner' | 'tenant';
  sender_email: string | null;
  message: string;
  created_at: string;
}

interface MarketplaceItem {
  id: number;
  owner_email: string;
  contract_type: 'Venta' | 'Alquiler';
  property_type: 'Casa' | 'Local' | 'Apartamento';
  neighborhood: string;
  city: string;
  description: string | null;
  image_urls: string[] | null;
  price: number;
  currency: 'Lempiras' | 'Dolares';
  available: boolean;
}

const PropertyDetailScreen = ({ route }: any) => {
  const { item } = route.params as { item: MarketplaceItem };
  const { user, theme } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const backgroundColor = theme === 'light' ? '#F8FAFC' : '#0F172A';
  const cardColor = theme === 'light' ? '#FFFFFF' : '#111827';
  const textColor = theme === 'light' ? '#0F172A' : '#F8FAFC';
  const subtitleColor = theme === 'light' ? '#64748B' : '#CBD5E1';

  const formatMarketplacePrice = (value: number, currency: 'Lempiras' | 'Dolares') => {
    if (currency === 'Dolares') {
      return `$${value.toLocaleString()}`;
    }
    return `L${value.toLocaleString()}`;
  };

  const handleScheduleVisit = async () => {
    if (!item.owner_email) {
      Alert.alert('Error', 'No se encontró el correo del propietario.');
      return;
    }

    const tenantPhone = user?.phone?.trim();
    if (!tenantPhone) {
      Alert.alert('Telefono requerido', 'Debes tener un numero de telefono registrado para agendar una cita.');
      return;
    }

    const subject = `Solicitud de visita - ${item.property_type} en ${item.neighborhood}`;
    const body = [
      `Hola, me interesa agendar una cita para visitar la propiedad:`,
      `${item.property_type} en ${item.neighborhood}, ${item.city}.`,
      `Tipo: ${item.contract_type}.`,
      `Precio: ${formatMarketplacePrice(item.price, item.currency)}.`,
      '',
      `Mis datos:`,
      `Correo: ${user?.email || 'No disponible'}`,
      `Telefono: ${tenantPhone}`,
      '',
      'Quedo atento(a) a tu confirmacion.',
    ].join('\n');

    const mailUrl = `mailto:${item.owner_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(mailUrl);

    if (!supported) {
      Alert.alert('Error', 'No se encontró una app de correo en este dispositivo.');
      return;
    }

    await Linking.openURL(mailUrl);
  };

  const handleSendMessage = async () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) {
      Alert.alert('Mensaje requerido', 'Escribe un mensaje para el propietario.');
      return;
    }

    if (!item.owner_email) {
      Alert.alert('Error', 'No se encontró el correo del propietario.');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'No se encontró tu sesión actual.');
      return;
    }

    const ownerEmail = item.owner_email.trim().toLowerCase();
    const contactEmail = user.email.trim().toLowerCase();
    const contactName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const listingTitle = `${item.contract_type} - ${item.property_type} en ${item.neighborhood}, ${item.city}`;

    setIsSendingMessage(true);
    try {
      const { data: existingChats, error: findError } = await supabase
        .from('owner_chats')
        .select('id')
        .eq('owner_email', ownerEmail)
        .eq('contact_email', contactEmail)
        .eq('listing_title', listingTitle)
        .order('last_message_at', { ascending: false })
        .limit(1);

      if (findError) {
        Alert.alert('Error', `No se pudo iniciar la conversación. Detalle: ${findError.message}`);
        setIsSendingMessage(false);
        return;
      }

      const existingChatId = existingChats?.[0]?.id;

      let activeChatId = existingChatId || null;

      if (existingChatId) {
        const { error: updateError } = await supabase
          .from('owner_chats')
          .update({
            last_message: trimmedMessage,
            last_message_at: new Date().toISOString(),
            status: 'pendiente',
          })
          .eq('id', existingChatId);

        if (updateError) {
          Alert.alert('Error', `No se pudo enviar el mensaje. Detalle: ${updateError.message}`);
          setIsSendingMessage(false);
          return;
        }
      } else {
        const { data: insertChatData, error: insertError } = await supabase
          .from('owner_chats')
          .insert({
            owner_email: ownerEmail,
            contact_name: contactName || null,
            contact_email: contactEmail,
            listing_title: listingTitle,
            last_message: trimmedMessage,
            last_message_at: new Date().toISOString(),
            status: 'pendiente',
          })
          .select('id')
          .single();

        if (insertError) {
          Alert.alert('Error', `No se pudo enviar el mensaje. Detalle: ${insertError.message}`);
          setIsSendingMessage(false);
          return;
        }

        activeChatId = insertChatData?.id || null;
      }

      if (activeChatId) {
        const { error: messageInsertError } = await supabase.from('owner_chat_messages').insert({
          chat_id: activeChatId,
          sender_role: 'tenant',
          sender_email: contactEmail,
          message: trimmedMessage,
          created_at: new Date().toISOString(),
        });

        if (messageInsertError) {
          console.warn('owner_chat_messages insert error', messageInsertError.message);
        }

        await supabase
          .from('owner_chats')
          .update({ is_read_by_owner: false })
          .eq('id', activeChatId)
          .then(() => {
            return;
          });
      }

      setMessageText('');
      Alert.alert('Mensaje enviado', 'Tu mensaje fue enviado al propietario.');
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un problema al enviar el mensaje.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.detailContainer, { backgroundColor }]}> 
      <View style={[styles.detailCard, { backgroundColor: cardColor }]}> 
        <Text style={[styles.detailTitle, { color: textColor }]}>{item.property_type} en {item.neighborhood}</Text>
        <Text style={[styles.detailSubtitle, { color: subtitleColor }]}>{item.city} · {item.contract_type}</Text>

        {Array.isArray(item.image_urls) && item.image_urls.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detailImagesRow}>
            {item.image_urls.map((url, index) => (
              <Image key={`${item.id}-${url}-${index}`} source={{ uri: url }} style={styles.detailImage} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.detailNoImageWrap}>
            <Text style={[styles.detailNoImageText, { color: subtitleColor }]}>Sin fotografias disponibles</Text>
          </View>
        )}

        <View style={styles.detailInfoRow}>
          <Text style={[styles.detailLabel, { color: subtitleColor }]}>Precio</Text>
          <Text style={[styles.detailValue, { color: textColor }]}>{formatMarketplacePrice(item.price, item.currency)}</Text>
        </View>
        <View style={styles.detailInfoRow}>
          <Text style={[styles.detailLabel, { color: subtitleColor }]}>Tipo de contrato</Text>
          <Text style={[styles.detailValue, { color: textColor }]}>{item.contract_type}</Text>
        </View>
        <View style={styles.detailInfoRow}>
          <Text style={[styles.detailLabel, { color: subtitleColor }]}>Ubicacion</Text>
          <Text style={[styles.detailValue, { color: textColor }]}>{item.neighborhood}, {item.city}</Text>
        </View>

        <Text style={[styles.detailDescription, { color: subtitleColor }]}>
          {item.description?.trim() || 'Sin descripcion disponible para esta propiedad.'}
        </Text>

        <Text style={[styles.detailLabel, { color: subtitleColor, marginTop: 16 }]}>Mensaje para el propietario</Text>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Escribe tu mensaje aquí"
          placeholderTextColor={theme === 'light' ? '#94A3B8' : '#64748B'}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[styles.messageInput, { color: textColor, borderColor: theme === 'light' ? '#CBD5E1' : '#334155', backgroundColor: theme === 'light' ? '#F8FAFC' : '#0B1220' }]}
        />

        <TouchableOpacity style={[styles.scheduleButton, styles.messageButton]} onPress={handleSendMessage} disabled={isSendingMessage}>
          <Text style={styles.scheduleButtonText}>{isSendingMessage ? 'Enviando...' : 'Envia un mensaje'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.scheduleButton} onPress={handleScheduleVisit}>
          <Text style={styles.scheduleButtonText}>Agenda una cita</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const OwnerChatDetailScreen = ({ route }: any) => {
  const { chat } = route.params as { chat: OwnerChatItem };
  const { user, theme } = useAuth();
  const [messages, setMessages] = useState<OwnerChatMessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const backgroundColor = theme === 'light' ? '#F8FAFC' : '#0F172A';
  const cardColor = theme === 'light' ? '#FFFFFF' : '#111827';
  const textColor = theme === 'light' ? '#0F172A' : '#F8FAFC';
  const subtitleColor = theme === 'light' ? '#64748B' : '#CBD5E1';

  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    const { data, error } = await supabase
      .from('owner_chat_messages')
      .select('id, chat_id, sender_role, sender_email, message, created_at')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('fetch owner chat messages error', error.message);
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    setMessages((data || []) as OwnerChatMessageItem[]);
    setIsLoadingMessages(false);
  }, [chat.id]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      supabase
        .from('owner_chats')
        .update({ status: 'abierto', is_read_by_owner: true })
        .eq('id', chat.id)
        .then(() => {
          return;
        });
    }, [chat.id, fetchMessages])
  );

  const handleSendReply = async () => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply) {
      Alert.alert('Mensaje requerido', 'Escribe un mensaje para el inquilino.');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'No se encontró tu sesión actual.');
      return;
    }

    setIsSendingReply(true);
    const nowIso = new Date().toISOString();

    const { error: insertMessageError } = await supabase.from('owner_chat_messages').insert({
      chat_id: chat.id,
      sender_role: 'owner',
      sender_email: user.email.trim().toLowerCase(),
      message: trimmedReply,
      created_at: nowIso,
    });

    if (insertMessageError) {
      Alert.alert('Error', `No se pudo enviar la respuesta. Detalle: ${insertMessageError.message}`);
      setIsSendingReply(false);
      return;
    }

    const { error: updateChatError } = await supabase
      .from('owner_chats')
      .update({
        last_message: trimmedReply,
        last_message_at: nowIso,
        status: 'abierto',
        is_read_by_tenant: false,
      })
      .eq('id', chat.id);

    if (updateChatError) {
      Alert.alert('Atencion', `Se envió el mensaje pero no se pudo actualizar el resumen. Detalle: ${updateChatError.message}`);
    }

    setReplyText('');
    await fetchMessages();
    setIsSendingReply(false);
  };

  const historyToRender = messages.length
    ? messages
    : chat.last_message
      ? [{
          id: 0,
          chat_id: chat.id,
          sender_role: 'tenant' as const,
          sender_email: chat.contact_email,
          message: chat.last_message,
          created_at: chat.last_message_at || new Date().toISOString(),
        }]
      : [];

  return (
    <ScrollView contentContainerStyle={[styles.ownerChatDetailContainer, { backgroundColor }]}> 
      <View style={[styles.ownerChatDetailCard, { backgroundColor: cardColor }]}> 
        <Text style={[styles.ownerChatDetailTitle, { color: textColor }]}>{chat.contact_name || chat.contact_email || 'Interesado'}</Text>
        <Text style={[styles.ownerChatDetailSubtitle, { color: subtitleColor }]}>{chat.listing_title || 'Publicación sin título'}</Text>

        {isLoadingMessages ? (
          <View style={styles.chatLoaderWrap}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={[styles.chatLoaderText, { color: subtitleColor }]}>Cargando conversación...</Text>
          </View>
        ) : historyToRender.length === 0 ? (
          <View style={[styles.chatEmptyCard, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#0F172A' }]}>
            <Text style={[styles.chatEmptyTitle, { color: textColor }]}>Sin mensajes</Text>
            <Text style={[styles.chatEmptySubtitle, { color: subtitleColor }]}>Envía una respuesta para iniciar la conversación.</Text>
          </View>
        ) : (
          <View style={styles.ownerMessagesWrap}>
            {historyToRender.map((message) => {
              const isOwner = message.sender_role === 'owner';
              return (
                <View
                  key={`${message.id}-${message.created_at}`}
                  style={[
                    styles.ownerMessageBubble,
                    isOwner ? styles.ownerMessageBubbleOwner : styles.ownerMessageBubbleTenant,
                  ]}
                >
                  <Text style={styles.ownerMessageSender}>{isOwner ? 'Propietario' : 'Inquilino'}</Text>
                  <Text style={styles.ownerMessageText}>{message.message}</Text>
                  <Text style={styles.ownerMessageDate}>{new Date(message.created_at).toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        )}

        <TextInput
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Escribe una respuesta para el inquilino"
          placeholderTextColor={theme === 'light' ? '#94A3B8' : '#64748B'}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[
            styles.messageInput,
            {
              color: textColor,
              borderColor: theme === 'light' ? '#CBD5E1' : '#334155',
              backgroundColor: theme === 'light' ? '#F8FAFC' : '#0B1220',
            },
          ]}
        />

        <TouchableOpacity style={styles.scheduleButton} onPress={handleSendReply} disabled={isSendingReply}>
          <Text style={styles.scheduleButtonText}>{isSendingReply ? 'Enviando...' : 'Responder al inquilino'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const TenantChatsScreen = ({ navigation }: any) => {
  const { user, theme } = useAuth();
  const [chats, setChats] = useState<OwnerChatItem[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
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

  const fetchTenantChats = useCallback(async () => {
    if (!user?.email || user.role !== 'member') {
      setChats([]);
      setIsLoadingChats(false);
      return;
    }

    setIsLoadingChats(true);
    const normalizedContactEmail = user.email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('owner_chats')
      .select('id, owner_email, contact_name, contact_email, listing_title, last_message, last_message_at, status')
      .eq('contact_email', normalizedContactEmail)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('fetchTenantChats error', error.message);
      setChats([]);
    } else {
      setChats((data || []) as OwnerChatItem[]);
    }

    setIsLoadingChats(false);
  }, [user?.email, user?.role]);

  useFocusEffect(
    useCallback(() => {
      fetchTenantChats();
    }, [fetchTenantChats])
  );

  const unreadCount = chats.filter((c) => !c.is_read_by_tenant).length;

  return (
    <ScrollView contentContainerStyle={[styles.screenContainer, styles.ownerScreenContainer, { backgroundColor }]}> 
      <View style={[styles.welcomeCard, styles.ownerWelcomeCard, { backgroundColor: cardColor }]}> 
        <View style={styles.ownerHeaderRow}>
          <View style={styles.ownerHeaderTextBlock}>
            <Text style={[styles.homeTitle, { color: textColor }]}>Mis Mensajes</Text>
          </View>
          <TouchableOpacity style={styles.refreshChatsButton} onPress={fetchTenantChats}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoadingChats ? (
          <View style={styles.chatLoaderWrap}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={[styles.chatLoaderText, { color: subtitleColor }]}>Cargando mensajes...</Text>
          </View>
        ) : chats.length === 0 ? (
          <View style={[styles.chatEmptyCard, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#0F172A' }]}> 
            <Text style={[styles.chatEmptyTitle, { color: textColor }]}>Sin conversaciones</Text>
            <Text style={[styles.chatEmptySubtitle, { color: subtitleColor }]}>Cuando escribas a un propietario, tu conversación aparecerá aquí.</Text>
          </View>
        ) : (
          chats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={[styles.chatCard, { backgroundColor: !chat.is_read_by_tenant ? '#0F766E' : (theme === 'light' ? '#F8FAFC' : '#0F172A') }]}
              activeOpacity={0.85}
              onPress={() => navigation.getParent()?.navigate('TenantChatDetail', { chat })}
            >
              <View style={styles.chatTopRow}>
                <Text style={[styles.chatContact, { color: !chat.is_read_by_tenant ? '#FFFFFF' : textColor }]}>
                  {chat.owner_email || 'Propietario'}
                </Text>
                {!chat.is_read_by_tenant && (
                  <View style={styles.unreadBadgeTenant}>
                    <Text style={styles.unreadBadgeText}>Respuesta</Text>
                  </View>
                )}
                <View style={[styles.chatStatusPill, statusStyle(chat.status)]}>
                  <Text style={styles.chatStatusText}>{statusLabel(chat.status)}</Text>
                </View>
              </View>

              <Text style={[styles.chatListing, { color: !chat.is_read_by_tenant ? '#E2E8F0' : subtitleColor }]}>
                {chat.listing_title || 'Publicación sin título'}
              </Text>
              <Text style={[styles.chatMessage, { color: !chat.is_read_by_tenant ? '#E2E8F0' : textColor, fontWeight: !chat.is_read_by_tenant ? '700' : '400' }]} numberOfLines={2}>
                {chat.last_message || 'Sin mensajes recientes.'}
              </Text>
              <Text style={[styles.chatDate, { color: !chat.is_read_by_tenant ? '#94A3B8' : subtitleColor }]}>Última actividad: {formatDate(chat.last_message_at)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const TenantChatDetailScreen = ({ route }: any) => {
  const { chat } = route.params as { chat: OwnerChatItem & { owner_email?: string | null } };
  const { user, theme } = useAuth();
  const [messages, setMessages] = useState<OwnerChatMessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const backgroundColor = theme === 'light' ? '#F8FAFC' : '#0F172A';
  const cardColor = theme === 'light' ? '#FFFFFF' : '#111827';
  const textColor = theme === 'light' ? '#0F172A' : '#F8FAFC';
  const subtitleColor = theme === 'light' ? '#64748B' : '#CBD5E1';

  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    const { data, error } = await supabase
      .from('owner_chat_messages')
      .select('id, chat_id, sender_role, sender_email, message, created_at')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('fetch tenant chat messages error', error.message);
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    setMessages((data || []) as OwnerChatMessageItem[]);
    setIsLoadingMessages(false);
  }, [chat.id]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      supabase
        .from('owner_chats')
        .update({ is_read_by_tenant: true })
        .eq('id', chat.id)
        .then(() => {
          return;
        });
    }, [chat.id, fetchMessages])
  );

  const handleSendReply = async () => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply) {
      Alert.alert('Mensaje requerido', 'Escribe un mensaje para el propietario.');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'No se encontró tu sesión actual.');
      return;
    }

    setIsSendingReply(true);
    const nowIso = new Date().toISOString();
    const senderEmail = user.email.trim().toLowerCase();

    const { error: insertMessageError } = await supabase.from('owner_chat_messages').insert({
      chat_id: chat.id,
      sender_role: 'tenant',
      sender_email: senderEmail,
      message: trimmedReply,
      created_at: nowIso,
    });

    if (insertMessageError) {
      Alert.alert('Error', `No se pudo enviar el mensaje. Detalle: ${insertMessageError.message}`);
      setIsSendingReply(false);
      return;
    }

    const { error: updateChatError } = await supabase
      .from('owner_chats')
      .update({
        last_message: trimmedReply,
        last_message_at: nowIso,
        status: 'pendiente',
        is_read_by_tenant: false,
      })
      .eq('id', chat.id);

    if (updateChatError) {
      Alert.alert('Atención', `Se envió el mensaje pero no se pudo actualizar el resumen. Detalle: ${updateChatError.message}`);
    }

    setReplyText('');
    await fetchMessages();
    setIsSendingReply(false);
  };

  const historyToRender = messages.length
    ? messages
    : chat.last_message
      ? [{
          id: 0,
          chat_id: chat.id,
          sender_role: 'owner' as const,
          sender_email: chat.owner_email || null,
          message: chat.last_message,
          created_at: chat.last_message_at || new Date().toISOString(),
        }]
      : [];

  return (
    <ScrollView contentContainerStyle={[styles.ownerChatDetailContainer, { backgroundColor }]}> 
      <View style={[styles.ownerChatDetailCard, { backgroundColor: cardColor }]}> 
        <Text style={[styles.ownerChatDetailTitle, { color: textColor }]}>{chat.owner_email || 'Propietario'}</Text>
        <Text style={[styles.ownerChatDetailSubtitle, { color: subtitleColor }]}>{chat.listing_title || 'Publicación sin título'}</Text>

        {isLoadingMessages ? (
          <View style={styles.chatLoaderWrap}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={[styles.chatLoaderText, { color: subtitleColor }]}>Cargando conversación...</Text>
          </View>
        ) : historyToRender.length === 0 ? (
          <View style={[styles.chatEmptyCard, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#0F172A' }]}> 
            <Text style={[styles.chatEmptyTitle, { color: textColor }]}>Sin mensajes</Text>
            <Text style={[styles.chatEmptySubtitle, { color: subtitleColor }]}>Inicia la conversación escribiendo al propietario.</Text>
          </View>
        ) : (
          <View style={styles.ownerMessagesWrap}>
            {historyToRender.map((message) => {
              const isTenant = message.sender_role === 'tenant';
              return (
                <View
                  key={`${message.id}-${message.created_at}`}
                  style={[
                    styles.ownerMessageBubble,
                    isTenant ? styles.ownerMessageBubbleOwner : styles.ownerMessageBubbleTenant,
                  ]}
                >
                  <Text style={styles.ownerMessageSender}>{isTenant ? 'Tú' : 'Propietario'}</Text>
                  <Text style={styles.ownerMessageText}>{message.message}</Text>
                  <Text style={styles.ownerMessageDate}>{new Date(message.created_at).toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        )}

        <TextInput
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Escribe un mensaje para el propietario"
          placeholderTextColor={theme === 'light' ? '#94A3B8' : '#64748B'}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[
            styles.messageInput,
            {
              color: textColor,
              borderColor: theme === 'light' ? '#CBD5E1' : '#334155',
              backgroundColor: theme === 'light' ? '#F8FAFC' : '#0B1220',
            },
          ]}
        />

        <TouchableOpacity style={[styles.scheduleButton, styles.messageButton]} onPress={handleSendReply} disabled={isSendingReply}>
          <Text style={styles.scheduleButtonText}>{isSendingReply ? 'Enviando...' : 'Responder al propietario'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const HomeScreen = ({ navigation }: any) => {
  const { user, theme } = useAuth();
  const [chats, setChats] = useState<OwnerChatItem[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [listingFilter, setListingFilter] = useState<'Venta' | 'Alquiler'>('Venta');
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTenantFilters, setShowTenantFilters] = useState(false);
  const [contractFilter, setContractFilter] = useState<'Todos' | 'Venta' | 'Alquiler'>('Todos');
  const [propertyFilter, setPropertyFilter] = useState<'Todos' | 'Casa' | 'Local' | 'Apartamento'>('Todos');
  const [currencyFilter, setCurrencyFilter] = useState<'Todas' | 'Lempiras' | 'Dolares'>('Todas');
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

    const normalizedOwnerEmail = user.email.trim().toLowerCase();
    setIsLoadingChats(true);
    const { data, error } = await supabase
      .from('owner_chats')
      .select('id, contact_name, contact_email, listing_title, last_message, last_message_at, status')
      .eq('owner_email', normalizedOwnerEmail)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('fetchOwnerChats error', error.message);
      setChats([]);
    } else {
      setChats((data || []) as OwnerChatItem[]);
    }

    setIsLoadingChats(false);
  }, [user?.email, user?.role]);

  const fetchTenantListings = useCallback(async () => {
    setIsLoadingMarket(true);
    const { data, error } = await supabase
      .from('properties')
      .select('id, owner_email, contract_type, property_type, neighborhood, city, description, image_urls, price, currency, available')
      .eq('available', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchTenantListings error', error.message);
      setMarketItems([]);
    } else {
      setMarketItems((data || []) as MarketplaceItem[]);
    }
    setIsLoadingMarket(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'seller') {
        fetchOwnerChats();
      } else {
        fetchTenantListings();
      }
    }, [fetchOwnerChats, fetchTenantListings, user?.role])
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
              <TouchableOpacity
                key={chat.id}
                style={[styles.chatCard, { backgroundColor: !chat.is_read_by_owner ? '#1E3A8A' : (theme === 'light' ? '#F8FAFC' : '#0F172A') }]}
                activeOpacity={0.85}
                onPress={() => navigation.getParent()?.navigate('OwnerChatDetail', { chat })}
              >
                <View style={styles.chatTopRow}>
                  <Text style={[styles.chatContact, { color: !chat.is_read_by_owner ? '#FFFFFF' : textColor }]}>
                    {chat.contact_name || chat.contact_email || 'Interesado'}
                  </Text>
                  {!chat.is_read_by_owner && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>Nuevo</Text>
                    </View>
                  )}
                  <View style={[styles.chatStatusPill, statusStyle(chat.status)]}>
                    <Text style={styles.chatStatusText}>{statusLabel(chat.status)}</Text>
                  </View>
                </View>

                <Text style={[styles.chatListing, { color: !chat.is_read_by_owner ? '#E2E8F0' : subtitleColor }]}>
                  {chat.listing_title || 'Publicación sin título'}
                </Text>
                <Text style={[styles.chatMessage, { color: !chat.is_read_by_owner ? '#E2E8F0' : textColor, fontWeight: !chat.is_read_by_owner ? '700' : '400' }]} numberOfLines={2}>
                  {chat.last_message || 'Sin mensajes recientes.'}
                </Text>
                <Text style={[styles.chatDate, { color: !chat.is_read_by_owner ? '#94A3B8' : subtitleColor }]}>Última actividad: {formatDate(chat.last_message_at)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  const filteredMarketplaceItems = marketItems.filter((item) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const searchable = `${item.property_type} ${item.contract_type} ${item.neighborhood} ${item.city} ${item.description || ''}`.toLowerCase();

    if (normalizedSearch && !searchable.includes(normalizedSearch)) {
      return false;
    }

    if (contractFilter !== 'Todos' && item.contract_type !== contractFilter) {
      return false;
    }

    if (propertyFilter !== 'Todos' && item.property_type !== propertyFilter) {
      return false;
    }

    if (currencyFilter !== 'Todas' && item.currency !== currencyFilter) {
      return false;
    }

    return true;
  });

  const formatMarketplacePrice = (value: number, currency: 'Lempiras' | 'Dolares') => {
    if (currency === 'Dolares') {
      return `$${value.toLocaleString()}`;
    }
    return `L${value.toLocaleString()}`;
  };

  return (
    <ScrollView contentContainerStyle={[styles.screenContainer, { backgroundColor }]}>      
      <View style={[styles.welcomeCard, { backgroundColor: cardColor }]}>        
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por ciudad, colonia o tipo de propiedad"
          placeholderTextColor={theme === 'light' ? '#94A3B8' : '#64748B'}
          style={[styles.searchInput, { color: textColor, borderColor: theme === 'light' ? '#CBD5E1' : '#334155', backgroundColor: theme === 'light' ? '#F8FAFC' : '#0B1220' }]}
        />

        <TouchableOpacity
          style={[styles.tenantFiltersToggle, { backgroundColor: theme === 'light' ? '#E2E8F0' : '#1E293B' }]}
          onPress={() => setShowTenantFilters((current) => !current)}
        >
          <Text style={[styles.tenantFiltersToggleText, { color: textColor }]}>Filtros</Text>
          <Text style={[styles.tenantFiltersToggleChevron, { color: subtitleColor }]}>{showTenantFilters ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showTenantFilters && (
          <View style={styles.tenantFiltersBox}>
            <Text style={[styles.marketFilterLabel, { color: subtitleColor }]}>Tipo de contrato</Text>
            <View style={styles.marketFilterRow}>
              {(['Todos', 'Venta', 'Alquiler'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.marketFilterChip, contractFilter === option ? styles.marketFilterChipActive : styles.marketFilterChipInactive]}
                  onPress={() => setContractFilter(option)}
                >
                  <Text style={styles.marketFilterChipText}>{option === 'Todos' ? 'Todos' : option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.marketFilterLabel, { color: subtitleColor }]}>Tipo de propiedad</Text>
            <View style={styles.marketFilterRowWrap}>
              {(['Todos', 'Casa', 'Local', 'Apartamento'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.marketFilterChip, propertyFilter === option ? styles.marketFilterChipActive : styles.marketFilterChipInactive]}
                  onPress={() => setPropertyFilter(option)}
                >
                  <Text style={styles.marketFilterChipText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.marketFilterLabel, { color: subtitleColor }]}>Moneda</Text>
            <View style={styles.marketFilterRow}>
              {(['Todas', 'Lempiras', 'Dolares'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.marketFilterChip, currencyFilter === option ? styles.marketFilterChipActive : styles.marketFilterChipInactive]}
                  onPress={() => setCurrencyFilter(option)}
                >
                  <Text style={styles.marketFilterChipText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {isLoadingMarket ? (
          <View style={styles.chatLoaderWrap}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={[styles.chatLoaderText, { color: subtitleColor }]}>Cargando propiedades...</Text>
          </View>
        ) : filteredMarketplaceItems.length === 0 ? (
          <View style={[styles.chatEmptyCard, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#0F172A' }]}> 
            <Text style={[styles.chatEmptyTitle, { color: textColor }]}>Sin resultados</Text>
            <Text style={[styles.chatEmptySubtitle, { color: subtitleColor }]}>Ajusta el buscador o los filtros para ver propiedades disponibles.</Text>
          </View>
        ) : (
          filteredMarketplaceItems.map((item) => {
            const imageUrl = Array.isArray(item.image_urls) && item.image_urls.length > 0 ? item.image_urls[0] : null;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.marketCard, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#0F172A' }]}
                activeOpacity={0.85}
                onPress={() => navigation.getParent()?.navigate('PropertyDetail', { item })}
              > 
                {!!imageUrl && <Image source={{ uri: imageUrl }} style={styles.marketImage} resizeMode="cover" />}
                <Text style={[styles.marketTitle, { color: textColor }]}>{item.property_type} en {item.neighborhood}</Text>
                <Text style={[styles.marketSubtitle, { color: subtitleColor }]}>{item.city} · {item.contract_type}</Text>
                <Text style={[styles.marketPrice, { color: textColor }]}>{formatMarketplacePrice(item.price, item.currency)}</Text>
                <Text style={[styles.marketDescription, { color: subtitleColor }]} numberOfLines={2}>
                  {item.description?.trim() || 'Sin descripcion disponible.'}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const ProfileScreen = () => {
  const { user, signOut, theme, toggleTheme, updateProfileImage } = useAuth();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
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
  const profileImageSource = user?.profileImageUrl
    ? { uri: user.profileImageUrl }
    : require('../../assets/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_1978396.jpg');

  const handleProfilePhotoPick = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No se encontró el usuario actual.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a tus fotos para actualizar tu perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    let extension = uri.split('.').pop()?.toLowerCase();
    if (!extension || !['jpg', 'jpeg', 'png'].includes(extension)) {
      extension = asset.mimeType === 'image/png' ? 'png' : 'jpg';
    }

    setIsUploadingPhoto(true);
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const filePath = `profiles/${user.email}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, arrayBuffer, {
          contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Error', `No se pudo subir la foto de perfil. Detalle: ${uploadError.message}`);
        setIsUploadingPhoto(false);
        return;
      }

      const { data: publicData } = supabase.storage.from('property-images').getPublicUrl(filePath);
      if (!publicData?.publicUrl) {
        Alert.alert('Error', 'No se pudo obtener la URL pública de la foto.');
        setIsUploadingPhoto(false);
        return;
      }

      const ok = await updateProfileImage(publicData.publicUrl);
      if (ok) {
        Alert.alert('Listo', 'Foto de perfil actualizada correctamente.');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo procesar la imagen seleccionada.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.screenContainer, { backgroundColor }]}>      
      <View style={[styles.profileCard, { backgroundColor: cardColor }]}>        
        <TouchableOpacity style={styles.themeToggleTop} onPress={toggleTheme}>
          <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={profileImageSource}
          style={styles.profileImage}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.changePhotoButton} onPress={handleProfilePhotoPick} disabled={isUploadingPhoto}>
          <Text style={styles.changePhotoButtonText}>{isUploadingPhoto ? 'Subiendo foto...' : 'Cambiar foto de perfil'}</Text>
        </TouchableOpacity>
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
          if (route.name === 'MisMensajes') {
            return <Ionicons name="chatbubbles" size={size} color={color} />;
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
      {user?.role === 'member' && (
        <Tab.Screen
          name="MisMensajes"
          component={TenantChatsScreen}
          options={{ title: 'Mis Mensajes' }}
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
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ headerShown: true, title: 'Detalle de Propiedad' }} />
          <Stack.Screen name="OwnerChatDetail" component={OwnerChatDetailScreen} options={{ headerShown: true, title: 'Conversación' }} />
          <Stack.Screen name="TenantChatDetail" component={TenantChatDetailScreen} options={{ headerShown: true, title: 'Conversación' }} />
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
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  tenantFiltersToggle: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tenantFiltersToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tenantFiltersToggleChevron: {
    fontSize: 12,
    fontWeight: '700',
  },
  tenantFiltersBox: {
    marginBottom: 6,
  },
  marketFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  marketFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  marketFilterRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  marketFilterChip: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  marketFilterChipActive: {
    backgroundColor: '#1E3A8A',
  },
  marketFilterChipInactive: {
    backgroundColor: '#475569',
  },
  marketFilterChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  marketCard: {
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  marketImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#E2E8F0',
  },
  marketTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  marketSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  marketPrice: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
  },
  marketDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  detailContainer: {
    flexGrow: 1,
    padding: 20,
  },
  detailCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  detailSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailImagesRow: {
    gap: 8,
    marginBottom: 12,
  },
  detailImage: {
    width: 220,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  detailNoImageWrap: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailNoImageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '62%',
    textAlign: 'right',
  },
  detailDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  messageInput: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
    fontSize: 14,
  },
  scheduleButton: {
    marginTop: 16,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  messageButton: {
    marginTop: 12,
    backgroundColor: '#0F766E',
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
  unreadBadge: {
    backgroundColor: '#FCA5A5',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  unreadBadgeTenant: {
    backgroundColor: '#A7F3D0',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
  },
  ownerChatDetailContainer: {
    flexGrow: 1,
    padding: 20,
  },
  ownerChatDetailCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ownerChatDetailTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  ownerChatDetailSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  ownerMessagesWrap: {
    marginTop: 14,
    marginBottom: 8,
    gap: 10,
  },
  ownerMessageBubble: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ownerMessageBubbleOwner: {
    backgroundColor: '#1E3A8A',
    alignSelf: 'flex-end',
    maxWidth: '88%',
  },
  ownerMessageBubbleTenant: {
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  ownerMessageSender: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  ownerMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  ownerMessageDate: {
    color: '#CBD5E1',
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
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
  changePhotoButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
  },
  changePhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
