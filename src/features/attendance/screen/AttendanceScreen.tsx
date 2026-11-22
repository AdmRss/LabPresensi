import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    getCurrentLocation,
    type LocationSample,
} from "../services/locationService";

import { validateLocationSample } from "../utils/locationValidation";

export default function AttendanceScreen() {
  const [location, setLocation] = useState<LocationSample | null>(null);
  const [status, setStatus] = useState<string>("Not checked yet");
  const [loading, setLoading] = useState(false);

  const handleCheckLocation = async () => {
    setLoading(true);
    setLocation(null);
    setStatus("Retrieving location...");

    try {
      const sample = await getCurrentLocation();

      const validation = validateLocationSample(sample, {
        maxAccuracyMeters: 20,
        maxAgeMs: 60_000,
      });

      setLocation(sample);

      if (validation.valid) {
        setStatus("GPS location is valid.");
      } else {
        setStatus(validation.reason ?? "GPS validation failed.");
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isLocationValid =
    location !== null &&
    validateLocationSample(location, {
      maxAccuracyMeters: 20,
      maxAgeMs: 60_000,
    }).valid;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance</Text>

      <Text style={styles.description}>
        Check your current GPS location before attending a lab session.
      </Text>

      <Pressable
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleCheckLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Check My Location</Text>
        )}
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Location Information</Text>

        {location ? (
          <>
            <Text style={styles.info}>Latitude: {location.latitude}</Text>

            <Text style={styles.info}>Longitude: {location.longitude}</Text>

            <Text style={styles.info}>
              Accuracy:{" "}
              {location.accuracyMeters !== null
                ? `${location.accuracyMeters.toFixed(2)} meters`
                : "Unavailable"}
            </Text>

            <Text style={styles.info}>
              Timestamp: {new Date(location.timestamp).toLocaleString()}
            </Text>
          </>
        ) : (
          <Text style={styles.info}>Location data will appear here.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status</Text>

        <Text style={[styles.status, isLocationValid && styles.validStatus]}>
          {status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#222222",
  },
  description: {
    fontSize: 15,
    color: "#666666",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#222222",
  },
  info: {
    fontSize: 14,
    marginBottom: 8,
    color: "#444444",
  },
  status: {
    fontSize: 14,
    color: "#D97706",
  },
  validStatus: {
    color: "#16A34A",
    fontWeight: "bold",
  },
});
