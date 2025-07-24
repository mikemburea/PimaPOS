// src/components/suppliers/Suppliers.tsx - Clean version with no mock data
import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Eye, Edit2, MapPin, Phone, Mail, Filter, Loader2, X, Globe, Calendar, Award, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Define interfaces to match database structure
interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  material_types: string[];
  total_transactions: number;
  total_value: number;
  status: string;
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

interface SuppliersProps {
  onSupplierUpdate?: (supplier: Supplier) => Promise<void>;
}

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  material_types: string[];
  status: 'active' | 'inactive';
  contact_person: string;
  website: string;
  notes: string;
  supplier_tier: string;
  credit_limit: number;
  preferred_payment_method: string;
  registration_reason: string;
}

// Real useSuppliers hook - NO MOCK DATA AT ALL
const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Set the actual data from database (could be empty array)
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
      // Set empty array on error
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const searchSuppliers = async (query: string) => {
    if (!query.trim()) {
      await fetchSuppliers();
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: searchError } = await supabase
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,contact_person.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (searchError) {
        throw searchError;
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error searching suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to search suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterByTier = async (tier: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('suppliers')
        .select('*');

      if (tier !== 'all') {
        query = query.eq('supplier_tier', tier);
      }

      const { data, error: filterError } = await query
        .order('created_at', { ascending: false });

      if (filterError) {
        throw filterError;
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error filtering suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (supplierData: SupplierFormData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          email: supplierData.email,
          phone: supplierData.phone,
          address: supplierData.address,
          material_types: supplierData.material_types,
          status: supplierData.status,
          contact_person: supplierData.contact_person || null,
          website: supplierData.website || null,
          notes: supplierData.notes || null,
          supplier_tier: supplierData.supplier_tier || 'occasional',
          credit_limit: supplierData.credit_limit || 0,
          preferred_payment_method: supplierData.preferred_payment_method || 'cash',
          registration_reason: supplierData.registration_reason || null,
          total_transactions: 0,
          total_value: 0,
          registered_date: new Date().toISOString(),
          registered_by: 'admin'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Add the new supplier to the local state
      setSuppliers(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding supplier:', err);
      throw err;
    }
  };

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    searchSuppliers,
    filterByTier,
    addSupplier
  };
};

// Empty State Component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="bg-gray-100 rounded-full p-6 mb-4">
      <AlertCircle className="h-16 w-16 text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Suppliers Yet</h3>
    <p className="text-gray-600 text-center max-w-md mb-6">
      You haven't registered any suppliers yet. Start by adding your first supplier to begin tracking your business relationships.
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
      <h4 className="font-semibold text-blue-900 mb-2">Getting Started</h4>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• Click the "Add Supplier" button above</li>
        <li>• Fill in the supplier details</li>
        <li>• Start tracking transactions and relationships</li>
      </ul>
    </div>
  </div>
);

// Modal Component for Adding Suppliers
const AddSupplierModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (supplierData: SupplierFormData) => Promise<void>;
  isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    material_types: [],
    status: 'active',
    contact_person: '',
    website: '',
    notes: '',
    supplier_tier: 'occasional',
    credit_limit: 0,
    preferred_payment_method: 'cash',
    registration_reason: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMaterialTypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const materialTypesString = e.target.value;
    const materialTypesArray = materialTypesString.split(',').map(type => type.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      material_types: materialTypesArray
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (formData.material_types.length === 0) newErrors.material_types = 'At least one material type is required';
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await onSubmit(formData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      material_types: [],
      status: 'active',
      contact_person: '',
      website: '',
      notes: '',
      supplier_tier: 'occasional',
      credit_limit: 0,
      preferred_payment_method: 'cash',
      registration_reason: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Add New Supplier</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter company name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter website URL"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full address"
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="supplier_tier" className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Tier
                </label>
                <select
                  id="supplier_tier"
                  name="supplier_tier"
                  value={formData.supplier_tier}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="occasional">Occasional</option>
                  <option value="regular">Regular</option>
                  <option value="strategic">Strategic Partner</option>
                </select>
              </div>

              <div>
                <label htmlFor="preferred_payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Payment Method
                </label>
                <select
                  id="preferred_payment_method"
                  name="preferred_payment_method"
                  value={formData.preferred_payment_method}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Limit (KES)
                </label>
                <input
                  type="number"
                  id="credit_limit"
                  name="credit_limit"
                  value={formData.credit_limit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter credit limit"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="registration_reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Reason
                </label>
                <input
                  type="text"
                  id="registration_reason"
                  name="registration_reason"
                  value={formData.registration_reason}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Why is this supplier being registered?"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="material_types" className="block text-sm font-medium text-gray-700 mb-1">
                Material Types *
              </label>
              <input
                type="text"
                id="material_types"
                name="material_types"
                value={formData.material_types.join(', ')}
                onChange={handleMaterialTypesChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.material_types ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter material types separated by commas (e.g., Steel, Aluminum, Copper)"
              />
              {errors.material_types && <p className="text-red-500 text-sm mt-1">{errors.material_types}</p>}
            </div>

            <div className="mt-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any additional notes or comments"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Supplier
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Suppliers Component
const Suppliers: React.FC<SuppliersProps> = ({ onSupplierUpdate }) => {
  const {
    suppliers,
    loading,
    error,
    searchSuppliers,
    filterByTier,
    fetchSuppliers,
    addSupplier
  } = useSuppliers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTierValue, setFilterTierValue] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      await searchSuppliers(term);
    } else {
      await fetchSuppliers();
    }
  };

  const handleTierFilter = async (tier: string) => {
    setFilterTierValue(tier);
    await filterByTier(tier);
  };

  const handleAddSupplier = async (supplierData: SupplierFormData) => {
    setIsSubmitting(true);
    try {
      await addSupplier(supplierData);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding supplier:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTierInfo = (supplier: Supplier) => {
    const tier = supplier.supplier_tier || 'occasional';
    
    switch (tier) {
      case 'strategic':
        return { label: 'Strategic Partner', color: 'bg-purple-100 text-purple-700', icon: '⭐' };
      case 'regular':
        return { label: 'Regular', color: 'bg-blue-100 text-blue-700', icon: '🔵' };
      case 'occasional':
        return { label: 'Occasional', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' };
      default:
        return { label: 'Occasional', color: 'bg-gray-100 text-gray-700', icon: '⚪' };
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mpesa':
        return '📱';
      case 'bank_transfer':
        return '🏦';
      case 'cheque':
        return '📄';
      default:
        return '💵';
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <span className="ml-2 text-gray-600">Loading suppliers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-12">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg mx-auto">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="font-bold">Error loading suppliers</p>
            </div>
            <p className="text-sm mb-4">{error}</p>
            <button 
              onClick={fetchSuppliers}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Suppliers</h2>
      
      {/* Search and Filter Controls */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={filterTierValue}
                onChange={(e) => handleTierFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tiers</option>
                <option value="strategic">Strategic Partners</option>
                <option value="regular">Regular</option>
                <option value="occasional">Occasional</option>
              </select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Suppliers Display */}
      {suppliers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => {
            const tierInfo = getTierInfo(supplier);
            const paymentIcon = getPaymentMethodIcon(supplier.preferred_payment_method || 'cash');
            
            return (
              <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{supplier.name}</h3>
                    {supplier.contact_person && (
                      <p className="text-sm text-gray-600 mt-1">Contact: {supplier.contact_person}</p>
                    )}
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={14} />
                      {supplier.address}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${tierInfo.color}`}>
                    {tierInfo.icon} {tierInfo.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Phone size={14} />
                    {supplier.phone}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Mail size={14} />
                    {supplier.email}
                  </p>
                  {supplier.website && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Globe size={14} />
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </p>
                  )}
                  <div className="pt-2">
                    <p className="text-sm font-medium text-gray-700">Materials:</p>
                    <p className="text-sm text-gray-600">
                      {supplier.material_types.length > 0 ? supplier.material_types.join(', ') : 'No materials specified'}
                    </p>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Preferred Payment: {paymentIcon} {supplier.preferred_payment_method?.replace('_', ' ') || 'Cash'}
                    </p>
                    {supplier.credit_limit && supplier.credit_limit > 0 && (
                      <p className="text-sm text-gray-600">Credit Limit: KES {supplier.credit_limit.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{supplier.total_transactions}</p>
                    <p className="text-xs text-gray-500">Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">KES {(supplier.total_value / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">Total Value</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{supplier.total_weight ? `${(supplier.total_weight / 1000).toFixed(1)}T` : '0T'}</p>
                    <p className="text-xs text-gray-500">Total Weight</p>
                  </div>
                </div>

                {supplier.last_transaction_date && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar size={14} />
                      Last Transaction: {new Date(supplier.last_transaction_date).toLocaleDateString()}
                    </p>
                    {supplier.average_transaction_value && (
                      <p className="text-sm text-gray-600 mt-1">
                        Avg. Transaction: KES {supplier.average_transaction_value.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    supplier.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {supplier.status === 'active' ? '● Active' : '● Inactive'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit Supplier"
                    >
                      <Edit2 size={16} />
                    </button>
                    {supplier.supplier_tier === 'strategic' && (
                      <div className="p-2" title="Strategic Partner">
                        <Award size={16} className="text-purple-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Supplier Modal */}
      <AddSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddSupplier}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default Suppliers;