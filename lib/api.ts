// lib/api.ts
import axios from 'axios';

export const API_URL = 'http://localhost:8000';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Service {
  id: number;
  title: string;
  description: string;
  price: number;
  created_at: string;
  provider_id: number;
  image: string;
  rating: number;
  provider_name: string;
}

export interface ServiceCreate {
  title: string;
  description: string;
  price: number;
  image?: string;
}

export interface ServiceUpdate extends Partial<ServiceCreate> {
  is_active?: boolean;
}

export interface Booking {
  id: string;
  service_id: string;
  homeowner_id: string;
  serviceTitle: string;
  providerName: string;
  providerId: string;
  scheduled_date: string;
  time: string;
  status: string;
  price: number;
  address: string;
  notes?: string;
  created_at?: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  // Add other fields as needed
}

const getAuthToken = (): string => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
};

export const getServices = async (): Promise<Service[]> => {
  const response = await fetch(`${API_URL}/services/`);
  if (!response.ok) {
    throw new Error('Failed to fetch services');
  }
  return response.json();
};

export const createService = async (serviceData: {
  title: string;
  description: string;
  price: number;
  image: string;
  rating?: number;
}): Promise<Service> => {
  const token = getAuthToken();

  // Get provider info
  const userResponse = await fetch(`${API_URL}/auth/validate/user`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!userResponse.ok) {
    throw new Error('Failed to validate user');
  }

  const userData = await userResponse.json();

  const fullServiceData = {
    ...serviceData,
    provider_id: userData.user_id,
    provider_name: userData.full_name || 'Provider'
  };

  const response = await fetch(`${API_URL}/services/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(fullServiceData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to create service');
  }

  return response.json();
};

export const getService = async (id: number): Promise<Service> => {
  const response = await fetch(`${API_URL}/services/${id}`);
  if (!response.ok) {
    throw new Error('Service not found');
  }
  return response.json();
};

export const getServicesByProvider = async (): Promise<Service[]> => {
  const response = await api.get("/provider/services");
  return response.data;
};

export const updateService = async (id: number, serviceData: ServiceUpdate): Promise<Service> => {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}/services/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(serviceData),
  });

  if (!response.ok) {
    throw new Error('Failed to update service');
  }

  return response.json();
};

export const deleteService = async (id: number): Promise<void> => {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}/services/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete service');
  }
};

export async function createBooking(bookingData: {
  service_id: string;
  service_title?: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  notes?: string;
  provider_name?: string;
  homeowner_name?: string;
}) {  
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/bookings/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...bookingData,
      // Ensure all required fields are sent
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service_title: bookingData.service_title || 'Service',
      provider_name: bookingData.provider_name || 'Provider',
      homeowner_name: bookingData.homeowner_name || 'Homeowner'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create booking');
  }

  return await response.json();
}

export async function getBookings(): Promise<any> {
  const token = getAuthToken();
  try {
    const response = await fetch(`${API_URL}/bookings/homeowner/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in getBookings:', error);
    throw error;
  }
}

export const getProviderBookings = async (): Promise<Booking[]> => {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}/bookings/provider/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch provider bookings');
  }

  return response.json();
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });

  if (!response.ok) {
    throw new Error('Failed to cancel booking');
  }
};

export const getBookingsByProvider = async (): Promise<Booking[]> => {
  const response = await api.get(`${API_URL}/provider/bookings`);
  return response.data;
}

export const updateBookingStatus = async (bookingId: string, status: string): Promise<void> => {
  await api.patch(`${API_URL}/provider/bookings/${bookingId}/status`, { status });
}

export const getProviderAvailability = async (providerId: string, date: string): Promise<TimeSlot[]> => {
  const response = await fetch(`${API_URL}/providers/${providerId}/availability?date=${date}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch provider availability');
  }
  return response.json();
};

export default api;
