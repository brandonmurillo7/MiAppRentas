import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CustomButton } from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';

type ContractType = 'Venta' | 'Alquiler';
type PropertyType = 'Casa' | 'Local' | 'Apartamento';
type CurrencyType = 'Lempiras' | 'Dolares';

const SelectButton = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <Text onPress={onPress} style={[styles.selectItem, selected && styles.selectItemActive]}>
      {label}
    </Text>
  );
};

export const CreateListingScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [contractType, setContractType] = useState<ContractType>('Venta');
  const [propertyType, setPropertyType] = useState<PropertyType>('Casa');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('Lempiras');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const validate = () => {
    if (!neighborhood.trim()) {
      Alert.alert('Campo requerido', 'Debes ingresar Barrio/Colonia.');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('Campo requerido', 'Debes ingresar la ciudad.');
      return false;
    }
    if (!/^\d+$/.test(price.trim()) || Number.parseInt(price, 10) <= 0) {
      Alert.alert('Precio inválido', 'Debes ingresar un valor entero mayor a 0.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (user?.role !== 'seller') {
      Alert.alert('Acceso denegado', 'Solo los usuarios Propietario pueden crear publicaciones.');
      return;
    }
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        Alert.alert('Sesion expirada', 'Inicia sesion nuevamente para poder subir fotografias.');
        setIsSaving(false);
        return;
      }

      const uploadedImageUrls: string[] = [];

      for (const uri of photos) {
        const extension = uri.split('.').pop()?.toLowerCase();
        if (!extension || !['jpg', 'jpeg', 'png'].includes(extension)) {
          Alert.alert('Formato inválido', 'Solo se permiten imágenes jpg, jpeg o png.');
          setIsSaving(false);
          return;
        }

        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const filePath = `products/${user.email}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, arrayBuffer, {
            contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          const detail = uploadError.message || 'Error desconocido de Storage.';
          Alert.alert(
            'Error al subir imágenes',
            `No se pudo subir una fotografía.\n\nDetalle: ${detail}\n\nVerifica que exista el bucket property-images y sus políticas de inserción/lectura para usuarios autenticados.`
          );
          setIsSaving(false);
          return;
        }

        const { data: publicData } = supabase.storage.from('property-images').getPublicUrl(filePath);
        if (publicData?.publicUrl) {
          uploadedImageUrls.push(publicData.publicUrl);
        }
      }

      const payload = {
        owner_email: user.email,
        contract_type: contractType,
        property_type: propertyType,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        description: description.trim(),
        price: Number(price),
        currency,
        available: true,
        image_urls: uploadedImageUrls,
      };

      const { error } = await supabase.from('properties').insert(payload);

      if (error) {
        Alert.alert('Error al guardar', error.message);
        return;
      }

      Alert.alert('Publicación creada', 'Tu propiedad fue registrada correctamente.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error al registrar la propiedad.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a tus fotos para continuar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 8,
    });

    if (result.canceled) {
      return;
    }

    const pickedUris: string[] = result.assets.map((asset: ImagePicker.ImagePickerAsset) => asset.uri);
    const hasInvalid = pickedUris.some((uri: string) => {
      const ext = uri.split('.').pop()?.toLowerCase();
      return !ext || !['jpg', 'jpeg', 'png'].includes(ext);
    });

    if (hasInvalid) {
      Alert.alert('Formato inválido', 'Solo se permiten archivos jpg, jpeg y png.');
      return;
    }

    setPhotos(pickedUris);
  };

  const scrollFocusedField = (target: number) => {
    const scrollResponder = (scrollRef.current as any)?.getScrollResponder?.();
    scrollResponder?.scrollResponderScrollNativeHandleToKeyboard(target, 120, true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 24}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.title}>Crear Nuevo...</Text>
        <Text style={styles.subtitle}>Completa la información de tu propiedad</Text>

      <Text style={styles.label}>Tipo de Contrato</Text>
      <View style={styles.row}>
        <SelectButton label="Venta" selected={contractType === 'Venta'} onPress={() => setContractType('Venta')} />
        <SelectButton label="Alquiler" selected={contractType === 'Alquiler'} onPress={() => setContractType('Alquiler')} />
      </View>

      <Text style={styles.label}>Tipo de Arrendamiento</Text>
      <View style={styles.rowWrap}>
        <SelectButton label="Casa" selected={propertyType === 'Casa'} onPress={() => setPropertyType('Casa')} />
        <SelectButton label="Local" selected={propertyType === 'Local'} onPress={() => setPropertyType('Local')} />
        <SelectButton label="Apartamento" selected={propertyType === 'Apartamento'} onPress={() => setPropertyType('Apartamento')} />
      </View>

      <Text style={styles.label}>Ubicación</Text>
      <TextInput
        value={neighborhood}
        onChangeText={setNeighborhood}
        placeholder="Barrio/Colonia"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="Ciudad"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />

      <Text style={styles.label}>Descripción</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe el producto que estás ofreciendo"
        placeholderTextColor="#94A3B8"
        style={[styles.input, styles.textArea]}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Precio</Text>
      <View style={styles.priceInputWrapper}>
        <Text style={styles.pricePrefix}>{currency === 'Lempiras' ? 'L.' : '$'}</Text>
        <TextInput
          value={price}
          onChangeText={(text) => setPrice(text.replace(/\D/g, ''))}
          onFocus={(event) => scrollFocusedField(event.nativeEvent.target)}
          keyboardType="numeric"
          style={[styles.input, styles.priceInput]}
        />
      </View>

      <Text style={styles.label}>Moneda</Text>
      <View style={styles.row}>
        <SelectButton label="Lempiras" selected={currency === 'Lempiras'} onPress={() => setCurrency('Lempiras')} />
        <SelectButton label="Dolares" selected={currency === 'Dolares'} onPress={() => setCurrency('Dolares')} />
      </View>

      <Text style={styles.label}>Fotografías</Text>
      <TouchableOpacity style={styles.pickPhotosButton} onPress={handlePickPhotos}>
        <Text style={styles.pickPhotosText}>{photos.length > 0 ? 'Cambiar fotografías' : 'Agregar fotografías'}</Text>
      </TouchableOpacity>
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photoPreview} />
          ))}
        </ScrollView>
      )}

        <View style={styles.buttonWrapper}>
          <CustomButton title={isSaving ? 'Guardando...' : 'Guardar Publicación'} onPress={handleSubmit} disabled={isSaving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
    color: '#64748B',
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  selectItemActive: {
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    borderColor: '#1E3A8A',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    marginBottom: 12,
    color: '#0F172A',
  },
  priceInputWrapper: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  pricePrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
    minWidth: 20,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  pickPhotosButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  pickPhotosText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  photosRow: {
    marginTop: 10,
    marginBottom: 6,
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
  buttonWrapper: {
    marginTop: 18,
  },
});
