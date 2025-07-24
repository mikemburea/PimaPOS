// types.ts - Updated to match new Supabase structure

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  materialTypes: string[];
  totalTransactions: number;
  totalValue: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  contactPerson?: string;
  website?: string;
  notes?: string;
  supplierTier?: string;
  creditLimit?: number;
  preferredPaymentMethod?: string;
  totalWeight?: number;
  firstTransactionDate?: string;
  lastTransactionDate?: string;
  averageTransactionValue?: number;
  registrationReason?: string;
  registeredDate?: string;
  registeredBy?: string;
}

export interface Transaction {
  id: string;
  supplierId?: string;
  materialType: string;
  transactionDate: string;
  totalAmount: number;
  createdAt: string;
  transactionNumber?: string;
  isWalkin: boolean;
  walkinName?: string;
  walkinPhone?: string;
  materialCategory?: string;
  weightKg?: number;
  unitPrice?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentReference?: string;
  qualityGrade?: string;
  deductions?: number;
  finalAmount?: number;
  receiptNumber?: string;
  notes?: string;
  createdBy?: string;
  updatedAt?: string;
  // Legacy fields for backward compatibility
  supplierName?: string;
  quantity?: number;
  totalValue?: number;
  status?: string;
  date?: string;
  timestamp?: string;
  type?: string;
  transactionType?: string;
  amount?: number;
  totalWeight?: number;
  weight?: number;
  description?: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  unit: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  totalWeight: number;
  activeSuppliers: number;
  todayTransactions?: number;
  todayRevenue?: number;
  weekGrowth?: number;
  monthGrowth?: number;
  weightGrowth?: number;
  supplierGrowth?: number;
}

// Database row types (what comes from Supabase)
export interface SupplierRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  material_types: string[] | null;
  total_transactions: number | null;
  total_value: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  contact_person?: string | null;
  website?: string | null;
  notes?: string | null;
  supplier_tier?: string | null;
  credit_limit?: number | null;
  preferred_payment_method?: string | null;
  total_weight?: number | null;
  first_transaction_date?: string | null;
  last_transaction_date?: string | null;
  average_transaction_value?: number | null;
  registration_reason?: string | null;
  registered_date?: string | null;
  registered_by?: string | null;
}

export interface TransactionRow {
  id: string;
  supplier_id?: string | null;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  created_at: string;
  transaction_number?: string | null;
  is_walkin: boolean;
  walkin_name?: string | null;
  walkin_phone?: string | null;
  material_category?: string | null;
  weight_kg?: number | null;
  unit_price?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  quality_grade?: string | null;
  deductions?: number | null;
  final_amount?: number | null;
  receipt_number?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
}

export interface MaterialRow {
  id: string;
  name: string;
  category: string;
  current_price: number;
  unit: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Transform functions to convert DB rows to app types
export function transformSupplierFromDB(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    materialTypes: Array.isArray(row.material_types) ? row.material_types : [],
    totalTransactions: row.total_transactions || 0,
    totalValue: row.total_value || 0,
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contactPerson: row.contact_person || undefined,
    website: row.website || undefined,
    notes: row.notes || undefined,
    supplierTier: row.supplier_tier || undefined,
    creditLimit: row.credit_limit || undefined,
    preferredPaymentMethod: row.preferred_payment_method || undefined,
    totalWeight: row.total_weight || undefined,
    firstTransactionDate: row.first_transaction_date || undefined,
    lastTransactionDate: row.last_transaction_date || undefined,
    averageTransactionValue: row.average_transaction_value || undefined,
    registrationReason: row.registration_reason || undefined,
    registeredDate: row.registered_date || undefined,
    registeredBy: row.registered_by || undefined
  };
}

export function transformTransactionFromDB(row: TransactionRow): Transaction {
  return {
    id: row.id,
    supplierId: row.supplier_id || undefined,
    materialType: row.material_type,
    transactionDate: row.transaction_date,
    totalAmount: row.total_amount || 0,
    createdAt: row.created_at,
    transactionNumber: row.transaction_number || undefined,
    isWalkin: row.is_walkin,
    walkinName: row.walkin_name || undefined,
    walkinPhone: row.walkin_phone || undefined,
    materialCategory: row.material_category || undefined,
    weightKg: row.weight_kg || undefined,
    unitPrice: row.unit_price || undefined,
    paymentMethod: row.payment_method || undefined,
    paymentStatus: row.payment_status || undefined,
    paymentReference: row.payment_reference || undefined,
    qualityGrade: row.quality_grade || undefined,
    deductions: row.deductions || undefined,
    finalAmount: row.final_amount || undefined,
    receiptNumber: row.receipt_number || undefined,
    notes: row.notes || undefined,
    createdBy: row.created_by || undefined,
    updatedAt: row.updated_at || undefined,
    // Legacy fields for backward compatibility
    supplierName: row.walkin_name || 'Unknown',
    quantity: row.weight_kg || 0,
    totalValue: row.total_amount || 0,
    status: row.payment_status === 'completed' ? 'completed' : 'pending',
    date: row.transaction_date,
    timestamp: row.created_at,
    type: 'purchase',
    transactionType: 'purchase',
    amount: row.total_amount || 0,
    totalWeight: row.weight_kg || 0,
    weight: row.weight_kg || 0,
    description: row.notes || undefined
  };
}

