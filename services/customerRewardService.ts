import axios from '@/lib/axios';

export interface LoyaltyEarningRule {
  id: number;
  earn_percentage: string | number;
  active_from: string;
  active_until?: string | null;
  notes?: string | null;
  created_by?: number | null;
}

export interface CustomerReward {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  type: 'fixed_discount' | 'percent_discount' | 'store_credit' | 'free_delivery';
  points_required: number;
  value: string | number;
  minimum_order_amount?: string | number;
  maximum_discount_amount?: string | number | null;
  valid_days?: number;
  is_active?: boolean;
  is_stackable?: boolean;
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

  async updateEarningRate(earn_percentage: number, notes?: string): Promise<LoyaltyEarningRule> {
    const res = await axios.patch('/loyalty/settings/earning-rate', { earn_percentage, notes });
    return unwrap(res);
  },

  async getRewards(): Promise<CustomerReward[]> {
    const res = await axios.get('/loyalty/rewards', { params: { per_page: 200 } });
    const data = unwrap(res);
    return data?.data || data || [];
  },

  async createReward(payload: Partial<CustomerReward>): Promise<CustomerReward> {
    const res = await axios.post('/loyalty/rewards', payload);
    return unwrap(res);
  },

  async updateReward(id: number, payload: Partial<CustomerReward>): Promise<CustomerReward> {
    const res = await axios.patch(`/loyalty/rewards/${id}`, payload);
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

  async redeemForCustomer(customerId: number, reward_id: number): Promise<any> {
    const res = await axios.post(`/loyalty/customers/${customerId}/redeem`, { reward_id });
    return unwrap(res);
  },

  async quoteRedemption(payload: { redemption_code: string; customer_id?: number; subtotal: number; shipping_amount?: number; discount_amount?: number }): Promise<any> {
    const res = await axios.post('/loyalty/quote-redemption', payload);
    return unwrap(res);
  },
};

export default customerRewardService;
