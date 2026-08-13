import axiosInstance from '@/lib/axios';

export interface AttendancePolicy {
  id: number;
  store_id: number;
  shift_start?: string;
  shift_end?: string;
  late_grace_period?: number;
  early_exit_grace_period?: number;
  weekend_days?: string[];
  mode?: string;
  fixed_days_off?: string[];
  fixed_start_time?: string | null;
  fixed_end_time?: string | null;
  late_fee_per_minute?: number;
  overtime_rate_per_hour?: number;
  grace_period_minutes?: number;
  notes?: string | null;
}

export interface EmployeeSchedule {
  id: number;
  employee_id: number;
  store_id: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_to?: string | null;
  duty_mode?: 'all_days' | 'weekly_pattern' | 'selected_dates' | string;
  weekly_days?: string[] | null;
  duty_dates?: string[] | null;
  notes?: string | null;
  is_active?: boolean;
  employee?: { id: number; name: string; employee_code?: string | null; store_id?: number };
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: 'present' | 'late' | 'absent' | 'leave' | 'half_day' | 'holiday_auto' | 'off_day_auto' | string;
  is_late: boolean;
  is_early_exit: boolean;
  overtime_minutes: number;
  undertime_minutes: number;
  employee?: {
    name: string;
  };
}


export interface HRMPerformanceEmployee {
  id: number;
  name: string;
  employee_code?: string | null;
}

export interface HRMPerformanceItem {
  employee: HRMPerformanceEmployee;
  target_amount: number;
  achieved_amount: number;
  remaining_amount: number;
  achievement_percentage: number;
  order_count: number;
  pos_sales_amount: number;
  pos_order_count: number;
  social_commerce_sales_amount: number;
  social_commerce_order_count: number;
}

export interface HRMPerformanceReport {
  items: HRMPerformanceItem[];
  branch_target: number;
  total_sales: number;
  pos_sales: number;
  social_commerce_sales: number;
  branch_order_count: number;
  pos_order_count: number;
  social_commerce_order_count: number;
  remaining_target: number;
  branch_achievement: number;
}

export interface HRMSalesRecord {
  id: number;
  order_number: string;
  order_date: string | null;
  order_type: 'counter' | 'social_commerce';
  channel_label: string;
  status: string;
  payment_status?: string | null;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  employee: HRMPerformanceEmployee | null;
  customer?: { id: number; name: string; phone?: string | null } | null;
  store?: { id: number; name: string } | null;
}

