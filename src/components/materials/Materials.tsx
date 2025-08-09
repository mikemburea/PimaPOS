import React, { useState } from 'react';
import { Search, Plus, Edit2, X, Save, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface Material {
  id: string;
  name: string;
  description?: string;
  category: string;
  current_price_per_kg: number;
  minimum_weight: number;
  price_updated_at?: string;
  price_updated_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MaterialFormData {
  name: string;
  description: string;
  category: string;
  current_price_per_kg: number;
  minimum_weight: number;
}

// Helper component for status badge
interface StatusBadgeProps {
  isActive: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ isActive }) => {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      isActive 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

// Modal component for adding/editing materials
interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: MaterialFormData) => Promise<void>;
  material?: Material;
  mode: 'add' | 'edit';
}

const MaterialModal: React.FC<MaterialModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  material, 
  mode 
}) => {
  const [formData, setFormData] = useState<MaterialFormData>({
    name: material?.name || '',
    description: material?.description || '',
    category: material?.category || 'general',
    current_price_per_kg: material?.current_price_per_kg || 0,
    minimum_weight: material?.minimum_weight || 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (material && mode === 'edit') {
      setFormData({
        name: material.name || '',
        description: material.description || '',
        category: material.category || 'general',
        current_price_per_kg: material.current_price_per_kg || 0,
        minimum_weight: material.minimum_weight || 0
      });
    } else if (mode === 'add') {
      setFormData({
        name: '',
        description: '',
        category: 'general',
        current_price_per_kg: 0,
        minimum_weight: 0
      });
    }
  }, [material, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.current_price_per_kg <= 0) newErrors.current_price_per_kg = 'Price must be greater than 0';
    if (formData.minimum_weight < 0) newErrors.minimum_weight = 'Minimum weight cannot be negative';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await onSave(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'general',
        current_price_per_kg: 0,
        minimum_weight: 0
      });
      setErrors({});
    } catch (error) {
      console.error('Error saving material:', error);
      setErrors({ submit: 'Failed to save material. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'current_price_per_kg' || name === 'minimum_weight' 
        ? parseFloat(value) || 0 
        : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: 'general',
      current_price_per_kg: 0,
      minimum_weight: 0
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const categories = [
    { value: 'ferrous', label: 'Ferrous Metals' },
    { value: 'non_ferrous', label: 'Non-Ferrous Metals' },
    { value: 'electronic', label: 'Electronic Waste' },
    { value: 'plastic', label: 'Plastic' },
    { value: 'paper', label: 'Paper' },
    { value: 'general', label: 'General' }
  ];

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Enhanced Backdrop with animated blur and gradient overlay */}
    <div 
      className="fixed inset-0 bg-gradient-to-br from-gray-900/15 via-slate-800/10 to-gray-900/20 backdrop-blur-sm transition-all duration-500 ease-out animate-in fade-in"
      onClick={handleClose}
    />
      
      {/* Modal Container with glass morphism and enhanced shadows */}
      <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm sm:max-w-md rounded-3xl shadow-2xl border border-white/20 transform transition-all duration-500 ease-out animate-in zoom-in-95 slide-in-from-bottom-4">
          
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/80 via-white/60 to-white/40 pointer-events-none" />
        
        {/* Mobile Handle Bar with gradient */}
        <div className="sm:hidden absolute top-4 left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 rounded-full shadow-sm" />
        
        {/* Header with enhanced styling */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-4 sm:p-7 border-b border-gray-100/80 bg-gradient-to-r from-teal-50/30 to-emerald-50/30 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg sm:text-xl">
                {mode === 'add' ? '➕' : '✏️'}
              </span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {mode === 'add' ? 'Add New Material' : 'Edit Material'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {mode === 'add' ? 'Create a new recyclable material' : 'Update material information'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="relative p-2.5 hover:bg-red-50 rounded-2xl transition-all duration-300 hover:rotate-90 group shadow-sm border border-gray-100/50"
            type="button"
          >
            <X size={18} className="text-gray-400 group-hover:text-red-500 transition-colors duration-300" />
          </button>
        </div>

        {/* Content with enhanced spacing and backdrop */}
        <div className="relative px-6 py-5 sm:p-7 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {errors.submit && (
            <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/50 text-red-700 rounded-2xl text-xs sm:text-sm shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                {errors.submit}
              </div>
            </div>
          )}

          <div className="space-y-5 sm:space-y-6">
            {/* Material Name with floating label effect */}
            <div className="relative group">
              <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs sm:text-sm font-semibold text-teal-700 z-10 transition-all duration-300 group-focus-within:text-teal-600">
                Material Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 sm:py-3.5 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm ${
                  errors.name 
                    ? 'border-red-300 bg-red-50/50 focus:border-red-400' 
                    : 'border-gray-200/80 bg-white/70 hover:border-teal-300 focus:border-teal-400 hover:bg-white/90'
                }`}
                placeholder="Enter material name"
                required
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                  <span>❌</span> {errors.name}
                </p>
              )}
            </div>

            {/* Description with enhanced styling */}
            <div className="relative group">
              <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs sm:text-sm font-semibold text-teal-700 z-10 transition-all duration-300 group-focus-within:text-teal-600">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 sm:py-3.5 border-2 border-gray-200/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 hover:border-teal-300 focus:border-teal-400 transition-all duration-300 resize-none text-sm sm:text-base bg-white/70 hover:bg-white/90 backdrop-blur-sm"
                placeholder="Enter material description (optional)"
              />
            </div>

            {/* Category with enhanced dropdown */}
            <div className="relative group">
              <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs sm:text-sm font-semibold text-teal-700 z-10 transition-all duration-300 group-focus-within:text-teal-600">
                Category *
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 sm:py-3.5 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all duration-300 appearance-none text-sm sm:text-base backdrop-blur-sm cursor-pointer ${
                    errors.category 
                      ? 'border-red-300 bg-red-50/50 focus:border-red-400' 
                      : 'border-gray-200/80 bg-white/70 hover:border-teal-300 focus:border-teal-400 hover:bg-white/90'
                  }`}
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {errors.category && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                  <span>❌</span> {errors.category}
                </p>
              )}
            </div>

            {/* Price and Weight with card-like styling */}
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              <div className="relative group">
                <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs sm:text-sm font-semibold text-teal-700 z-10 transition-all duration-300 group-focus-within:text-teal-600">
                  Price (KES) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                  <input
                    type="number"
                    name="current_price_per_kg"
                    value={formData.current_price_per_kg}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={`w-full pl-8 pr-4 py-3 sm:py-3.5 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm ${
                      errors.current_price_per_kg 
                        ? 'border-red-300 bg-red-50/50 focus:border-red-400' 
                        : 'border-gray-200/80 bg-white/70 hover:border-teal-300 focus:border-teal-400 hover:bg-white/90'
                    }`}
                    placeholder="0.00"
                    required
                  />
                </div>
                {errors.current_price_per_kg && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <span>❌</span> {errors.current_price_per_kg}
                  </p>
                )}
              </div>

              <div className="relative group">
                <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs sm:text-sm font-semibold text-teal-700 z-10 transition-all duration-300 group-focus-within:text-teal-600">
                  Min Weight (KG) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="minimum_weight"
                    value={formData.minimum_weight}
                    onChange={handleInputChange}
                    step="0.001"
                    min="0"
                    className={`w-full px-4 py-3 sm:py-3.5 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all duration-300 text-sm sm:text-base backdrop-blur-sm ${
                      errors.minimum_weight 
                        ? 'border-red-300 bg-red-50/50 focus:border-red-400' 
                        : 'border-gray-200/80 bg-white/70 hover:border-teal-300 focus:border-teal-400 hover:bg-white/90'
                    }`}
                    placeholder="0.000"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">kg</span>
                </div>
                {errors.minimum_weight && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <span>❌</span> {errors.minimum_weight}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with gradient background and enhanced buttons */}
        <div className="relative px-6 py-4 sm:p-7 border-t border-gray-100/80 bg-gradient-to-r from-gray-50/80 to-slate-50/80 rounded-b-3xl backdrop-blur-sm">
          <div className="flex gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 sm:py-3.5 px-5 border-2 border-gray-300/80 text-gray-700 rounded-2xl hover:bg-gray-100/80 hover:border-gray-400 transition-all duration-300 font-semibold text-sm sm:text-base backdrop-blur-sm shadow-sm hover:shadow-md"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 px-5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <Save size={16} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Materials component
