import React, { useState } from 'react';
import { View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { productsApi } from '@/lib/api/products';
import { warehousesApi } from '@/lib/api/warehouses';
import { companiesApi } from '@/lib/api/companies';
import { fleetApi } from '@/lib/api/fleet';
import { queryKeys } from '@erp/domain';
import { formatApiError } from '@/lib/http/errors';
import { sl } from '@/constants/i18n';
import { DatePickerField } from '@/components/ui/DatePickerField';

export default function CreateOrderScreen(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [productId,    setProductId]    = useState('');
  const [companyId,    setCompanyId]    = useState('');
  const [warehouseId,  setWarehouseId]  = useState('');
  const [driverId,     setDriverId]     = useState('');
  const [quantity,     setQuantity]     = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Delivery can be scheduled from today up to one year ahead.
  const today        = React.useMemo(() => new Date(), []);
  const oneYearAhead = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }, []);

  const { data: products }   = useQuery({ queryKey: queryKeys.products,   queryFn: productsApi.getAll });
  const { data: warehouses } = useQuery({ queryKey: queryKeys.warehouses, queryFn: warehousesApi.getAll });
  const { data: companies }  = useQuery({ queryKey: queryKeys.companies,  queryFn: companiesApi.getAll });
  const { data: drivers }    = useQuery({ queryKey: queryKeys.drivers,    queryFn: fleetApi.getAllDrivers });

  const mutation = useMutation({
    mutationFn: () => ordersApi.create({
      productId, companyId, warehouseId, driverId,
      quantity: parseInt(quantity, 10),
      // Send `YYYY-MM-DD` like the web form; backend accepts the ISO date.
      // null when blank so the backend can apply its default / leave unset.
      deliveryDate: deliveryDate.trim() ? deliveryDate.trim() : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      router.back();
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  const canSubmit = productId && companyId && warehouseId && driverId && parseInt(quantity, 10) > 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>{sl.common.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.orders.newOrder}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Field label={sl.orders.product}>
          <InlineList
            items={(products ?? []).map((p) => ({ id: p.id, label: `${p.name} (${p.sku})` }))}
            selected={productId} onSelect={setProductId}
          />
        </Field>

        <Field label={sl.orders.company}>
          <InlineList
            items={(companies ?? []).map((c) => ({ id: c.id, label: c.name }))}
            selected={companyId} onSelect={setCompanyId}
          />
        </Field>

        <Field label={sl.orders.warehouse}>
          <InlineList
            items={(warehouses ?? []).map((w) => ({ id: w.id, label: w.name }))}
            selected={warehouseId} onSelect={setWarehouseId}
          />
        </Field>

        <Field label={sl.orders.driver}>
          <InlineList
            items={(drivers ?? []).map((d) => ({ id: d.id, label: `${d.name} (${d.phone})` }))}
            selected={driverId} onSelect={setDriverId}
          />
        </Field>

        <Field label={sl.orders.quantity}>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="0"
          />
        </Field>

        <Field label={sl.orders.deliveryDate}>
          <DatePickerField
            value={deliveryDate}
            onChange={setDeliveryDate}
            placeholder={sl.common.selectPlaceholder}
            minimumDate={today}
            maximumDate={oneYearAhead}
          />
        </Field>

        <TouchableOpacity
          style={[styles.btn, (!canSubmit || mutation.isPending) && styles.btnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{sl.orders.newOrder}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function InlineList({ items, selected, onSelect }: {
  items: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}): React.ReactElement {
  return (
    <View style={il.list}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[il.item, selected === item.id && il.itemActive]}
          onPress={() => onSelect(item.id)}
        >
          <Text style={[il.text, selected === item.id && il.textActive]} numberOfLines={1}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const il = StyleSheet.create({
  list:      { gap: 4 },
  item:      { padding: 10, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  itemActive:{ backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  text:      { fontSize: 13, color: '#374151' },
  textActive:{ color: '#3b82f6', fontWeight: '600' },
});

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f1f5f9' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cancel:     { color: '#3b82f6', fontSize: 15 },
  title:      { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  content:    { padding: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:      { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  btn:        { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled:{ opacity: 0.5 },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