export interface HRMSalesRecordsPage {
  data: HRMSalesRecord[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface SalesTarget {
  id: number;
  employee_id: number;
  target_amount: number;
  target_month: string;
  achieved_amount: number;
  achievement_percentage: number;
  remaining_amount?: number;
  order_count?: number;
  employee?: {
    name: string;
    employee_code?: string;
  };
}

const hrmService = {
  // Attendance & Policy
  async getStorePolicy(storeId: number): Promise<AttendancePolicy | null> {
    const response = await axiosInstance.get(`/hrm/attendance/policy/${storeId}`);
    return response.data.success ? response.data.data : null;
  },

  async upsertStorePolicy(data: any): Promise<any> {
    const response = await axiosInstance.post('/hrm/attendance/policy', data);
    return response.data;
  },

  async getSchedules(params: { store_id: number; employee_id?: number; date?: string }): Promise<EmployeeSchedule[]> {
    const response = await axiosInstance.get('/hrm/attendance/schedules', { params });
    return response.data.success && Array.isArray(response.data.data) ? response.data.data : [];
  },

  async assignSchedule(data: {
    employee_id: number;
    store_id: number;
    start_time: string;
    end_time: string;
    effective_from?: string;
    effective_to?: string;
    duty_mode?: 'all_days' | 'weekly_pattern' | 'selected_dates';
    weekly_days?: string[];
    duty_dates?: string[];
    notes?: string;
  }): Promise<any> {
    const response = await axiosInstance.post('/hrm/attendance/schedules', data);
    return response.data;
  },

  async markAttendance(data: any): Promise<any> {
    let payload;

    if (Array.isArray(data)) {
      // Legacy: array of entries passed directly
      payload = {
        store_id: data[0].store_id,
        attendance_date: data[0].attendance_date,
        entries: data
      };
    } else if (data.entries && Array.isArray(data.entries)) {
      // New format: already structured { store_id, attendance_date, entries[] }
      payload = {
        store_id: data.store_id,
        attendance_date: data.attendance_date || data.date,
        entries: data.entries
      };
    } else {
      // Legacy single-entry format from old modal calls
      payload = {
        store_id: data.store_id,
        attendance_date: data.attendance_date || data.date,
        entries: [
          {
            employee_id: data.employee_id,
            status: data.status ? data.status.toLowerCase() : 'present',
            in_time: data.type === 'check_in' ? data.time : (data.in_time || undefined),
            out_time: data.type === 'check_out' ? data.time : (data.out_time || undefined),
          }
        ]
      };
    }

    // Normalize status casing in all entries
    if (payload.entries && Array.isArray(payload.entries)) {
      payload.entries = payload.entries.map((e: any) => ({
        ...e,
        status: e.status ? e.status.toLowerCase() : 'present'
      }));
    }

    const response = await axiosInstance.post('/hrm/attendance/mark', payload);
    return response.data;
  },

  async updateAttendance(id: number, data: any): Promise<any> {
    const response = await axiosInstance.put(`/hrm/attendance/${id}`, data);
    return response.data;
  },

  async getTodayAttendance(storeId?: number): Promise<AttendanceRecord[]> {
    const response = await axiosInstance.get('/hrm/attendance/report/today', { params: { store_id: storeId } });
    if (response.data.success && Array.isArray(response.data.data?.rows)) {
      // Normalize backend "rows" structure to AttendanceRecord[]
      return response.data.data.rows.map((row: any) => {
        const att = row.attendance || {};
        // Ensure status is always lowercase for internal logic
        const status = (att.status || 'not_marked').toLowerCase();

        return {
          ...att,
          employee_id: row.employee.id,
          status: status,
          // Map backend in_time/out_time to frontend clock_in/clock_out
          clock_in: att.in_time || null,
          clock_out: att.out_time || null,
        };
      });
    }
    return [];
  },

  async getAttendanceHistory(employeeId: number): Promise<AttendanceRecord[]> {
    const response = await axiosInstance.get(`/hrm/attendance/history/${employeeId}`);
    return (response.data.success && Array.isArray(response.data.data)) ? response.data.data : [];
  },

  async getAttendanceReport(params: { store_id: number; from: string; to: string; employee_ids?: number[] }): Promise<any> {
    const response = await axiosInstance.get('/hrm/attendance/report/range', { params });
    return response.data.success ? (response.data.data || {}) : {};
  },

  // Sales Targets
  async getSalesTargets(params?: any): Promise<SalesTarget[]> {
    const response = await axiosInstance.get('/hrm/sales-targets', { params });
    return (response.data.success && Array.isArray(response.data.data)) ? response.data.data : [];
  },

  async setSalesTarget(data: { store_id: number; employee_id: number; target_amount: number; target_month: string }): Promise<any> {
    const response = await axiosInstance.post('/hrm/sales-targets', data);
    return response.data;
  },

  async copyLastMonthTargets(data: { store_id: number; target_month: string }): Promise<any> {
    const response = await axiosInstance.post('/hrm/sales-targets/copy-last-month', data);
    return response.data;
  },

  async getPerformanceReport(params?: any): Promise<HRMPerformanceReport> {
    const response = await axiosInstance.get('/hrm/sales-targets/report', { params });
    return response.data.success ? (response.data.data || {
      items: [],
      branch_target: 0,
      total_sales: 0,
      pos_sales: 0,
      social_commerce_sales: 0,
      branch_order_count: 0,
      pos_order_count: 0,
      social_commerce_order_count: 0,
      remaining_target: 0,
      branch_achievement: 0,
    }) : {
      items: [],
      branch_target: 0,
      total_sales: 0,
      pos_sales: 0,
      social_commerce_sales: 0,
      branch_order_count: 0,
      pos_order_count: 0,
      social_commerce_order_count: 0,
      remaining_target: 0,
      branch_achievement: 0,
    };
  },

  async getSalesRecords(params: {
    store_id: number;
    month: string;
    employee_id?: number;
    channel?: 'counter' | 'social_commerce';
    page?: number;
    per_page?: number;
  }): Promise<HRMSalesRecordsPage> {
    const response = await axiosInstance.get('/hrm/sales-targets/sales-records', { params });
    const data = response.data.success ? response.data.data : null;
    return {
      data: Array.isArray(data?.data) ? data.data : [],
      current_page: Number(data?.current_page || 1),
      last_page: Number(data?.last_page || 1),
      per_page: Number(data?.per_page || params.per_page || 25),
      total: Number(data?.total || 0),
    };
  },

  // Employee Self-Service
  async getMyPerformance(params?: { month?: string }): Promise<any> {
    const response = await axiosInstance.get('/hrm/my/performance', { params });
    return response.data.success ? (response.data.data || {}) : {};
  },

  async getMyAttendance(params?: any): Promise<AttendanceRecord[]> {
    const response = await axiosInstance.get('/hrm/my/attendance', { params });
    if (!response.data.success || !Array.isArray(response.data.data)) return [];
    return response.data.data.map((row: any) => ({
      ...row,
      status: (row.status || 'not_marked').toLowerCase(),
      clock_in: row.clock_in || row.in_time || null,
      clock_out: row.clock_out || row.out_time || null,
    }));
  },

  async getMyOvertime(params?: { month?: string }): Promise<any[]> {
    const response = await axiosInstance.get('/hrm/my/overtime', { params });
    return (response.data.success && Array.isArray(response.data.data)) ? response.data.data : [];
  },

  async getMyRewardsFines(params?: any): Promise<any[]> {
    const response = await axiosInstance.get('/hrm/my/rewards-fines', { params });
    return (response.data.success && Array.isArray(response.data.data)) ? response.data.data : [];
  },

  // Rewards & Fines
  async createRewardFine(data: { store_id: number; employee_id: number; entry_date: string; entry_type: 'reward' | 'fine'; amount: number; title: string; notes?: string }): Promise<any> {
    const response = await axiosInstance.post('/hrm/attendance/rewards-fines', data);
    return response.data;
  },

  async updateRewardFine(id: number, data: any): Promise<any> {
    const response = await axiosInstance.put(`/hrm/attendance/rewards-fines/${id}`, data);
    return response.data;
  },

  async getRewardFineReport(params: any): Promise<any> {
    const response = await axiosInstance.get('/hrm/attendance/rewards-fines/report', { params });
    const data = response.data.success ? (response.data.data || { rows: [] }) : { rows: [] };
    if (!Array.isArray(data.rows)) data.rows = [];
    return data;
  },

  async getCumulatedRewardFine(params: any): Promise<any> {
    const response = await axiosInstance.get('/hrm/attendance/rewards-fines/cumulated', { params });
    const data = response.data.success ? (response.data.data || { rows: [] }) : { rows: [] };
    if (!Array.isArray(data.rows)) data.rows = [];
    return data;
  },
  // Payroll
  async getMonthlySalarySheet(params: { store_id: number; month: string }): Promise<any> {
    const response = await axiosInstance.get('/hrm/payroll/sheet', { params });
    const data = response.data.success ? (response.data.data || { sheet: [] }) : { sheet: [] };
    if (!Array.isArray(data.sheet)) data.sheet = [];
    return data;
  },

  async payMonthlySalary(data: { employee_id: number; store_id: number; month: string }): Promise<any> {
    const response = await axiosInstance.post('/hrm/payroll/pay', data);
    return response.data;
  },
};

export default hrmService;
