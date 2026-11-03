import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { sl } from '@/constants/i18n';
import { useLocaleStore } from '@/lib/i18n/locale';

// Stored value is always a `YYYY-MM-DD` string (or '' when unset), matching
// what the backend/web forms expect. The user never types it — they pick it.
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string): Date {
  // Parse as local midnight to avoid the UTC off-by-one that `new Date('YYYY-MM-DD')` causes.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

interface Props {
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DatePickerField({
  value, onChange, placeholder, minimumDate, maximumDate,
}: Props): React.ReactElement {
  const locale = useLocaleStore((s) => s.locale);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(() => (value ? parseYmd(value) : new Date()));

  const display = value
    ? parseYmd(value).toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : (placeholder ?? '');

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: value ? parseYmd(value) : new Date(),
      mode: 'date',
      minimumDate,
      maximumDate,
      onChange: (event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === 'set' && selected) onChange(toYmd(selected));
      },
    });
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      openAndroid();
    } else {
      setIosDraft(value ? parseYmd(value) : new Date());
      setIosOpen(true);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={openPicker} activeOpacity={0.7}>
        <Text style={[styles.value, !value && styles.placeholder]}>{display}</Text>
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalBar}>
                <TouchableOpacity onPress={() => setIosOpen(false)}>
                  <Text style={styles.modalCancel}>{sl.common.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { onChange(toYmd(iosDraft)); setIosOpen(false); }}>
                  <Text style={styles.modalDone}>{sl.common.save}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="spinner"
                // Pin the picker to a light theme + explicit dark text so the
                // numerals stay readable inside the white modal sheet even when
                // the device is in dark mode (otherwise the system-coloured
                // labels come out near-white on white).
                themeVariant="light"
                textColor="#1e293b"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_e, selected) => { if (selected) setIosDraft(selected); }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f9fafb',
  },
  value:       { fontSize: 15, color: '#1e293b' },
  placeholder: { color: '#9ca3af' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  modalBar:      { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalCancel:   { color: '#64748b', fontSize: 15 },
  modalDone:     { color: '#3b82f6', fontSize: 15, fontWeight: '700' },
});
