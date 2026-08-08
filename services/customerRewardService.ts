import axios from '@/lib/axios';

export interface LoyaltyEarningRule {
  id: number;
  earn_percentage?: string | number;
  points_per_1000: string | number;
  taka_per_point: string | number;
  active_from: string;
  active_until?: string | null;
  notes?: string | null;
  created_by?: number | null;
}

export interface LoyaltySettingsResponse {
  current_rate: LoyaltyEarningRule;
  rate_history: LoyaltyEarningRule[];
}

const unwrap = (res: any) => res?.data?.data ?? res?.data;

const customerRewardService = {
  async getSettings(): Promise<LoyaltySettingsResponse> {
    const res = await axios.get('/loyalty/settings');
    return unwrap(res);
  },

  async updateEarningRate(points_per_1000: number, taka_per_point: number, notes?: string): Promise<LoyaltyEarningRule> {
    const res = await axios.patch('/loyalty/settings/earning-rate', { points_per_1000, taka_per_point, notes });
    return unwrap(res);
  },

  async getCustomerSummary(customerId: number): Promise<any> {
    const res = await axios.get(`/loyalty/customers/${customerId}`);
    return unwrap(res);
  },

  async adjustCustomerPoints(customerId: number, points_delta: number, reason: string): Promise<any> {
    const res = await axios.post(`/loyalty/customers/${customerId}/adjust`, { points_delta, reason });
    return unwrap(res);
  },

  async getPhoneSummary(phone: string): Promise<any> {
    const res = await axios.post('/loyalty/phone-summary', { phone });
    return unwrap(res);
  },

  async getMyLoyaltySummary(): Promise<any> {
    const res = await axios.get('/customer/loyalty');
    return unwrap(res);
  },
};

export default customerRewardService;
