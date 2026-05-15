// User types
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'superadmin' | 'admin' | 'company';
  company_id?: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  business_id?: string;
  // API may return credit balance as string or number
  credit_balance: string | number;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

// Auth types
export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  company?: Company;
  token: string;
  expiresIn: string;
}

// Credit types
export interface CreditTransaction {
  id: string;
  company_id: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface CreditBalance {
  company_id: string;
  company_name?: string;
  balance: number;
  last_transaction?: CreditTransaction;
}

// WABA types
export interface WABAAccount {
  id: string;
  company_id: string;
  waba_id: string;
  name: string;
  timezone: string;
  currency: string;
  message_template_namespace?: string;
  status: 'active' | 'inactive';
  meta_config?: any;
  created_at: string;
  updated_at: string;

  // CamelCase aliases for frontend (API client may convert snake_case -> camelCase)
  companyId?: string;
  wabaId?: string;
  messageTemplateNamespace?: string;
  createdAt?: string;
  updatedAt?: string;
  phoneNumberId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  // snake_case fields from API
  phone_number_id?: string;
  access_token?: string;
  webhook_verify_token?: string;
}

// Phone Number types
export interface PhoneNumber {
  id: string;
  company_id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
  status: 'active' | 'inactive';
  webhooks_configured: boolean;
  created_at: string;
  updated_at: string;
}

// Template types
export interface Template {
  id: string;
  company_id: string;
  waba_id: string;
  meta_template_id?: string;
  name: string;
  category: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components?: any[];
  created_at: string;
  updated_at: string;
}

// Webhook types
export interface Webhook {
  id: string;
  company_id: string;
  url: string;
  secret?: string;
  events: string[];
  status: string; // 'active' | 'inactive'
  headers?: Record<string, string>;
  max_retries?: number;
  timeout_ms?: number;
  created_at: string;
  updated_at: string;
}

// Contact types
export interface Contact {
  id: string;
  company_id: string;
  phone_number: string;
  name?: string;
  email?: string;
  attributes?: any;
  is_valid: boolean;
  invalid_reason?: string;
  message_count: number;
  failed_count: number;
  tags?: ContactTag[];
  created_at: string;
  updated_at: string;
}

export interface ContactTag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  description?: string;
  contact_count: number;
  created_at: string;
}

export interface ContactList {
  id: string;
  company_id: string;
  name: string;
  file_name?: string;
  total_contacts: number;
  valid_contacts: number;
  invalid_contacts: number;
  created_at: string;
}

// Campaign types
export interface Campaign {
  id: string;
  company_id: string;
  phone_number_id: string;
  template_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  total_cost: number;
  template_params?: any[];
  parameter_mapping?: any;
  media_uploads?: any[];
  contact_filters?: any;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  campaign_stop?: string | null;
}

export interface Template {
  id: string;
  name: string;
  category?: string;
  [key: string]: any;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    code?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
