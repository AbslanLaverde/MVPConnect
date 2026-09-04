import type {
  LocationSuggestionProvider,
  LocationValue,
} from '../components/onboarding/LocationField';
import api from './api';

interface LocationSuggestionResponse {
  placeId: string;
  displayName: string;
}

type LocationMode = 'city' | 'address';

export const createLocationSuggestionProvider = (
  mode: LocationMode,
): LocationSuggestionProvider => ({
  search: async (query) => {
    const response = await api.get<LocationSuggestionResponse[]>('/locations/suggestions', {
      params: { query, mode: mode.toUpperCase() },
    });
    return response.data.map<LocationValue>((suggestion) => ({
      displayName: suggestion.displayName,
      city: '',
      state: '',
      country: '',
      placeId: suggestion.placeId,
    }));
  },
  resolve: async (suggestion) => {
    if (!suggestion.placeId) return suggestion;
    const response = await api.get<LocationValue>('/locations/place', {
      params: { placeId: suggestion.placeId },
    });
    return response.data;
  },
});

export const cityLocationProvider = createLocationSuggestionProvider('city');
export const addressLocationProvider = createLocationSuggestionProvider('address');
