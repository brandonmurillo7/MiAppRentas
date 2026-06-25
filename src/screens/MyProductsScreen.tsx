import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';

interface ProductItem {
  id: number;
  contract_type: 'Venta' | 'Alquiler';
  property_type: 'Casa' | 'Local' | 'Apartamento';
  neighborhood: string;
  price: number;
  currency: 'Lempiras' | 'Dolares';
  available: boolean;
  created_at: string;
}

const formatPrice = (price: number, currency: 'Lempiras' | 'Dolares') => {
  if (currency === 'Dolares') {
    return `$ ${price.toLocaleString()}`;
  }
  return `L ${price.toLocaleString()}`;
};

export const MyProductsScreen = () => {
  const { user, theme } = useAuth();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<'Venta' | 'Alquiler'>('Venta');

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
      .select('id, contract_type, property_type, neighborhood, price, currency, available, created_at')
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

  const filteredItems = items.filter((item) => item.contract_type === selectedType);

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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor }]}> 
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={[styles.loadingText, { color: subtitleColor }]}>Cargando productos...</Text>
      </View>
    );
  }

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
            {selectedType === 'Venta' ? 'Mis Ventas' : 'Mis Rentas'}
          </Text>
          <Text style={[styles.filterChevron, { color: subtitleColor }]}>{showTypeMenu ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showTypeMenu && (
          <View style={[styles.filterMenu, { backgroundColor: cardColor, borderColor: theme === 'light' ? '#CBD5E1' : '#334155' }]}>
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
            <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>Cambia entre Mis Ventas y Mis Rentas para ver tus publicaciones.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.tableRow, { backgroundColor: cardColor }]}> 
            <Text style={[styles.rowCellIndex, { color: textColor }]}>{index + 1}.</Text>
            <Text style={[styles.rowCellProduct, { color: textColor }]}>{item.property_type} en {item.neighborhood}</Text>
            <Text style={[styles.rowCellPrice, { color: textColor }]}>{formatPrice(item.price, item.currency)}</Text>
            <TouchableOpacity style={[styles.statusPill, item.available ? styles.statusYes : styles.statusNo]} onPress={() => toggleAvailability(item)}>
              <Text style={styles.statusText}>{item.available ? 'Disponible' : 'Ocupada'}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
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
    textAlign: 'right',
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
  },
  rowCellIndex: {
    width: '10%',
    fontSize: 13,
    fontWeight: '700',
  },
  rowCellProduct: {
    width: '42%',
    fontSize: 13,
    fontWeight: '700',
  },
  rowCellPrice: {
    width: '24%',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  statusPill: {
    width: '24%',
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
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
