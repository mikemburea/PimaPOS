// src/pages/MaterialsPage.tsx - Updated to ensure proper component import
import React, { useState, useEffect } from 'react';
import { materialsService } from '../services/materialsService';

// Import the Materials component - make sure this path is correct
import Materials from '../components/materials/Materials';

// Types - Define them here since we need them
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

const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize with some sample data if no database connection
  const initializeSampleData = () => {
    const sampleMaterials: Material[] = [
      {
        id: '1',
        name: 'Aluminum Cans',
        description: 'Recycled aluminum beverage cans',
        category: 'non_ferrous',
        current_price_per_kg: 80,
        minimum_weight: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Copper Wire',
        description: 'Stripped copper electrical wire',
        category: 'non_ferrous',
        current_price_per_kg: 320,
        minimum_weight: 0.5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Steel Scrap',
        description: 'Mixed steel scrap metal',
        category: 'ferrous',
        current_price_per_kg: 40,
        minimum_weight: 5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Lead Batteries',
        description: 'Lead-acid car batteries',
        category: 'non_ferrous',
        current_price_per_kg: 110,
        minimum_weight: 10,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        name: 'Brass Fittings',
        description: 'Brass plumbing fittings and fixtures',
        category: 'non_ferrous',
        current_price_per_kg: 180,
        minimum_weight: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '6',
        name: 'Tiles',
        description: 'Ceramic and porcelain tiles',
        category: 'general',
        current_price_per_kg: 15,
        minimum_weight: 50,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    setMaterials(sampleMaterials);
    setLoading(false);
  };

  // Fetch materials from the service
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from service, fallback to sample data
      try {
        const fetchedMaterials = await materialsService.getAll();
        setMaterials(fetchedMaterials);
      } catch (serviceError) {
        console.warn('Service unavailable, using sample data:', serviceError);
        initializeSampleData();
        return;
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch materials');
      // Fallback to sample data even on error
      initializeSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new material
  const handleMaterialAdd = async (materialData: MaterialFormData): Promise<void> => {
    try {
      // Try service first, fallback to local state
      try {
        const newMaterial = await materialsService.create(materialData);
        setMaterials(prev => [...prev, newMaterial]);
      } catch (serviceError) {
        console.warn('Service unavailable, adding locally:', serviceError);
        // Create locally
        const newMaterial: Material = {
          id: Date.now().toString(),
          ...materialData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setMaterials(prev => [...prev, newMaterial]);
      }
    } catch (err) {
      console.error('Error adding material:', err);
      throw err;
    }
  };

  // Handle updating an existing material
  const handleMaterialUpdate = async (id: string, materialData: MaterialFormData): Promise<void> => {
    try {
      // Try service first, fallback to local state
      try {
        const updatedMaterial = await materialsService.update(id, materialData);
        setMaterials(prev => 
          prev.map(material => 
            material.id === id ? updatedMaterial : material
          )
        );
      } catch (serviceError) {
        console.warn('Service unavailable, updating locally:', serviceError);
        // Update locally
        setMaterials(prev => 
          prev.map(material => 
            material.id === id 
              ? { 
                  ...material, 
                  ...materialData, 
                  updated_at: new Date().toISOString() 
                } 
              : material
          )
        );
      }
    } catch (err) {
      console.error('Error updating material:', err);
      throw err;
    }
  };

  // Handle deleting a material (soft delete - sets is_active to false)
  const handleMaterialDelete = async (id: string): Promise<void> => {
    try {
      // Try service first, fallback to local state
      try {
        await materialsService.delete(id);
        setMaterials(prev => 
          prev.map(material => 
            material.id === id 
              ? { ...material, is_active: false } 
              : material
          )
        );
      } catch (serviceError) {
        console.warn('Service unavailable, deleting locally:', serviceError);
        // Delete locally (soft delete)
        setMaterials(prev => 
          prev.map(material => 
            material.id === id 
              ? { ...material, is_active: false, updated_at: new Date().toISOString() } 
              : material
          )
        );
      }
    } catch (err) {
      console.error('Error deleting material:', err);
      throw err;
    }
  };

  // Load materials on component mount
  useEffect(() => {
    fetchMaterials();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading materials...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="font-bold">Error loading materials</p>
            </div>
            <p className="text-sm mb-4">{error}</p>
            <button 
              onClick={fetchMaterials}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Material Management</h1>
        <p className="text-gray-600 mt-1">
          Manage your scrap materials, pricing, and inventory settings
        </p>
      </div>

      <Materials
        materials={materials}
        onMaterialAdd={handleMaterialAdd}
        onMaterialUpdate={handleMaterialUpdate}
        onMaterialDelete={handleMaterialDelete}
      />
    </div>
  );
};

export default MaterialsPage;