interface MaterialsProps {
  materials: Material[];
  onMaterialAdd: (material: MaterialFormData) => Promise<void>;
  onMaterialUpdate: (id: string, material: MaterialFormData) => Promise<void>;
  onMaterialDelete: (id: string) => Promise<void>;
}

const Materials: React.FC<MaterialsProps> = ({ 
  materials, 
  onMaterialAdd, 
  onMaterialUpdate, 
  onMaterialDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | undefined>();

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;
    return matchesSearch && matchesCategory && material.is_active;
  });

  const handleAddMaterial = () => {
    console.log('Add Material clicked!'); // Debug log
    setModalMode('add');
    setSelectedMaterial(undefined);
    setModalOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    console.log('Edit Material clicked!', material); // Debug log
    setModalMode('edit');
    setSelectedMaterial(material);
    setModalOpen(true);
  };

  const handleModalSave = async (formData: MaterialFormData) => {
    try {
      if (modalMode === 'add') {
        await onMaterialAdd(formData);
      } else if (selectedMaterial) {
        await onMaterialUpdate(selectedMaterial.id, formData);
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving material:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await onMaterialDelete(id);
      } catch (error) {
        console.error('Error deleting material:', error);
        alert('Failed to delete material. Please try again.');
      }
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'ferrous', label: 'Ferrous Metals' },
    { value: 'non_ferrous', label: 'Non-Ferrous Metals' },
    { value: 'electronic', label: 'Electronic Waste' },
    { value: 'plastic', label: 'Plastic' },
    { value: 'paper', label: 'Paper' },
    { value: 'general', label: 'General' }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ferrous': return '🔩';
      case 'non_ferrous': return '🥫';
      case 'electronic': return '💻';
      case 'plastic': return '🥤';
      case 'paper': return '📄';
      default: return '📦';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleAddMaterial}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors cursor-pointer font-medium"
            type="button"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Material</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredMaterials.map((material) => (
          <div key={material.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl">{getCategoryIcon(material.category)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold truncate">{material.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{material.description}</p>
                  <StatusBadge isActive={material.is_active} />
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <button 
                  onClick={() => handleEditMaterial(material)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  type="button"
                  title="Edit Material"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteMaterial(material.id)}
                  className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                  type="button"
                  title="Delete Material"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Current Price</span>
                <span className="font-semibold">KES {material.current_price_per_kg.toFixed(2)}/kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Minimum Weight</span>
                <span className="text-sm">{material.minimum_weight} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm capitalize">{material.category.replace('_', ' ')}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium">
                  {new Date(material.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results Message */}
      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No materials found.</p>
          <p className="text-gray-400 text-sm mt-2">
            {materials.length === 0 
              ? 'Start by adding your first material!' 
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      )}

      {/* Price History Chart */}
      {materials.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Price History (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[
              { month: 'Jan', aluminum: 72, copper: 290, steel: 38, lead: 110, brass: 165 },
              { month: 'Feb', aluminum: 74, copper: 295, steel: 39, lead: 112, brass: 168 },
              { month: 'Mar', aluminum: 75, copper: 300, steel: 40, lead: 114, brass: 170 },
              { month: 'Apr', aluminum: 76, copper: 305, steel: 41, lead: 115, brass: 172 },
              { month: 'May', aluminum: 75, copper: 310, steel: 42, lead: 115, brass: 175 },
              { month: 'Jun', aluminum: 80, copper: 320, steel: 40, lead: 120, brass: 180 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="aluminum" stroke="#3B82F6" name="Aluminum" />
              <Line type="monotone" dataKey="copper" stroke="#F59E0B" name="Copper" />
              <Line type="monotone" dataKey="steel" stroke="#6B7280" name="Steel" />
              <Line type="monotone" dataKey="lead" stroke="#8B5CF6" name="Lead" />
              <Line type="monotone" dataKey="brass" stroke="#EAB308" name="Brass" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Material Modal */}
      <MaterialModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        material={selectedMaterial}
        mode={modalMode}
      />
    </div>
  );
};

export default Materials;