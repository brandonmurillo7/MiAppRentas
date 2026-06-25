import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';

interface ProductItem {
  id: number;
  contract_type: 'Venta' | 'Alquiler';
  property_type: 'Casa' | 'Local' | 'Apartamento';
  neighborhood: string;
  description: string | null;
  image_urls: string[] | null;
  price: number;
  currency: 'Lempiras' | 'Dolares';
  available: boolean;
  created_at: string;
}

const formatPrice = (price: number, currency: 'Lempiras' | 'Dolares') => {
  if (currency === 'Dolares') {
    return `$${price.toLocaleString()}`;
  }
  return `L${price.toLocaleString()}`;
};

export const MyProductsScreen = () => {
  const { user, theme } = useAuth();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<'Todos' | 'Venta' | 'Alquiler'>('Todos');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const backgroundColor = theme === 'light' ? '#F8FAFC' : '#0F172A';
  const cardColor = theme === 'light' ? '#FFFFFF' : '#111827';
  const textColor = theme === 'light' ? '#0F172A' : '#F8FAFC';
  const subtitleColor = theme === 'light' ? '#64748B' : '#CBD5E1';

  const fetchProducts = useCallback(async () => {
    if (!user?.email || user.role !== 'seller') {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('properties')
      .select('id, contract_type, property_type, neighborhood, description, image_urls, price, currency, available, created_at')
      .eq('owner_email', user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchProducts error', error.message);
      setItems([]);
    } else {
      setItems((data || []) as ProductItem[]);
    }

    setLoading(false);
  }, [user?.email, user?.role]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProducts();
    }, [fetchProducts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const filteredItems = selectedType === 'Todos'
    ? items
    : items.filter((item) => item.contract_type === selectedType);

  const toggleAvailability = async (item: ProductItem) => {
    if (!user?.email) {
      return;
    }

    const nextValue = !item.available;

    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, available: nextValue } : row)));

    const { error } = await supabase
      .from('properties')
      .update({ available: nextValue })
      .eq('id', item.id)
      .eq('owner_email', user.email);

    if (error) {
      console.warn('toggleAvailability error', error.message);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, available: item.available } : row)));
    }
  };

  const deleteProduct = async (item: ProductItem) => {
    if (!user?.email) {
      return;
    }

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', item.id)
      .eq('owner_email', user.email);

    if (error) {
      Alert.alert('Error al eliminar', error.message);
      return;
    }

    setItems((current) => current.filter((row) => row.id !== item.id));
    setExpandedItemId((current) => (current === item.id ? null : current));
  };

  const confirmDeleteProduct = (item: ProductItem) => {
    Alert.alert(
      'Eliminar producto',
      '¿Deseas borrar este producto? Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteProduct(item);
          },
        },
      ]
    );
  };

  const openGallery = (images: string[], index: number) => {
    setGalleryImages(images);
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  const renderSummary = (item: ProductItem, textColor: string, subtitleColor: string) => {
    const imageUrls = Array.isArray(item.image_urls) ? item.image_urls : [];
    return (
      <View style={styles.summaryWrap}>
        {imageUrls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryPhotosRow}>
            {imageUrls.map((url, index) => (
              <TouchableOpacity key={`${item.id}-${url}-${index}`} onPress={() => openGallery(imageUrls, index)}>
                <Image source={{ uri: url }} style={styles.summaryImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.summaryContent}>
          <Text style={[styles.summaryTitle, { color: textColor }]}>Resumen</Text>
          <Text style={[styles.summaryText, { color: subtitleColor }]} numberOfLines={3}>
            {item.description?.trim() || 'Sin descripcion registrada para este producto.'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor }]}> 
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={[styles.loadingText, { color: subtitleColor }]}>Cargando productos...</Text>
      </View>
    );
  }

  const viewportWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { backgroundColor }]}> 
      <Text style={[styles.title, { color: textColor }]}>Mis Productos</Text>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>Visualiza tus publicaciones por tipo y revisa su estado (Disponible u Ocupada).</Text>

      <View style={styles.filterWrapper}>
        <Text style={[styles.filterLabel, { color: subtitleColor }]}>Tipo de listado</Text>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: cardColor, borderColor: theme === 'light' ? '#CBD5E1' : '#334155' }]}
          onPress={() => setShowTypeMenu((current) => !current)}
        >
          <Text style={[styles.filterButtonText, { color: textColor }]}>
            {selectedType === 'Todos' ? 'Todos' : selectedType === 'Venta' ? 'Mis Ventas' : 'Mis Rentas'}
          </Text>
          <Text style={[styles.filterChevron, { color: subtitleColor }]}>{showTypeMenu ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showTypeMenu && (
          <View style={[styles.filterMenu, { backgroundColor: cardColor, borderColor: theme === 'light' ? '#CBD5E1' : '#334155' }]}>
            <TouchableOpacity
              style={styles.filterMenuItem}
              onPress={() => {
                setSelectedType('Todos');
                setShowTypeMenu(false);
              }}
            >
              <Text style={[styles.filterMenuText, { color: textColor }]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterMenuItem}
              onPress={() => {
                setSelectedType('Venta');
                setShowTypeMenu(false);
              }}
            >
              <Text style={[styles.filterMenuText, { color: textColor }]}>Mis Ventas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterMenuItem}
              onPress={() => {
                setSelectedType('Alquiler');
                setShowTypeMenu(false);
              }}
            >
              <Text style={[styles.filterMenuText, { color: textColor }]}>Mis Rentas</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.tableHeader, { backgroundColor: cardColor }]}> 
        <Text style={[styles.headerCellIndex, { color: textColor }]}>No</Text>
        <Text style={[styles.headerCellProduct, { color: textColor }]}>Producto</Text>
        <Text style={[styles.headerCellPrice, { color: textColor }]}>Precio</Text>
        <Text style={[styles.headerCellStatus, { color: textColor }]}>Estado</Text>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={filteredItems.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: cardColor }]}> 
            <Text style={[styles.emptyTitle, { color: textColor }]}>Sin resultados en esta vista</Text>
            <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>Cambia entre Todos, Mis Ventas y Mis Rentas para ver tus publicaciones.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.tableRow, { backgroundColor: cardColor }]}> 
            <TouchableOpacity
              style={styles.rowMainPressable}
              onPress={() => setExpandedItemId((current) => (current === item.id ? null : item.id))}
              activeOpacity={0.85}
            >
              <Text style={[styles.rowCellIndex, { color: textColor }]}>{index + 1}.</Text>
              <Text style={[styles.rowCellProduct, { color: textColor }]} numberOfLines={1} ellipsizeMode="tail">
                {item.property_type} en {item.neighborhood}
              </Text>
              <Text style={[styles.rowCellPrice, { color: textColor }]}>{formatPrice(item.price, item.currency)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statusPill, item.available ? styles.statusYes : styles.statusNo]} onPress={() => toggleAvailability(item)}>
              <Text style={styles.statusText}>{item.available ? 'Disponible' : 'Ocupada'}</Text>
            </TouchableOpacity>
            {expandedItemId === item.id && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteProduct(item)}>
                <Ionicons name="trash" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {expandedItemId === item.id && renderSummary(item, textColor, subtitleColor)}
          </View>
        )}
      />

      <Modal visible={galleryVisible} transparent={false} animationType="fade" onRequestClose={() => setGalleryVisible(false)}>
        <View style={styles.galleryModal}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryCounter}>{galleryImages.length > 0 ? `${galleryIndex + 1} / ${galleryImages.length}` : '0 / 0'}</Text>
            <TouchableOpacity style={styles.galleryCloseButton} onPress={() => setGalleryVisible(false)}>
              <Text style={styles.galleryCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: galleryIndex * viewportWidth, y: 0 }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
              setGalleryIndex(nextIndex);
            }}
          >
            {galleryImages.map((url, index) => (
              <View key={`${url}-${index}`} style={[styles.gallerySlide, { width: viewportWidth }]}> 
                <Image source={{ uri: url }} style={styles.galleryImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 14,
  },
  filterWrapper: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterChevron: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterMenu: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  filterMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterMenuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
    gap: 8,
  },
  tableHeader: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  headerCellIndex: {
    width: '10%',
    fontSize: 13,
    fontWeight: '700',
  },
  headerCellProduct: {
    width: '42%',
    fontSize: 13,
    fontWeight: '700',
  },
  headerCellPrice: {
    width: '24%',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
    paddingLeft: 0,
  },
  headerCellStatus: {
    width: '24%',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableRow: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexWrap: 'wrap',
  },
  rowMainPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '76%',
  },
  rowCellIndex: {
    width: 26,
    fontSize: 13,
    fontWeight: '700',
  },
  rowCellProduct: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  rowCellPrice: {
    minWidth: 98,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
    paddingLeft: 2,
  },
  statusPill: {
    width: '24%',
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
  },
  deleteButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 30,
    height: 30,
    backgroundColor: '#DC2626',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusYes: {
    backgroundColor: '#16A34A',
  },
  statusNo: {
    backgroundColor: '#DC2626',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryWrap: {
    width: '100%',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 10,
  },
  summaryPhotosRow: {
    marginBottom: 10,
    gap: 8,
  },
  summaryImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
  },
  galleryModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  galleryHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryCounter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  galleryCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  galleryCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  gallerySlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: {
    width: '100%',
    height: '80%',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
});
