import axios from 'axios';
import { User } from '@/types/user';

const API_URL = `/api`;

export const getUsers = async (filters?: any): Promise<{ users: User[], pagination: any }> => {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.search) params.append('search', filters.search);

    const response = await axios.get(`${API_URL}/users?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.warn("Erreur API Users:", error);
    return { users: [], pagination: { total: 0, pages: 0, currentPage: 1, limit: 13 } };
  }
};

export const createUser = async (userData: Partial<User>): Promise<User> => {
  try {
    const response = await axios.post(`${API_URL}/users`, userData);
    return response.data;
  } catch (error) {
    console.error("Erreur création User:", error);
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/users/${id}`);
  } catch (error) {
    console.error("Erreur suppression User:", error);
    throw error;
  }
};

export const updateUserStatus = async (id: string, status: string): Promise<User> => {
  try {
    const response = await axios.put(`${API_URL}/users/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("Erreur mise à jour statut User:", error);
    throw error;
  }
};

export const updateUserInfo = async (id: string, userData: Partial<User>): Promise<User> => {
  try {
    const response = await axios.put(`${API_URL}/users/${id}`, userData);
    return response.data;
  } catch (error) {
    console.error("Erreur modification User:", error);
    throw error;
  }
};
