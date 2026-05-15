import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  LoginCredentials,
  AuthResponse,
  CreditTransaction,
  CreditBalance,
  WABAAccount,
  PhoneNumber,
  Template,
  Webhook,
  Contact,
  ContactTag,
  ContactList,
  Campaign,
  APIResponse,
  PaginatedResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ;

class APIClient {
  private client: AxiosInstance;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 60000,
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<APIResponse>) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
        }
        return Promise.reject(error);
      }
    );
  }

  // Deduplicate GET requests - return same promise for identical in-flight requests
  private async deduplicatedGet<T>(url: string, config?: any): Promise<T> {
    const key = `GET:${url}`;
    
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = (async () => {
      try {
        const response = await this.client.get<T>(url, config);
        return response.data;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Auth API
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<APIResponse<AuthResponse>>('/auth/login', credentials);
    return response.data.data!;
  }

  async register(data: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    company_id?: string;
  }): Promise<User> {
    const response = await this.client.post<APIResponse<User>>('/auth/register', data);
    return response.data.data!;
  }

  async getProfile(): Promise<{ user: User; company?: any }> {
    const response = await this.client.get<APIResponse<{ user: User; company?: any }>>('/auth/profile');
    return response.data.data!;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // Credit API
  async getCreditBalance(companyId: string): Promise<CreditBalance> {
    const response = await this.client.get<APIResponse<CreditBalance>>(`/admin/credits/balance/${companyId}`);
    return response.data.data!;
  }

  async getTransactions(companyId: string, limit = 100): Promise<CreditTransaction[]> {
    const response = await this.client.get<APIResponse<CreditTransaction[]>>(
      `/admin/credits/transactions/${companyId}?limit=${limit}`
    );
    return response.data.data!;
  }

  async addCredit(companyId: string, amount: number, description?: string): Promise<any> {
    const response = await this.client.post<APIResponse>('/admin/credits/add', {
      company_id: companyId,
      amount,
      description,
    });
    return response.data.data;
  }

  async refundCredit(companyId: string, transactionId: string, reason?: string): Promise<CreditTransaction> {
    const response = await this.client.post<APIResponse<CreditTransaction>>('/admin/credits/refund', {
      company_id: companyId,
      transaction_id: transactionId,
      reason,
    });
    return response.data.data!;
  }

  // WABA API
  async getWABAAccounts(): Promise<WABAAccount[]> {
    const response = await this.client.get<APIResponse<WABAAccount[]>>('/admin/waba');
    return response.data.data!;
  }

  async createWABAAccount(data: Partial<WABAAccount>): Promise<WABAAccount> {
    const response = await this.client.post<APIResponse<WABAAccount>>('/admin/waba', data);
    return response.data.data!;
  }

  async updateWABAAccount(id: string, data: Partial<WABAAccount>): Promise<WABAAccount> {
    const response = await this.client.put<APIResponse<WABAAccount>>(`/admin/waba/${id}`, data);
    return response.data.data!;
  }

  async deleteWABAAccount(id: string): Promise<void> {
    await this.client.delete(`/admin/waba/${id}`);
  }

  async syncWABAAccounts(): Promise<WABAAccount[]> {
    const response = await this.client.post<APIResponse<WABAAccount[]>>('/admin/waba/sync');
    return response.data.data!;
  }

  // Phone Numbers API
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    const response = await this.client.get<APIResponse<PhoneNumber[]>>('/admin/waba/phone-numbers');
    return response.data.data!;
  }

  async syncPhoneNumbers(wabaId: string): Promise<PhoneNumber[]> {
    const response = await this.client.post<APIResponse<PhoneNumber[]>>(`/admin/waba/${wabaId}/sync-phone-numbers`);
    return response.data.data!;
  }

  async updatePhoneNumber(id: string, data: Partial<PhoneNumber>): Promise<PhoneNumber> {
    const response = await this.client.put<APIResponse<PhoneNumber>>(`/admin/waba/phone-numbers/${id}`, data);
    return response.data.data!;
  }

  // Templates API
  async getTemplates(): Promise<Template[]> {
    const response = await this.client.get<APIResponse<Template[]>>('/admin/templates');
    return response.data.data!;
  }

  async createTemplate(data: Partial<Template>): Promise<Template> {
    const response = await this.client.post<APIResponse<Template>>('/admin/templates', data);
    return response.data.data!;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.client.delete(`/admin/templates/${id}`);
  }

  async syncTemplates(wabaId: string): Promise<Template[]> {
    const response = await this.client.post<APIResponse<Template[]>>(`/admin/templates/sync/${wabaId}`);
    return response.data.data!;
  }

  // Webhooks API
  async getWebhooks(): Promise<Webhook[]> {
    const response = await this.client.get<APIResponse<Webhook[]>>('/admin/webhooks');
    return response.data.data!;
  }

  async createWebhook(data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.client.post<APIResponse<Webhook>>('/admin/webhooks', data);
    return response.data.data!;
  }

  async updateWebhook(id: string, data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.client.put<APIResponse<Webhook>>(`/admin/webhooks/${id}`, data);
    return response.data.data!;
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.client.delete(`/admin/webhooks/${id}`);
  }

  // Contacts API
  async getContacts(filters?: any): Promise<PaginatedResponse<Contact>> {
    const params = new URLSearchParams(filters).toString();
    const response = await this.client.get<APIResponse<PaginatedResponse<Contact>>>(`/admin/contacts?${params}`);
    return response.data.data!;
  }

  async createContact(data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.post<APIResponse<Contact>>('/admin/contacts', data);
    return response.data.data!;
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.put<APIResponse<Contact>>(`/admin/contacts/${id}`, data);
    return response.data.data!;
  }

  async deleteContact(id: string): Promise<void> {
    await this.client.delete(`/admin/contacts/${id}`);
  }

  async importContacts(file: File, listName: string, options?: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('list_name', listName);
    if (options) {
      Object.keys(options).forEach((key) => formData.append(key, options[key]));
    }
    const response = await this.client.post<APIResponse>('/admin/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  async getImportJobStatus(jobId: string): Promise<any> {
    const response = await this.client.get<APIResponse>(`/admin/contacts/import/${jobId}/status`);
    return response.data.data;
  }

  async getImportJobs(filters?: { status?: string; job_type?: string }): Promise<any> {
    const params = new URLSearchParams(filters as any).toString();
    const response = await this.client.get<APIResponse>(`/admin/contacts/import/jobs?${params}`);
    return response.data.data;
  }

  // Contact Tags API
  async getContactTags(): Promise<ContactTag[]> {
    const response = await this.client.get<APIResponse<ContactTag[]>>('/admin/contacts/tags');
    return response.data.data!;
  }

  async createContactTag(data: Partial<ContactTag>): Promise<ContactTag> {
    const response = await this.client.post<APIResponse<ContactTag>>('/admin/contacts/tags', data);
    return response.data.data!;
  }

  async updateContactTag(id: string, data: Partial<ContactTag>): Promise<ContactTag> {
    const response = await this.client.put<APIResponse<ContactTag>>(`/admin/contacts/tags/${id}`, data);
    return response.data.data!;
  }

  async deleteContactTag(id: string): Promise<void> {
    await this.client.delete(`/admin/contacts/tags/${id}`);
  }

  // Contact Lists API
  async getContactLists(): Promise<ContactList[]> {
    const response = await this.client.get<APIResponse<ContactList[]>>('/admin/contacts/lists');
    return response.data.data!;
  }

  async deleteContactList(id: string): Promise<void> {
    await this.client.delete(`/admin/contacts/lists/${id}`);
  }

  // Campaigns API
  async getCampaigns(filters?: any): Promise<PaginatedResponse<Campaign>> {
    const params = new URLSearchParams(filters).toString();
    const paths = [`/admin/campaigns?${params}`, `/admin/campaigns?${params}`];

    for (const path of paths) {
      try {
        const response = await this.client.get<APIResponse<PaginatedResponse<Campaign>>>(path);
        return response.data.data as any;
      } catch (err: any) {
        // If 404, try next path; otherwise rethrow
        if (err?.response?.status === 404) {
          continue;
        }
        throw err;
      }
    }

    // If both endpoints failed with 404, throw a helpful error
    throw new Error('Campaigns route not found on server (tried /campaigns and /admin/campaigns)');
  }

  async getCampaign(id: string): Promise<Campaign> {
    const response = await this.client.get<APIResponse<Campaign>>(`/admin/campaigns/${id}`);
    return response.data.data!;
  }

  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    console.log("Creating campaign with data:", data);
    const response = await this.client.post<APIResponse<Campaign>>('/campaigns', data);
    return response.data.data!;
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.client.delete(`/campaigns/${id}`);
  }

  async startCampaign(id: string): Promise<void> {
    await this.client.post(`/admin/campaigns/${id}/start`);
  }

  async pauseCampaign(id: string): Promise<void> {
    await this.client.post(`/admin/campaigns/${id}/pause`);
  }

  async resumeCampaign(id: string): Promise<void> {
    await this.client.post(`/admin/campaigns/${id}/resume`);
  }

  async testCampaign(id: string, testPhoneNumber: string): Promise<void> {
    await this.client.post(`/admin/campaigns/${id}/test`, { test_phone_number: testPhoneNumber });
  }

  async getCampaignStats(id: string): Promise<any> {
    const response = await this.client.get<APIResponse>(`/campaigns/${id}/stats`);
    return response.data.data;
  }

  async getCampaignProgress(id: string): Promise<any> {
    const response = await this.client.get<APIResponse>(`/campaigns/${id}/progress`);
    return response.data.data;
  }

  async uploadCampaignMedia(file: File, phoneNumberId: string, type: string): Promise<{ media_id: string; type: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phone_number_id', phoneNumberId);
    formData.append('type', type);
    const response = await this.client.post<APIResponse<{ media_id: string; type: string }>>(
      '/campaigns/upload-media',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data.data!;
  }

  // Generic HTTP methods for flexibility
  async get<T = any>(url: string, config?: any): Promise<T> {
    return this.deduplicatedGet<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const api = new APIClient();
export default api;