export function transformMaterialFromDB(row: MaterialRow): Material {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    currentPrice: row.current_price || 0,
    unit: row.unit,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Helper function to transform app Supplier back to DB format for updates/inserts
export function transformSupplierToDB(supplier: Partial<Supplier>): Partial<SupplierRow> {
  const dbSupplier: Partial<SupplierRow> = {};
  
  if (supplier.id) dbSupplier.id = supplier.id;
  if (supplier.name) dbSupplier.name = supplier.name;
  if (supplier.email) dbSupplier.email = supplier.email;
  if (supplier.phone) dbSupplier.phone = supplier.phone;
  if (supplier.address) dbSupplier.address = supplier.address;
  if (supplier.status) dbSupplier.status = supplier.status;
  if (supplier.totalTransactions !== undefined) dbSupplier.total_transactions = supplier.totalTransactions;
  if (supplier.totalValue !== undefined) dbSupplier.total_value = supplier.totalValue;
  if (supplier.materialTypes) dbSupplier.material_types = supplier.materialTypes;
  if (supplier.contactPerson) dbSupplier.contact_person = supplier.contactPerson;
  if (supplier.website) dbSupplier.website = supplier.website;
  if (supplier.notes) dbSupplier.notes = supplier.notes;
  if (supplier.supplierTier) dbSupplier.supplier_tier = supplier.supplierTier;
  if (supplier.creditLimit !== undefined) dbSupplier.credit_limit = supplier.creditLimit;
  if (supplier.preferredPaymentMethod) dbSupplier.preferred_payment_method = supplier.preferredPaymentMethod;
  if (supplier.totalWeight !== undefined) dbSupplier.total_weight = supplier.totalWeight;
  if (supplier.firstTransactionDate) dbSupplier.first_transaction_date = supplier.firstTransactionDate;
  if (supplier.lastTransactionDate) dbSupplier.last_transaction_date = supplier.lastTransactionDate;
  if (supplier.averageTransactionValue !== undefined) dbSupplier.average_transaction_value = supplier.averageTransactionValue;
  if (supplier.registrationReason) dbSupplier.registration_reason = supplier.registrationReason;
  if (supplier.registeredDate) dbSupplier.registered_date = supplier.registeredDate;
  if (supplier.registeredBy) dbSupplier.registered_by = supplier.registeredBy;
  if (supplier.createdAt) dbSupplier.created_at = supplier.createdAt;
  if (supplier.updatedAt) dbSupplier.updated_at = supplier.updatedAt;
  
  return dbSupplier;
}

export function transformTransactionToDB(transaction: Partial<Transaction>): Partial<TransactionRow> {
  const dbTransaction: Partial<TransactionRow> = {};
  
  if (transaction.id) dbTransaction.id = transaction.id;
  if (transaction.supplierId) dbTransaction.supplier_id = transaction.supplierId;
  if (transaction.materialType) dbTransaction.material_type = transaction.materialType;
  if (transaction.transactionDate) dbTransaction.transaction_date = transaction.transactionDate;
  if (transaction.totalAmount !== undefined) dbTransaction.total_amount = transaction.totalAmount;
  if (transaction.createdAt) dbTransaction.created_at = transaction.createdAt;
  if (transaction.transactionNumber) dbTransaction.transaction_number = transaction.transactionNumber;
  if (transaction.isWalkin !== undefined) dbTransaction.is_walkin = transaction.isWalkin;
  if (transaction.walkinName) dbTransaction.walkin_name = transaction.walkinName;
  if (transaction.walkinPhone) dbTransaction.walkin_phone = transaction.walkinPhone;
  if (transaction.materialCategory) dbTransaction.material_category = transaction.materialCategory;
  if (transaction.weightKg !== undefined) dbTransaction.weight_kg = transaction.weightKg;
  if (transaction.unitPrice !== undefined) dbTransaction.unit_price = transaction.unitPrice;
  if (transaction.paymentMethod) dbTransaction.payment_method = transaction.paymentMethod;
  if (transaction.paymentStatus) dbTransaction.payment_status = transaction.paymentStatus;
  if (transaction.paymentReference) dbTransaction.payment_reference = transaction.paymentReference;
  if (transaction.qualityGrade) dbTransaction.quality_grade = transaction.qualityGrade;
  if (transaction.deductions !== undefined) dbTransaction.deductions = transaction.deductions;
  if (transaction.finalAmount !== undefined) dbTransaction.final_amount = transaction.finalAmount;
  if (transaction.receiptNumber) dbTransaction.receipt_number = transaction.receiptNumber;
  if (transaction.notes) dbTransaction.notes = transaction.notes;
  if (transaction.createdBy) dbTransaction.created_by = transaction.createdBy;
  if (transaction.updatedAt) dbTransaction.updated_at = transaction.updatedAt;
  
  return dbTransaction;
}