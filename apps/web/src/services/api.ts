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

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await response.text();
          data = text ? JSON.parse(text) : null;
        } catch (parseError) {
          // JSON解析失败
          return { error: 'Invalid response format' };
        }
      } else if (response.status === 204 || response.status === 201) {
        // 无内容响应（如DELETE成功）
        data = null;
      } else {
        // 非JSON响应
        const text = await response.text();
        return { error: text || 'Request failed' };
      }

      if (!response.ok) {
        return { error: data?.message || data?.error?.message || 'Request failed' };
      }

      return { data };
    } catch (error) {
      // 网络错误或其他错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { error: 'Network error: Unable to connect to server' };
      }
      return { error: error instanceof Error ? error.message : 'Network error' };
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
