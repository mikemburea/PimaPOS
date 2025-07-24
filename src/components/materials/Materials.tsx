// src/components/materials/Materials.tsx - Complete working version
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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-5 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-500 ring-4 ring-gray-200 ring-opacity-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {mode === 'add' ? 'Add New Material' : 'Edit Material'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter material name"
              required
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter material description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Price per KG (KES) *
            </label>
            <input
              type="number"
              name="current_price_per_kg"
              value={formData.current_price_per_kg}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.current_price_per_kg ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
              required
            />
            {errors.current_price_per_kg && (
              <p className="text-red-500 text-sm mt-1">{errors.current_price_per_kg}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Weight (KG) *
            </label>
            <input
              type="number"
              name="minimum_weight"
              value={formData.minimum_weight}
              onChange={handleInputChange}
              step="0.001"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.minimum_weight ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.000"
              required
            />
            {errors.minimum_weight && (
              <p className="text-red-500 text-sm mt-1">{errors.minimum_weight}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
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
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer"
            type="button"
          >
            <Plus size={20} />
            Add Material
          </button>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => (
          <div key={material.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getCategoryIcon(material.category)}</span>
                <div>
                  <h3 className="text-lg font-semibold">{material.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                  <StatusBadge isActive={material.is_active} />
                </div>
              </div>
              <div className="flex gap-2">
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
        <div className="bg-white rounded-xl shadow-sm p-6">
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