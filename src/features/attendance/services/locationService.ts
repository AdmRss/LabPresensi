import * as Location from "expo-location";

export type LocationSample = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  timestamp: number;
};

export class LocationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationServiceError";
  }
}

/**
 * Requests foreground location permission from the device.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  return status === "granted";
}

/**
 * Checks whether device location services are enabled.
 */
export async function isLocationEnabled(): Promise<boolean> {
  return await Location.hasServicesEnabledAsync();
}

/**
 * Gets the current device location.
 */
export async function getCurrentLocation(): Promise<LocationSample> {
  const permissionGranted = await requestLocationPermission();

  if (!permissionGranted) {
    throw new LocationServiceError(
      "Location permission was denied. Please allow location access.",
    );
  }

  const servicesEnabled = await isLocationEnabled();

  if (!servicesEnabled) {
    throw new LocationServiceError(
      "Location services are disabled. Please enable GPS.",
    );
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracyMeters: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch {
    throw new LocationServiceError(
      "Unable to retrieve your location. Please try again.",
    );
  }
}
