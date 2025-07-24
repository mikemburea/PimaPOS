// src/services/materialsService.ts - Enhanced with error handling
import { supabase } from '../lib/supabase';

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

interface CreateMaterialData extends MaterialFormData {
  is_active?: boolean;
  price_updated_at?: string;
}

interface UpdateMaterialData extends Partial<MaterialFormData> {
  price_updated_at?: string;
  updated_at?: string;
}

class MaterialsService {
  // Check if Supabase is available
  private isSupabaseAvailable(): boolean {
    try {
      return !!supabase && typeof supabase.from === 'function';
    } catch {
      return false;
    }
  }

  // Get all materials
  async getAll(): Promise<Material[]> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch materials: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in materialsService.getAll:', error);
      throw error;
    }
  }

  // Get material by ID
  async getById(id: string): Promise<Material | null> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new Error(`Failed to fetch material: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in materialsService.getById:', error);
      throw error;
    }
  }

  // Get active materials only
  async getActive(): Promise<Material[]> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch active materials: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in materialsService.getActive:', error);
      throw error;
    }
  }

  // Get materials by category
  async getByCategory(category: string): Promise<Material[]> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch materials by category: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in materialsService.getByCategory:', error);
      throw error;
    }
  }

  // Create a new material
  async create(materialData: MaterialFormData): Promise<Material> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const createData: CreateMaterialData = {
        ...materialData,
        is_active: true,
        price_updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('materials')
        .insert(createData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create material: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in materialsService.create:', error);
      throw error;
    }
  }

  // Update an existing material
  async update(id: string, materialData: MaterialFormData): Promise<Material> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const updateData: UpdateMaterialData = {
        ...materialData,
        price_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('materials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update material: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in materialsService.update:', error);
      throw error;
    }
  }

  // Update material price only
  async updatePrice(id: string, newPrice: number): Promise<Material> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const updateData = {
        current_price_per_kg: newPrice,
        price_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('materials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update material price: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in materialsService.updatePrice:', error);
      throw error;
    }
  }

  // Soft delete (deactivate) a material
  async delete(id: string): Promise<void> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { error } = await supabase
        .from('materials')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete material: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in materialsService.delete:', error);
      throw error;
    }
  }

  // Permanently delete a material (use with caution)
  async permanentDelete(id: string): Promise<void> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to permanently delete material: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in materialsService.permanentDelete:', error);
      throw error;
    }
  }

  // Reactivate a material
  async reactivate(id: string): Promise<Material> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('materials')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to reactivate material: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in materialsService.reactivate:', error);
      throw error;
    }
  }

  // Search materials
  async search(query: string): Promise<Material[]> {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to search materials: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in materialsService.search:', error);
      throw error;
    }
  }

  // Get material statistics
  async getStats() {
    try {
      if (!this.isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await supabase
        .from('materials')
        .select('category, current_price_per_kg, is_active');

      if (error) {
        throw new Error(`Failed to fetch material stats: ${error.message}`);
      }

      const materials = data || [];
      const stats = {
        total: materials.length,
        active: materials.filter(m => m.is_active).length,
        inactive: materials.filter(m => !m.is_active).length,
        categories: [...new Set(materials.map(m => m.category))].length,
        averagePrice: materials.length > 0 
          ? materials.reduce((sum, m) => sum + m.current_price_per_kg, 0) / materials.length 
          : 0,
        categoryBreakdown: materials.reduce((acc: Record<string, number>, material) => {
          acc[material.category] = (acc[material.category] || 0) + 1;
          return acc;
        }, {})
      };

      return stats;
    } catch (error) {
      console.error('Error in materialsService.getStats:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const materialsService = new MaterialsService();