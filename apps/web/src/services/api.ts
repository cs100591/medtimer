const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  // Auth
  async register(email: string, password: string, firstName?: string, lastName?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<{ accessToken: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    if (response.data?.accessToken) {
      this.setToken(response.data.accessToken);
    }
    return response;
  }

  async logout() {
    this.clearToken();
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Medications
  async getMedications() {
    return this.request('/medications');
  }

  async createMedication(medication: any) {
    return this.request('/medications', {
      method: 'POST',
      body: JSON.stringify(medication),
    });
  }

  async updateMedication(id: string, medication: any) {
    return this.request(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medication),
    });
  }

  async deleteMedication(id: string) {
    return this.request(`/medications/${id}`, {
      method: 'DELETE',
    });
  }

  // Adherence
  async getAdherenceHistory(params?: { startDate?: string; endDate?: string }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request(`/adherence/history${query}`);
  }

  async markTaken(medicationId: string, scheduleId?: string) {
    return this.request('/adherence/taken', {
      method: 'POST',
      body: JSON.stringify({ medicationId, scheduleId }),
    });
  }

  async markSkipped(medicationId: string, reason?: string) {
    return this.request('/adherence/skipped', {
      method: 'POST',
      body: JSON.stringify({ medicationId, reason }),
    });
  }

  async snooze(medicationId: string, minutes: number) {
    return this.request('/adherence/snooze', {
      method: 'POST',
      body: JSON.stringify({ medicationId, minutes }),
    });
  }

  async getAdherenceStats() {
    return this.request('/adherence/stats');
  }

  async getPendingReminders() {
    return this.request('/adherence/pending');
  }
}

export const api = new ApiService();
export default api;
