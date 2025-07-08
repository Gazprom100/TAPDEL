const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tapdel.onrender.com';

export interface DecimalInfo {
  workingAddress: string;
  chainId: number;
  rpcUrl: string;
  confirmationsRequired: number;
  workingBalance: number;
}

export interface DecimalBalance {
  userId: string;
  gameBalance: number;
  workingWalletBalance: number;
}

export interface DepositRequest {
  userId: string;
  baseAmount: number;
}

export interface DepositResponse {
  depositId: string;
  uniqueAmount: number;
  address: string;
  expires: string;
  amountRequested: number;
}

export interface DepositStatus {
  depositId: string;
  userId: string;
  amountRequested: number;
  uniqueAmount: number;
  matched: boolean;
  confirmations: number;
  txHash: string | null;
  status: 'waiting' | 'pending' | 'confirmed';
  createdAt: string;
  expiresAt: string;
}

export interface WithdrawalRequest {
  userId: string;
  toAddress: string;
  amount: number;
}

export interface WithdrawalResponse {
  withdrawalId: string;
  status: 'queued';
  amount: number;
  toAddress: string;
}

export interface WithdrawalStatus {
  withdrawalId: string;
  userId: string;
  toAddress: string;
  amount: number;
  status: 'queued' | 'sent' | 'failed';
  txHash: string | null;
  requestedAt: string;
  processedAt: string | null;
}

class DecimalApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/decimal`;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // === СИСТЕМНАЯ ИНФОРМАЦИЯ ===
  
  async getInfo(): Promise<DecimalInfo> {
    return this.request<DecimalInfo>('/info');
  }

  // === БАЛАНС ===
  
  async getUserBalance(userId: string): Promise<DecimalBalance> {
    return this.request<DecimalBalance>(`/users/${userId}/balance`);
  }

  // === ДЕПОЗИТЫ ===
  
  async createDeposit(request: DepositRequest): Promise<DepositResponse> {
    return this.request<DepositResponse>('/deposits', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDepositStatus(depositId: string): Promise<DepositStatus> {
    return this.request<DepositStatus>(`/deposits/${depositId}`);
  }

  async getUserDeposits(userId: string): Promise<DepositStatus[]> {
    return this.request<DepositStatus[]>(`/users/${userId}/deposits`);
  }

  // === ВЫВОДЫ ===
  
  async createWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    return this.request<WithdrawalResponse>('/withdrawals', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getWithdrawalStatus(withdrawalId: string): Promise<WithdrawalStatus> {
    return this.request<WithdrawalStatus>(`/withdrawals/${withdrawalId}`);
  }

  async getUserWithdrawals(userId: string): Promise<WithdrawalStatus[]> {
    return this.request<WithdrawalStatus[]>(`/users/${userId}/withdrawals`);
  }
}

export const decimalApi = new DecimalApi(); 