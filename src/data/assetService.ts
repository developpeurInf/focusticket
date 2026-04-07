import { Asset } from "@/types/asset";
import axios from "axios";

const API_URL = `/api`;

export const getAssets = async (filters?: any): Promise<{ assets: Asset[], pagination: any }> => {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.search) params.append('search', filters.search);

    const response = await axios.get(`${API_URL}/assets?${params.toString()}`);
    
    // Re-map format
    const assets = response.data.assets.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type || 'computer',
      serialNumber: a.serialNumber || '',
      projet: a.projet || '',
      fabricant: a.fabricant || '',
      produit: a.produit || '',
      modele: a.modele || '',
      site: a.site || '',
      location: a.site || '',
      assignedTo: a.assignedToUser ? a.assignedToUser.name : '',
      purchaseDate: a.purchaseDate ? new Date(a.purchaseDate).toISOString().split('T')[0] : '',
      status: a.status === 'active' ? 'in-use' : a.status === 'broken' ? 'under-repair' : 'available',
    }));

    return { assets, pagination: response.data.pagination };
  } catch (error) {
    console.error("Erreur API Assets:", error);
    return { assets: [], pagination: { total: 0, pages: 0, currentPage: 1, limit: 13 } };
  }
};

export const createAsset = async (assetData: Partial<Asset>): Promise<Asset> => {
  const response = await axios.post(`${API_URL}/assets`, assetData);
  return response.data;
};

export const updateAsset = async (id: string, assetData: Partial<Asset>): Promise<Asset> => {
  const response = await axios.put(`${API_URL}/assets/${id}`, assetData);
  return response.data;
};

export const deleteAsset = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/assets/${id}`);
};
