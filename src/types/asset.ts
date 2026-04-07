import { User } from "./user";

export type AssetType = 
  | 'PC' | 'Server' | 'Printer' | 'Network' | 'Software' | 'Other'
  | 'server' | 'printer' | 'network' | 'software' | 'peripheral' | 'robot' | 'hmc' | 'san' | 'computer' | 'monitor';

export type AssetStatus = 
  | 'active' | 'broken' | 'maintenance' | 'retired'
  | 'available' | 'in-use' | 'under-repair' | 'disposed';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  serialNumber: string | null;
  status: AssetStatus;
  userId?: string | null;
  assignedToUser?: User | null;
  site?: string | null;
  projet?: string | null;
  fabricant?: string | null;
  produit?: string | null;
  modele?: string | null;
  purchaseDate?: string | null;
  tickets?: any[];
  createdAt?: string;
  updatedAt?: string;
}
