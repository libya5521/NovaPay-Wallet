import React, { useState, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useSubmitKyc,
  getGetKycStatusQueryKey,
  KycSubmitRequestDocumentType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApiError } from "@/hooks/useApiError";
import Colors from "@/constants/colors";

const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID" },
  { value: "drivers_license", label: "Driver's License" },
];

const NATIONALITIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "OTHER", label: "Other" },
];

interface Props {
  visible: boolean;
  prefillName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function KycFormModal({ visible, prefillName, onClose, onSuccess }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();
  const { getError } = useApiError();

  const [fullName, setFullName] = useState(prefillName);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("US");
  const [documentType, setDocumentType] = useState<KycSubmitRequestDocumentType>("passport");
  const [documentNumber, setDocumentNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("US");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: submitKyc, isPending } = useSubmitKyc();

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full legal name is required";
    if (!dateOfBirth.trim()) {
      e.dateOfBirth = "Date of birth is required";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      e.dateOfBirth = "Use format YYYY-MM-DD";
    } else {
      const dob = new Date(dateOfBirth.trim());
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (isNaN(dob.getTime()) || age < 18) e.dateOfBirth = "You must be at least 18 years old";
    }
    if (!documentNumber.trim()) e.documentNumber = "Document number is required";
    if (!addressLine1.trim()) e.addressLine1 = "Address is required";
    if (!city.trim()) e.city = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [fullName, dateOfBirth, documentNumber, addressLine1, city]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    submitKyc(
      {
        data: {
          fullName: fullName.trim(),
          dateOfBirth: dateOfBirth.trim(),
          nationality,
          documentType,
          documentNumber: documentNumber.trim(),
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          country,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetKycStatusQueryKey() });
          Alert.alert(
            "Verification Submitted",
            "Your documents are under review. We'll notify you within 24–48 hours.",
            [{ text: "OK", onPress: onSuccess }]
          );
          onClose();
        },
        onError: (err: unknown) => {
          Alert.alert("Submission Failed", getError(err));
        },
      }
    );
  }, [
    validate, submitKyc, fullName, dateOfBirth, nationality, documentType,
    documentNumber, addressLine1, city, country, queryClient, onSuccess, onClose, getError,
  ]);

  const handleClose = () => {
    if (!isPending) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Identity Verification</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  All fields are required by regulatory standards
                </Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <SectionLabel label="Personal Information" colors={colors} />

              <Input
                label="Full Legal Name"
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: "" })); }}
                placeholder="As it appears on your ID"
                error={errors.fullName}
                autoCapitalize="words"
              />

              <Input
                label="Date of Birth"
                value={dateOfBirth}
                onChangeText={(t) => { setDateOfBirth(t); setErrors((e) => ({ ...e, dateOfBirth: "" })); }}
                placeholder="YYYY-MM-DD"
                error={errors.dateOfBirth}
                keyboardType="numbers-and-punctuation"
              />

              <PickerField
                label="Nationality"
                value={nationality}
                options={NATIONALITIES}
                onSelect={setNationality}
                colors={colors}
              />

              <SectionLabel label="Identity Document" colors={colors} />

              <PickerField
                label="Document Type"
                value={documentType}
                options={DOCUMENT_TYPES}
                onSelect={(v) => setDocumentType(v as KycSubmitRequestDocumentType)}
                colors={colors}
              />

              <Input
                label="Document Number"
                value={documentNumber}
                onChangeText={(t) => { setDocumentNumber(t); setErrors((e) => ({ ...e, documentNumber: "" })); }}
                placeholder="e.g. A12345678"
                error={errors.documentNumber}
                autoCapitalize="characters"
              />

              <SectionLabel label="Residential Address" colors={colors} />

              <Input
                label="Street Address"
                value={addressLine1}
                onChangeText={(t) => { setAddressLine1(t); setErrors((e) => ({ ...e, addressLine1: "" })); }}
                placeholder="123 Main Street"
                error={errors.addressLine1}
              />

              <Input
                label="City"
                value={city}
                onChangeText={(t) => { setCity(t); setErrors((e) => ({ ...e, city: "" })); }}
                placeholder="Your city"
                error={errors.city}
              />

              <PickerField
                label="Country"
                value={country}
                options={NATIONALITIES}
                onSelect={setCountry}
                colors={colors}
              />

              <View style={[styles.notice, { backgroundColor: colors.tintLight }]}>
                <Feather name="shield" size={14} color={colors.tint} />
                <Text style={[styles.noticeText, { color: colors.tint }]}>
                  Your data is encrypted and processed in accordance with applicable privacy regulations.
                </Text>
              </View>

              <Button
                title="Submit for Verification"
                onPress={handleSubmit}
                loading={isPending}
                fullWidth
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: typeof Colors.light }) {
  return (
    <Text style={[sectionStyles.label, { color: colors.textSecondary }]}>{label}</Text>
  );
}

const sectionStyles = StyleSheet.create({
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
});

function PickerField({
  label,
  value,
  options,
  onSelect,
  colors,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  colors: typeof Colors.light;
}) {
  const current = options.find((o) => o.value === value)?.label ?? value;
  const handlePress = () => {
    Alert.alert(
      label,
      undefined,
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => onSelect(o.value),
          style: o.value === value ? ("default" as const) : ("default" as const),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };
  return (
    <View style={pickerStyles.container}>
      <Text style={[pickerStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        style={[pickerStyles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handlePress}
      >
        <Text style={[pickerStyles.value, { color: colors.text }]}>{current}</Text>
        <Feather name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  value: { fontFamily: "Inter_400Regular", fontSize: 15 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13 },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40, gap: 0 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },
});
