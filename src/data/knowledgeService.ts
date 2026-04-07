import axios from "axios";

const API_URL = `/api`;

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  author?: string;
  views: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const getKnowledgeArticles = async (): Promise<KnowledgeArticle[]> => {
  try {
    const response = await axios.get(`${API_URL}/knowledge`);
    return response.data;
  } catch (error) {
    console.warn("API Error (Knowledge base):", error);
    return [];
  }
};

export const createKnowledgeArticle = async (article: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> => {
  const response = await axios.post(`${API_URL}/knowledge`, article);
  return response.data;
};

export const updateKnowledgeArticle = async (id: string, article: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> => {
  const response = await axios.put(`${API_URL}/knowledge/${id}`, article);
  return response.data;
};

export const deleteKnowledgeArticle = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/knowledge/${id}`);
};
