import axios from 'axios';
// @ts-ignore: ignore missing type declarations for async-storage in this environment
const AsyncStorage: any = require('@react-native-async-storage/async-storage').default;

const API_BASE_URL = 'http://localhost:8081';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userType');
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export interface SignupMusicianData {
  name: string;
  email: string;
  password: string;
  bio?: string;
  location?: string;
  genres?: string[];
  vibes?: string[];
  minimumFee?: string;
  willingToTravel?: boolean;
  websiteUrl?: string;
  instagramHandle?: string;
}

export interface SignupVenueData {
  venueName: string;
  email: string;
  password: string;
  description?: string;
  location?: string;
  capacity?: number;
  genrePreferences?: string[];
  ambience?: string[];
  typicalBudget?: string;
  liveMusic?: boolean;
  websiteUrl?: string;
}

export interface SignupPromoterData {
  businessName: string;
  email: string;
  password: string;
  bio?: string;
  location?: string;
  genreSpecialties?: string[];
  eventTypes?: string[];
  acceptingNewArtists?: boolean;
  currentRosterSize?: number;
  websiteUrl?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userType: 'MUSICIAN' | 'VENUE' | 'PROMOTER';
  userId: string;
  displayName?: string;
}

export const authAPI = {
  // Signup endpoints
  signupMusician: async (data: SignupMusicianData): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup/musician', data);
    return response.data;
  },

  signupVenue: async (data: SignupVenueData): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup/venue', data);
    return response.data;
  },

  signupPromoter: async (data: SignupPromoterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup/promoter', data);
    return response.data;
  },

  // Login endpoint
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
};

// Storage helpers
export const storageHelpers = {
  saveAuthData: async (token: string, userType: string) => {
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userType', userType);
  },

  getAuthData: async () => {
    const token = await AsyncStorage.getItem('authToken');
    const userType = await AsyncStorage.getItem('userType');
    return { token, userType };
  },

  clearAuthData: async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userType');
  },
};

export default api;

// ── Musician API ─────────────────────────────────────────────────

export interface MusicianProfile {
  id: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  genres?: string[];
  vibes?: string[];
  minimumFee?: string;
  willingToTravel?: boolean;
  websiteUrl?: string;
  instagramHandle?: string;
}

export interface VenueMatch {
  id: string;
  venueName: string;
  location?: string;
  capacity?: number;
  genrePreferences?: string[];
  ambience?: string[];
  typicalBudget?: string;
  websiteUrl?: string;
  matchScore?: string;
}

export interface VenueSummary {
  id: string;
  venueName: string;
  location?: string;
  capacity?: number;
  genrePreferences?: string[];
  ambience?: string[];
  typicalBudget?: string;
  liveMusic?: boolean;
}

export const musicianAPI = {
  getProfile: async (id: string): Promise<MusicianProfile> => {
    const response = await api.get(`/musicians/${id}`);
    return response.data;
  },

  updateProfile: async (id: string, data: Partial<MusicianProfile>): Promise<void> => {
    await api.put(`/musicians/${id}`, data);
  },

  getVenueMatches: async (id: string): Promise<VenueMatch[]> => {
    const response = await api.get(`/musicians/${id}/matches`);
    return response.data;
  },

  search: async (params?: { genre?: string; location?: string }): Promise<MusicianProfile[]> => {
    const response = await api.get('/musicians/search', { params });
    return response.data;
  },
};

export const venueAPI = {
  search: async (params?: {
    genre?: string;
    location?: string;
    minCapacity?: number;
    liveMusic?: boolean;
  }): Promise<VenueSummary[]> => {
    const response = await api.get('/venues/search', { params });
    return response.data;
  },

  getVenue: async (id: string): Promise<any> => {
    const response = await api.get(`/venues/${id}`);
    return response.data;
  },
};
