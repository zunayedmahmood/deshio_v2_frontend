import api from '../lib/axios';

export interface BackendTransaction {
  id: number;
  transaction_number: string;
  transaction_date: string;
  amount: number;
  type: 'debit' | 'credit';
  account_id: number;
  description?: string;
  store_id?: number;
  reference_type?: string;
  reference_id?: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  display_id?: string;
  reference_label?: string;
  metadata?: {
    category?: string;
    comment?: string;
    receiptImage?: string;
    original_name?: string;
    order_number?: string;
    order_type?: string;
    payment_method?: string;
    group_id?: string;
    attachments?: Array<{
      url: string;
      name: string;
      uploaded_at: string;
    }>;
    additional_references?: Array<{
      label: string;
      url: string;
      added_at: string;
      transaction_id: number;
    }>;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
  account?: {
    id: number;
    name: string;
    account_code: string;
    type: string;
    sub_type?: string;
  };
  store?: {
    id: number;
    name: string;
  };
}

export interface Transaction {
  id: number;
  name: string;
  description?: string;
  type: 'income' | 'expense' | 'adjustment';
  amount: number;
  category: string;
  transactionDate: string;
  source: string;
  createdAt: string;
  comment?: string;
  receiptImage?: string;
  referenceId?: string;
  referenceLabel?: string;
  store_id?: number;
  store_name?: string;
  createdBy?: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
}

export interface TransactionCreate {
  name: string;
  description?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  comment?: string;
  receiptImage?: string;
}

export interface CategoryCreate {
  name: string;
  type: 'income' | 'expense';
}

// The backend stores double-entry journal rows. The transaction screen must never
// treat each debit/credit row as a separate business activity; doing so double-counts
// every sale/refund/expense. We collapse each journal group into one cash movement.
const CASH_NAME_PATTERN = /(cash|bank|wallet|bkash|nagad|rocket)/i;

function isCashLike(transaction: BackendTransaction): boolean {
  const account = transaction.account;
  if (!account) return false;

  if (String(account.account_code) === '1001') return true;
  return account.type === 'asset' && CASH_NAME_PATTERN.test(account.name || '');
}

function getJournalGroupKey(transaction: BackendTransaction): string {
  const metadata = transaction.metadata || {};
  if (metadata.group_id) return `group:${metadata.group_id}`;

  if (transaction.reference_type && transaction.reference_id != null) {
    const event = metadata.event || (/refund/i.test(transaction.description || '') ? 'refund' : 'base');
    return [
      'ref',
      transaction.reference_type,
      transaction.reference_id,
      transaction.transaction_date,
      event,
    ].join(':');
  }

  return `row:${transaction.id}`;
}

function normalizeSource(entries: BackendTransaction[]): string {
  const first = entries[0];
  const metadata = first?.metadata || {};
  const combined = entries
    .map(entry => `${entry.reference_type || ''} ${entry.description || ''} ${entry.metadata?.event || ''}`)
    .join(' ')
    .toLowerCase();

  // Refund/return must be checked before OrderPayment because payment refunds still
  // carry an OrderPayment reference type.
  if (/refund|return/.test(combined)) return 'return';
  if (/exchange/.test(combined)) return 'exchange';
  if (/expense/.test(combined)) return 'expense';
  if (/vendor|purchaseorder|inventory purchase/.test(combined)) return 'batch';

  if (/serviceorderpayment|service order payment/.test(combined)) return 'order';
  if (/orderpayment|app\\models\\order|\border\b/.test(combined)) {
    return metadata.order_type === 'counter' ? 'sale' : 'order';
  }
  if (/sale/.test(combined)) return 'sale';
  return first?.reference_type && first.reference_type !== 'manual'
    ? first.reference_type
    : 'manual';
}

function buildActivityName(entries: BackendTransaction[], source: string): string {
  const first = entries[0];
  const metadata = first?.metadata || {};

  if (metadata.original_name) return metadata.original_name;
  if (source === 'return') {
    const order = metadata.order_number ? ` - ${metadata.order_number}` : '';
    return `Refund / Return${order}`;
  }
  if (source === 'exchange') return `Exchange Adjustment${metadata.new_order_number ? ` - ${metadata.new_order_number}` : ''}`;
  if (source === 'expense') return metadata.expense_description || `Expense Payment${metadata.expense_number ? ` - ${metadata.expense_number}` : ''}`;
  if (source === 'batch') return `Vendor / Inventory Payment${metadata.vendor_name ? ` - ${metadata.vendor_name}` : ''}`;
  if (metadata.order_number) return `Order Payment - ${metadata.order_number}`;
  if (metadata.service_order_number) return `Service Payment - ${metadata.service_order_number}`;

  return first?.description || 'Accounting Adjustment';
}

function mapJournalGroupToUI(entries: BackendTransaction[]): Transaction {
  if (!entries.length) {
    throw new Error('Cannot map an empty journal group');
  }

  const first = entries[0];
  const firstMetadata = first.metadata || {};
  const manualOperatingAccountId = Number(firstMetadata.manual_operating_account_id || 0);
  const manualOperatingRow = first.reference_type === 'manual'
    ? (manualOperatingAccountId > 0
      ? entries.find(row => Number(row.account_id) === manualOperatingAccountId)
      // Legacy manual rows did not store the operating-account id, but the form
      // always posted one asset side against one non-asset counter side.
      : entries.find(row => row.account?.type === 'asset'))
    : undefined;

  const cashRows = entries.filter(isCashLike);
  const cashNet = cashRows.reduce((sum, row) => {
    const amount = Number(row.amount) || 0;
    return sum + (row.type === 'debit' ? amount : -amount);
  }, 0);

  // Manual entries explicitly identify the operating money side. Older entries
  // fall back to cash/bank account detection so existing data keeps working.
  const manualMovement = first.reference_type === 'manual' && manualOperatingRow
    ? (manualOperatingRow.type === 'debit' ? Number(manualOperatingRow.amount) || 0 : -(Number(manualOperatingRow.amount) || 0))
    : null;
  const movementNet = manualMovement ?? cashNet;

  const epsilon = 0.005;
  const actualType: Transaction['type'] = movementNet > epsilon
    ? 'income'       // money in
    : movementNet < -epsilon
      ? 'expense'    // money out
      : 'adjustment'; // non-cash accounting movement

  const totalDebits = entries
    .filter(row => row.type === 'debit')
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const totalCredits = entries
    .filter(row => row.type === 'credit')
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const representative = manualOperatingRow || cashRows[0] || first;
  const metadata = representative.metadata || first.metadata || {};
  const source = normalizeSource(entries);
  const category = actualType === 'adjustment'
    ? 'Accounting Adjustment'
    : metadata.expense_category || metadata.category || (actualType === 'income' ? 'Cash Inflow' : 'Cash Outflow');

  return {
    id: representative.id,
    name: buildActivityName(entries, source),
    description: representative.description || first.description || undefined,
    type: actualType,
    amount: actualType === 'adjustment'
      ? Math.max(totalDebits, totalCredits)
      : Math.abs(movementNet),
    category,
    source: source || 'manual',
    transactionDate: representative.transaction_date || first.transaction_date || representative.created_at || representative.createdAt || new Date().toISOString(),
    createdAt: representative.created_at || representative.createdAt || representative.transaction_date || new Date().toISOString(),
    comment: metadata.comment || metadata.note || undefined,
    receiptImage: metadata.receiptImage || metadata.attachments?.[0]?.url || undefined,
    referenceId: representative.display_id || (representative.reference_id != null
      ? `${representative.reference_type}-${representative.reference_id}`
      : representative.transaction_number),
    referenceLabel: representative.reference_label || source,
    store_id: representative.store_id,
    store_name: representative.store?.name,
    createdBy: (representative as any).created_by?.name || 'System',
  };
}

function mapTransactionToUI(transaction: BackendTransaction): Transaction {
  return mapJournalGroupToUI([transaction]);
}

const transactionService = {
  // Get all journal rows and collapse each balanced group into one business activity.
  async getTransactions(params?: {
    account_id?: number;
    type?: string;
    status?: string;
    store_id?: number | string;
    date_from?: string;
    date_to?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    per_page?: number;
    page?: number;
  }) {
    const requestParams = {
      ...params,
      // The activity screen is a posted-ledger view. Pending/failed rows remain
      // available through the backend API but must not pollute cash totals.
      status: params?.status || 'completed',
    };
    const firstResponse = await api.get('/transactions', {
      params: { ...requestParams, per_page: Math.max(Number(params?.per_page || 1000), 1000), page: 1 },
    });
    const responseData = firstResponse.data.data;
    const rows: BackendTransaction[] = Array.isArray(responseData)
      ? [...responseData]
      : [...(responseData?.data || [])];

    // A journal group can straddle a pagination boundary. Pull the remaining pages
    // before grouping so the activity screen never shows half of a double-entry event.
    const lastPage = Number(responseData?.last_page || 1) || 1;
    // Never silently truncate the ledger activity list; every page is required before
    // grouping or a debit/credit pair can be split out of the UI.
    for (let page = 2; page <= lastPage; page++) {
      const nextResponse = await api.get('/transactions', {
        params: { ...requestParams, per_page: Math.max(Number(params?.per_page || 1000), 1000), page },
      });
      const nextData = nextResponse.data.data;
      rows.push(...(Array.isArray(nextData) ? nextData : (nextData?.data || [])));
    }

    const groups = new Map<string, BackendTransaction[]>();
    rows.forEach((row) => {
      const key = getJournalGroupKey(row);
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    });

    const activities = Array.from(groups.values())
      .map(mapJournalGroupToUI)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    return {
      transactions: activities,
      pagination: responseData?.meta || null,
    };
  },

  // Get one journal activity. The header is derived from the complete journal
  // group, while related_transactions remains raw for the debit/credit detail table.
  async getTransaction(id: number) {
    const response = await api.get(`/transactions/${id}`);
    const data = response.data.data;
    const primary: BackendTransaction = data.transaction || data;
    const related: BackendTransaction[] = data.related_transactions || [];
    const groupRows = related.length ? related : [primary];

    return {
      transaction: mapJournalGroupToUI(groupRows),
      related_transactions: related,
      group_id: data.group_id,
      attachments: data.attachments || [],
      additional_references: data.additional_references || [],
    };
  },

  // Alias for detail page consistency
  async getTransactionById(id: number) {
    try {
      const res = await this.getTransaction(id);
      return {
        success: true,
        data: res.transaction,
        related_transactions: res.related_transactions || [],
        attachments: res.attachments || []
      };
    } catch (error) {
      return { success: false, data: null };
    }
  },

  // Add attachment to transaction
  async addAttachment(id: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/transactions/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Add external reference to transaction
  async addReference(id: number, label: string, url: string) {
    const response = await api.post(`/transactions/${id}/references`, {
      reference_label: label,
      reference_url: url,
    });
    return response.data;
  },

  // Create transaction (manual entry)
  async createTransaction(data: any) {
    // Map the frontend data structure to backend structure
    const transactionData = {
      transaction_date: data.transaction_date || data.date,
      amount: data.amount,
      type: data.type === 'income' || data.type === 'debit' ? 'debit' : 'credit',
      account_id: data.account_id || 1, // Default cash account
      counter_account_id: data.counter_account_id, // Required for double-entry
      description: data.description || `${data.name}${data.description_extra ? ' - ' + data.description_extra : ''}`,
      store_id: data.store_id,
      reference_type: data.reference_type || 'manual',
      note: data.note,
      reference_note: data.reference_note,
      receipt_image: data.receipt_image || data.receiptImage,
      metadata: {
        category: data.category,
        comment: data.comment || data.note,
        receiptImage: data.receiptImage || data.receipt_image,
        original_name: data.name || data.description,
        reference_note: data.reference_note
      },
      status: data.status || 'completed',
    };

    const response = await api.post('/transactions', transactionData);
    return {
      transaction: mapTransactionToUI(response.data.data),
    };
  },

  // Update transaction
  async updateTransaction(id: number, data: Partial<TransactionCreate>) {
    const transactionData: any = {};

    if (data.date) transactionData.transaction_date = data.date;
    if (data.amount) transactionData.amount = data.amount;
    if (data.type) transactionData.type = data.type === 'income' ? 'debit' : 'credit';

    // Build metadata
    const metadata: any = {};
    if (data.category) metadata.category = data.category;
    if (data.comment) metadata.comment = data.comment;
    if (data.receiptImage) metadata.receiptImage = data.receiptImage;
    if (data.name) metadata.original_name = data.name;

    if (Object.keys(metadata).length > 0) {
      transactionData.metadata = metadata;
    }

    if (data.name || data.description) {
      transactionData.description = `${data.name || ''}${data.description ? ' - ' + data.description : ''}`;
    }

    const response = await api.put(`/transactions/${id}`, transactionData);
    return {
      transaction: mapTransactionToUI(response.data.data),
    };
  },

  // Delete transaction
  async deleteTransaction(id: number) {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  // Complete transaction
  async completeTransaction(id: number) {
    const response = await api.post(`/transactions/${id}/complete`);
    return {
      transaction: mapTransactionToUI(response.data.data),
    };
  },

  // Get transaction statistics
  async getStatistics(params?: {
    date_from?: string;
    date_to?: string;
    store_id?: number | string;
  }) {
    const response = await api.get('/transactions/statistics', { params });
    return response.data;
  },

  // Get categories (for the dropdown)
  async getCategories() {
    // Return default categories
    // You can modify this once you have a categories endpoint
    return [
      // Expense categories
      { id: 1, name: 'Inventory Purchase', type: 'expense' },
      { id: 2, name: 'Rent', type: 'expense' },
      { id: 3, name: 'Utilities', type: 'expense' },
      { id: 4, name: 'Salaries', type: 'expense' },
      { id: 5, name: 'Marketing', type: 'expense' },
      { id: 6, name: 'Transportation', type: 'expense' },
      { id: 7, name: 'Office Supplies', type: 'expense' },
      { id: 8, name: 'Maintenance', type: 'expense' },
      { id: 9, name: 'Other Expenses', type: 'expense' },

      // Income categories
      { id: 10, name: 'Product Sales', type: 'income' },
      { id: 11, name: 'Service Revenue', type: 'income' },
      { id: 12, name: 'Other Income', type: 'income' },
    ] as Category[];
  },

  // Create category
  async createCategory(data: CategoryCreate) {
    // Mock implementation - returns the category with a generated ID
    return {
      id: Date.now(),
      ...data,
    } as Category;
  },
};

export default transactionService;