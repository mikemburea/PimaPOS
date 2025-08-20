import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Filter, Calendar, TrendingUp, Package, DollarSign, Plus, Menu, X, Camera, Upload, Loader2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StorageService } from '../../services/storageService';

// Enhanced Transaction type to handle both purchases and sales
interface Transaction {
  id: string;
  transaction_type: 'Purchase' | 'Sale';
  supplier_id?: string | null;
  customer_name: string; // Unified field for walkin_name/supplier_name
  customer_phone?: string | null; // For purchases only
  material_type: string; // Unified field for material_type/material_name
  transaction_date: string;
  total_amount: number;
  created_at: string;
  transaction_number?: string | null;
  transaction_id?: string; // For sales transactions
  is_walkin?: boolean; // For purchases only
  material_category?: string | null;
  weight_kg?: number | null;
  unit_price?: number | null;
  price_per_kg?: number | null; // For sales transactions
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
  is_special_price?: boolean; // For sales transactions
  original_price?: number | null; // For sales transactions
}

interface TransactionsProps {
  onTransactionUpdate?: (transaction: Transaction) => Promise<void>;
  transactions?: Transaction[];
}

// Photo preview interface for the form
interface PhotoPreview {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

// Update the StatusBadge to handle all possible status values
function StatusBadge({ status }: { status: string }) {
  const classes = {
    completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
    processing: 'bg-blue-50 text-blue-700 border border-blue-200',
    cancelled: 'bg-gray-50 text-gray-700 border border-gray-200'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TransactionTypeBadge({ type }: { type: 'Purchase' | 'Sale' }) {
  const classes = {
    Purchase: 'bg-blue-50 text-blue-700 border border-blue-200',
    Sale: 'bg-green-50 text-green-700 border border-green-200'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[type]}`}>
      {type}
    </span>
  );
}

function StatsCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ComponentType<any>; color: string }) {
  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow w-full">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${color} shrink-0 ml-2`}>
          <Icon size={16} className="text-white sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  );
}

// Edit Transaction Modal Component
function EditTransactionModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  transaction 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  transaction: Transaction | null;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    material_type: 'Aluminum',
    material_category: '',
    weight_kg: '',
    unit_price: '',
    quality_grade: 'A',
    payment_method: 'cash',
    payment_status: 'pending',
    notes: '',
    transaction_type: 'Purchase' as 'Purchase' | 'Sale'
  });

  // Initialize form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        customer_name: transaction.customer_name || '',
        customer_phone: transaction.customer_phone || '',
        material_type: transaction.material_type || 'Aluminum',
        material_category: transaction.material_category || '',
        weight_kg: transaction.weight_kg?.toString() || '',
        unit_price: (transaction.unit_price || transaction.price_per_kg)?.toString() || '',
        quality_grade: transaction.quality_grade || 'A',
        payment_method: transaction.payment_method || 'cash',
        payment_status: transaction.payment_status || 'pending',
        notes: transaction.notes || '',
        transaction_type: transaction.transaction_type
      });
    }
  }, [transaction]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    
    setLoading(true);
    
    try {
      // Calculate amounts
      const weight = parseFloat(formData.weight_kg) || 0;
      const unitPrice = parseFloat(formData.unit_price) || 0;
      const totalAmount = weight * unitPrice;
      
      if (transaction.transaction_type === 'Purchase') {
        // Update in transactions table
        // Determine if this is a supplier or walk-in customer transaction
        const updateData: any = {
          material_type: formData.material_type,
          material_category: formData.material_category || formData.material_type,
          weight_kg: weight,
          unit_price: unitPrice,
          total_amount: totalAmount,
          final_amount: totalAmount,
          quality_grade: formData.quality_grade,
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          notes: formData.notes,
          updated_at: new Date().toISOString()
        };

        // If it has a supplier_id, update supplier_name, otherwise update walkin_name
        if (transaction.supplier_id) {
          updateData.supplier_name = formData.customer_name;
        } else {
          updateData.walkin_name = formData.customer_name;
          updateData.walkin_phone = formData.customer_phone;
        }

        const { error: updateError } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', transaction.id);
        
        if (updateError) throw updateError;
      } else {
        // Update in sales_transactions table
        const { error: updateError } = await supabase
          .from('sales_transactions')
          .update({
            supplier_name: formData.customer_name,
            material_name: formData.material_type,
            weight_kg: weight,
            price_per_kg: unitPrice,
            total_amount: totalAmount,
            payment_method: formData.payment_method,
            payment_status: formData.payment_status,
            notes: formData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);
        
        if (updateError) throw updateError;
      }
      
      // Success
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Transaction</h2>
            <p className="text-sm text-gray-500 mt-1">
              {transaction.transaction_type} • {transaction.transaction_number || transaction.transaction_id}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type Display */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Transaction Type:</span>
            <TransactionTypeBadge type={transaction.transaction_type} />
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {transaction.transaction_type === 'Purchase' 
                  ? (transaction.supplier_id ? 'Supplier Name' : 'Customer Name')
                  : 'Supplier Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="John Doe"
              />
            </div>
            
            {transaction.transaction_type === 'Purchase' && !transaction.supplier_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="0700000000"
                />
              </div>
            )}
          </div>

          {/* Material Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Type *
              </label>
              <select
                value={formData.material_type}
                onChange={(e) => setFormData(prev => ({ ...prev, material_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Aluminum">Aluminum</option>
                <option value="Copper">Copper</option>
                <option value="Steel">Steel</option>
                <option value="Iron">Iron</option>
                <option value="Brass">Brass</option>
                <option value="Lead">Lead</option>
                <option value="Zinc">Zinc</option>
                <option value="Stainless Steel">Stainless Steel</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.weight_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {transaction.transaction_type === 'Purchase' ? 'Unit Price' : 'Price per kg'} (KES/kg) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quality and Payment */}
          <div className="grid grid-cols-3 gap-4">
            {transaction.transaction_type === 'Purchase' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quality Grade
                </label>
                <select
                  value={formData.quality_grade}
                  onChange={(e) => setFormData(prev => ({ ...prev, quality_grade: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {/* Total Amount Display */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Total Amount:</span>
              <span className="text-2xl font-bold text-teal-600">
                KES {((parseFloat(formData.weight_kg) || 0) * (parseFloat(formData.unit_price) || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Update Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// New Transaction Modal Component with Photo Upload (Keep existing for purchases)
function NewTransactionModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [formData, setFormData] = useState({
    walkin_name: '',
    walkin_phone: '',
    material_type: 'Aluminum',
    material_category: '',
    weight_kg: '',
    unit_price: '',
    quality_grade: 'A',
    payment_method: 'cash',
    payment_status: 'pending',
    notes: ''
  });

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file size and type
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image.`);
        return false;
      }
      return true;
    });
    
    const newPhotos = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  // Remove photo from preview
  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Upload photos to storage and save records
  const uploadPhotos = async (transactionId: string) => {
    console.log(`Uploading ${photos.length} photos for transaction ${transactionId}`);
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        // Update UI to show uploading state
        setPhotos(prev => {
          const updated = [...prev];
          updated[i].uploading = true;
          return updated;
        });
        
        // Upload to storage using your existing StorageService
        const uploadResult = await StorageService.uploadTransactionPhoto(
          photo.file,
          transactionId
        );
        
        // Save record to database
        const { error: dbError } = await supabase
          .from('transaction_photos')
          .insert({
            transaction_id: transactionId,
            file_name: photo.file.name,
            file_path: uploadResult.path,
            file_size_bytes: photo.file.size,
            mime_type: photo.file.type,
            upload_order: i + 1,
            storage_bucket: 'transaction-photos',
            is_primary: i === 0, // First photo is primary
            notes: `Photo ${i + 1} of ${photos.length}`
          });
        
        if (dbError) {
          console.error('Error saving photo record:', dbError);
          throw dbError;
        }
        
        // Update UI to show uploaded state
        setPhotos(prev => {
          const updated = [...prev];
          updated[i].uploading = false;
          updated[i].uploaded = true;
          return updated;
        });
        
        console.log(`Successfully uploaded photo ${i + 1}/${photos.length}`);
        
      } catch (error) {
        console.error(`Error uploading photo ${i + 1}:`, error);
        
        setPhotos(prev => {
          const updated = [...prev];
          updated[i].uploading = false;
          updated[i].error = 'Upload failed';
          return updated;
        });
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Calculate amounts
      const weight = parseFloat(formData.weight_kg) || 0;
      const unitPrice = parseFloat(formData.unit_price) || 0;
      const totalAmount = weight * unitPrice;
      
      // Generate transaction number
      const transactionNumber = `TX-${Date.now()}`;
      
      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumber,
          is_walkin: true,
          walkin_name: formData.walkin_name,
          walkin_phone: formData.walkin_phone,
          material_type: formData.material_type,
          material_category: formData.material_category || formData.material_type,
          weight_kg: weight,
          unit_price: unitPrice,
          total_amount: totalAmount,
          final_amount: totalAmount,
          quality_grade: formData.quality_grade,
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          notes: formData.notes,
          transaction_date: new Date().toISOString(),
          created_by: 'mobile_app'
        })
        .select()
        .single();
      
      if (txError) {
        throw txError;
      }
      
      console.log('Transaction created:', transaction.id);
      
      // Upload photos if any
      if (photos.length > 0) {
        await uploadPhotos(transaction.id);
        console.log(`Transaction ${transaction.id} created with ${photos.length} photos`);
      } else {
        console.log(`Transaction ${transaction.id} created without photos`);
      }
      
      // Success
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        walkin_name: '',
        walkin_phone: '',
        material_type: 'Aluminum',
        material_category: '',
        weight_kg: '',
        unit_price: '',
        quality_grade: 'A',
        payment_method: 'cash',
        payment_status: 'pending',
        notes: ''
      });
      setPhotos([]);
      
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">New Purchase Transaction</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={formData.walkin_name}
                onChange={(e) => setFormData(prev => ({ ...prev, walkin_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.walkin_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, walkin_phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="0700000000"
              />
            </div>
          </div>

          {/* Material Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Type *
              </label>
              <select
                value={formData.material_type}
                onChange={(e) => setFormData(prev => ({ ...prev, material_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Aluminum">Aluminum</option>
                <option value="Copper">Copper</option>
                <option value="Steel">Steel</option>
                <option value="Iron">Iron</option>
                <option value="Brass">Brass</option>
                <option value="Lead">Lead</option>
                <option value="Zinc">Zinc</option>
                <option value="Stainless Steel">Stainless Steel</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.weight_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price (KES/kg) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quality and Payment */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Grade
              </label>
              <select
                value={formData.quality_grade}
                onChange={(e) => setFormData(prev => ({ ...prev, quality_grade: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium text-gray-700">Transaction Photos (Optional)</h3>
              </div>
              <span className="text-sm text-gray-500">{photos.length} photo(s) selected</span>
            </div>
            
            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={photo.preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    
                    {/* Upload Status Overlay */}
                    {photo.uploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    
                    {photo.uploaded && (
                      <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <div className="bg-green-600 text-white p-1 rounded-full">✓</div>
                      </div>
                    )}
                    
                    {photo.error && (
                      <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-red-600 text-center px-1">{photo.error}</span>
                      </div>
                    )}
                    
                    {/* Remove Button */}
                    {!photo.uploading && !photo.uploaded && (
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {photos.length > 0 ? 'Add More Photos' : 'Upload Photos'}
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={loading}
              />
            </label>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              Supports JPG, PNG, WebP up to 5MB each
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {/* Total Amount Display */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Total Amount:</span>
              <span className="text-2xl font-bold text-teal-600">
                KES {((parseFloat(formData.weight_kg) || 0) * (parseFloat(formData.unit_price) || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Mobile Transaction Card Component (enhanced with transaction type)
function TransactionCard({ 
  tx, 
  onDelete, 
  onUpdateStatus,
  onEdit 
}: { 
  tx: Transaction; 
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onEdit: (transaction: Transaction) => void;
}) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${tx.transaction_type === 'Purchase' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <span className="text-sm font-semibold text-gray-900 truncate">
              {tx.transaction_number || tx.transaction_id || tx.id}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(tx.transaction_date).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-2 shrink-0 space-y-1">
          <TransactionTypeBadge type={tx.transaction_type} />
          <StatusBadge status={tx.payment_status || 'pending'} />
        </div>
      </div>

      {/* Customer/Supplier Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0 ${
          tx.transaction_type === 'Purchase' 
            ? 'bg-gradient-to-br from-blue-400 to-blue-600'
            : 'bg-gradient-to-br from-green-400 to-green-600'
        }`}>
          {tx.customer_name?.split(' ').map((n: string) => n[0]).join('') || 'UC'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm truncate">
            {tx.customer_name || 'Unknown Customer'}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {tx.transaction_type === 'Purchase' && (
              <span className="text-xs">
                {tx.supplier_id ? '🏢 Supplier' : '👤 Walk-in'}
              </span>
            )}
            {tx.customer_phone && (
              <span className="truncate">{tx.customer_phone}</span>
            )}
          </div>
        </div>
      </div>

      {/* Material & Weight Info */}
      <div className="grid grid-cols-2 gap-3 py-2 border-t border-gray-100">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Material</p>
          <p className="text-sm font-medium text-gray-900 truncate">{tx.material_type}</p>
          {tx.material_category && (
            <p className="text-xs text-gray-500 truncate">{tx.material_category}</p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Weight</p>
          <p className="text-sm font-medium text-gray-900">{tx.weight_kg || 0} kg</p>
          {tx.quality_grade && (
            <p className="text-xs text-gray-500">Grade: {tx.quality_grade}</p>
          )}
        </div>
      </div>

      {/* Amount & Payment */}
      <div className="grid grid-cols-2 gap-3 py-2 border-t border-gray-100">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="text-sm font-semibold text-gray-900">
            KES {(tx.total_amount || 0).toLocaleString()}
          </p>
          {(tx.unit_price || tx.price_per_kg) && (
            <p className="text-xs text-gray-500">@ {tx.unit_price || tx.price_per_kg}/kg</p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Payment</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {tx.payment_method || 'N/A'}
          </p>
          {tx.payment_reference && (
            <p className="text-xs text-gray-500 truncate">{tx.payment_reference}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button 
            title="View Details"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Eye size={16} className="text-gray-600" />
          </button>
          <button 
            title="Edit Transaction"
            onClick={() => onEdit(tx)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit2 size={16} className="text-gray-600" />
          </button>
          <button 
            title="Delete Transaction"
            onClick={() => onDelete(tx.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
        {tx.notes && (
          <div className="text-xs text-gray-500 italic max-w-[100px] truncate">
            {tx.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Transactions({ onTransactionUpdate }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Fetch transactions from both tables
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch purchases from transactions table
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('transactions')
        .select(`
          *,
          suppliers:supplier_id (
            name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (purchaseError) {
        throw purchaseError;
      }

      // Fetch sales from sales_transactions table
      const { data: salesData, error: salesError } = await supabase
        .from('sales_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) {
        throw salesError;
      }

      // Transform and combine the data
      const purchases: Transaction[] = (purchaseData || []).map(tx => ({
        id: tx.id,
        transaction_type: 'Purchase' as const,
        supplier_id: tx.supplier_id,
        customer_name: tx.supplier_name || tx.suppliers?.name || tx.walkin_name || 'Unknown Customer',
        customer_phone: tx.suppliers?.phone || tx.walkin_phone,
        material_type: tx.material_type,
        transaction_date: tx.transaction_date,
        total_amount: tx.total_amount,
        created_at: tx.created_at,
        transaction_number: tx.transaction_number,
        is_walkin: tx.is_walkin,
        material_category: tx.material_category,
        weight_kg: tx.weight_kg,
        unit_price: tx.unit_price,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
        payment_reference: tx.payment_reference,
        quality_grade: tx.quality_grade,
        deductions: tx.deductions,
        final_amount: tx.final_amount,
        receipt_number: tx.receipt_number,
        notes: tx.notes,
        created_by: tx.created_by,
        updated_at: tx.updated_at
      }));

      const sales: Transaction[] = (salesData || []).map(tx => ({
        id: tx.id,
        transaction_type: 'Sale' as const,
        supplier_id: tx.supplier_id,
        customer_name: tx.supplier_name || 'Unknown Supplier',
        customer_phone: null, // Sales don't have phone numbers
        material_type: tx.material_name,
        transaction_date: tx.transaction_date,
        total_amount: tx.total_amount,
        created_at: tx.created_at,
        transaction_id: tx.transaction_id,
        material_category: tx.material_name, // Use material_name as category for sales
        weight_kg: tx.weight_kg,
        price_per_kg: tx.price_per_kg,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
        notes: tx.notes,
        created_by: tx.created_by,
        updated_at: tx.updated_at,
        is_special_price: tx.is_special_price,
        original_price: tx.original_price
      }));

      // Combine and sort by created_at
      const allTransactions = [...purchases, ...sales].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction from appropriate table
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const transaction = transactions.find(tx => tx.id === transactionId);
      if (!transaction) return;

      if (transaction.transaction_type === 'Purchase') {
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId);

        if (deleteError) throw deleteError;
      } else {
        const { error: deleteError } = await supabase
          .from('sales_transactions')
          .delete()
          .eq('id', transactionId);

        if (deleteError) throw deleteError;
      }

      // Remove from local state
      setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
      
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  // Update transaction status in appropriate table
  const handleUpdateStatus = async (transactionId: string, newStatus: string) => {
    try {
      const transaction = transactions.find(tx => tx.id === transactionId);
      if (!transaction) return;

      let updatedTransaction;
      
      if (transaction.transaction_type === 'Purchase') {
        const { data, error: updateError } = await supabase
          .from('transactions')
          .update({ 
            payment_status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId)
          .select()
          .single();

        if (updateError) throw updateError;
        updatedTransaction = {
          ...transaction,
          payment_status: newStatus,
          updated_at: data.updated_at
        };
      } else {
        const { data, error: updateError } = await supabase
          .from('sales_transactions')
          .update({ 
            payment_status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId)
          .select()
          .single();

        if (updateError) throw updateError;
        updatedTransaction = {
          ...transaction,
          payment_status: newStatus,
          updated_at: data.updated_at
        };
      }

      // Update local state
      setTransactions(prev => 
        prev.map(tx => tx.id === transactionId ? updatedTransaction : tx)
      );
      
      if (updatedTransaction && onTransactionUpdate) {
        await onTransactionUpdate(updatedTransaction);
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
      alert('Failed to update transaction status. Please try again.');
    }
  };

  // Handle edit transaction
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  // Export transactions
  const handleExport = async () => {
    try {
      const csvContent = transactions.map(tx => 
        `${tx.id},${tx.transaction_date},${tx.transaction_type},${tx.customer_name || 'N/A'},${tx.material_type},${tx.weight_kg || 0},${tx.total_amount},${tx.payment_status || 'pending'}`
      ).join('\n');
      
      const blob = new Blob([`ID,Date,Type,Customer/Supplier,Material,Weight,Amount,Status\n${csvContent}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting transactions:', err);
      alert('Failed to export transactions');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.material_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.transaction_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tx.payment_status === filterStatus;
    const matchesType = filterType === 'all' || tx.transaction_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Statistics
  const completedTransactions = transactions.filter(tx => tx.payment_status === 'completed').length;
  const totalValue = transactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
  const totalWeight = transactions.reduce((sum, tx) => sum + (tx.weight_kg || 0), 0);
  const purchaseCount = transactions.filter(tx => tx.transaction_type === 'Purchase').length;
  const salesCount = transactions.filter(tx => tx.transaction_type === 'Sale').length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTransactionCreated = () => {
    fetchTransactions(); // Refresh the list
    setShowNewTransactionModal(false);
  };

  const handleTransactionUpdated = () => {
    fetchTransactions(); // Refresh the list
    setShowEditModal(false);
    setEditingTransaction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-3 py-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-3 py-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold mb-2">Error Loading Data</p>
            <p className="text-sm mb-4">{error}</p>
            <button 
              onClick={fetchTransactions}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
          {/* Header */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">Manage and track all material transactions</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1 text-center sm:text-left">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <button 
                onClick={() => setShowNewTransactionModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm order-1 sm:order-2"
              >
                <Plus size={20} />
                <span className="font-medium">New Transaction</span>
              </button>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-6 sm:p-12 border border-gray-100">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Package size={32} className="text-gray-400 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                Get started by creating your first transaction. All your material purchases and sales will appear here.
              </p>
              <button 
                onClick={() => setShowNewTransactionModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm mx-auto w-full sm:w-auto"
              >
                <Plus size={20} />
                <span className="font-medium">Create First Transaction</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <NewTransactionModal
          isOpen={showNewTransactionModal}
          onClose={() => setShowNewTransactionModal(false)}
          onSuccess={handleTransactionCreated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1">Manage and track all material transactions</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1 text-center sm:text-left">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <button 
              onClick={() => setShowNewTransactionModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm order-1 sm:order-2"
            >
              <Plus size={20} />
              <span className="font-medium">New Purchase</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatsCard 
            title="Total Transactions" 
            value={transactions.length.toString()} 
            icon={Package}
            color="bg-blue-500"
          />
          <StatsCard 
            title="Purchases" 
            value={purchaseCount.toString()} 
            icon={TrendingUp}
            color="bg-blue-600"
          />
          <StatsCard 
            title="Sales" 
            value={salesCount.toString()} 
            icon={TrendingUp}
            color="bg-green-600"
          />
          <StatsCard 
            title="Total Value" 
            value={`KES ${totalValue.toLocaleString()}`}
            icon={DollarSign}
            color="bg-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by ID, customer, or material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* Mobile Filter Toggle */}
              <div className="sm:hidden">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-between w-full px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-400" />
                    <span className="text-sm">Filters</span>
                  </div>
                  {showFilters ? <X size={16} /> : <Menu size={16} />}
                </button>
              </div>

              {/* Desktop Filters */}
              <div className="hidden sm:flex items-center gap-2">
                <Filter className="text-gray-400" size={20} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="Purchase">Purchases</option>
                  <option value="Sale">Sales</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Mobile Collapsible Filters */}
            {showFilters && (
              <div className="sm:hidden pt-3 border-t border-gray-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-400" size={16} />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="Purchase">Purchases</option>
                    <option value="Sale">Sales</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-400" size={16} />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Calendar size={20} />
                <span className="hidden sm:inline">Date Range</span>
                <span className="sm:hidden">Date</span>
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Download size={20} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Transactions - Mobile Cards & Desktop Table */}
        <div className="w-full">
          {/* Mobile Cards (shown on small screens) */}
          <div className="block lg:hidden space-y-3 w-full">
            {currentTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                onDelete={handleDeleteTransaction}
                onUpdateStatus={handleUpdateStatus}
                onEdit={handleEditTransaction}
              />
            ))}
          </div>

          {/* Desktop Table (shown on large screens) */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr className="text-left text-sm text-gray-700">
                    <th className="px-6 py-4 font-semibold">Transaction ID</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Customer/Supplier</th>
                    <th className="px-6 py-4 font-semibold">Material</th>
                    <th className="px-6 py-4 font-semibold">Weight (kg)</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentTransactions.map((tx, index) => (
                    <tr key={tx.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${tx.transaction_type === 'Purchase' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                          {tx.transaction_number || tx.transaction_id || tx.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <TransactionTypeBadge type={tx.transaction_type} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3 ${
                            tx.transaction_type === 'Purchase' 
                              ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                              : 'bg-gradient-to-br from-green-400 to-green-600'
                          }`}>
                            {tx.customer_name?.split(' ').map((n: string) => n[0]).join('') || 'UC'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{tx.customer_name || 'Unknown Customer'}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              {tx.transaction_type === 'Purchase' && (
                                <span>{tx.supplier_id ? '🏢 Supplier' : '👤 Walk-in'}</span>
                              )}
                              {tx.customer_phone && (
                                <span>{tx.customer_phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{tx.material_type}</div>
                          {tx.material_category && (
                            <div className="text-xs text-gray-500">{tx.material_category}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {tx.weight_kg || 0} kg
                        {tx.quality_grade && (
                          <div className="text-xs text-gray-500">Grade: {tx.quality_grade}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-gray-900">
                          KES {(tx.total_amount || 0).toLocaleString()}
                        </div>
                        {(tx.unit_price || tx.price_per_kg) && (
                          <div className="text-xs text-gray-500">
                            @ KES {tx.unit_price || tx.price_per_kg}/kg
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={tx.payment_status || 'pending'} />
                        {tx.payment_method && (
                          <div className="text-xs text-gray-500 mt-1">
                            via {tx.payment_method}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button 
                            title="View Details"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                          >
                            <Eye size={16} className="text-gray-600 group-hover:text-teal-600" />
                          </button>
                          <button 
                            title="Edit Transaction"
                            onClick={() => handleEditTransaction(tx)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                          >
                            <Edit2 size={16} className="text-gray-600 group-hover:text-blue-600" />
                          </button>
                          <button 
                            title="Delete Transaction"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                          >
                            <Trash2 size={16} className="text-gray-600 group-hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100">
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </div>
          </div>
          
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                <span className="hidden xs:inline">Prev</span>
              </button>
              
              {/* Smart Pagination */}
              <div className="flex items-center gap-1 text-sm text-gray-600">
                {totalPages <= 5 ? (
                  // Show all pages if 5 or fewer
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-teal-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                ) : (
                  // Condensed pagination for many pages
                  <div className="flex items-center gap-1">
                    {currentPage > 1 && (
                      <button
                        onClick={() => handlePageChange(1)}
                        className="min-w-[32px] h-8 px-2 rounded-md text-xs font-medium hover:bg-gray-100 text-gray-700"
                      >
                        1
                      </button>
                    )}
                    
                    {currentPage > 3 && <span className="text-gray-400 px-1">...</span>}
                    
                    {currentPage > 2 && (
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="min-w-[32px] h-8 px-2 rounded-md text-xs font-medium hover:bg-gray-100 text-gray-700"
                      >
                        {currentPage - 1}
                      </button>
                    )}
                    
                    <button
                      className="min-w-[32px] h-8 px-2 rounded-md text-xs font-medium bg-teal-600 text-white"
                    >
                      {currentPage}
                    </button>
                    
                    {currentPage < totalPages - 1 && (
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="min-w-[32px] h-8 px-2 rounded-md text-xs font-medium hover:bg-gray-100 text-gray-700"
                      >
                        {currentPage + 1}
                      </button>
                    )}
                    
                    {currentPage < totalPages - 2 && <span className="text-gray-400 px-1">...</span>}
                    
                    {currentPage < totalPages && (
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="min-w-[32px] h-8 px-2 rounded-md text-xs font-medium hover:bg-gray-100 text-gray-700"
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewTransactionModal
        isOpen={showNewTransactionModal}
        onClose={() => setShowNewTransactionModal(false)}
        onSuccess={handleTransactionCreated}
      />

      <EditTransactionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTransaction(null);
        }}
        onSuccess={handleTransactionUpdated}
        transaction={editingTransaction}
      />
    </div>
  );
}