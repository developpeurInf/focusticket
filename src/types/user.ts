
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'intervenant' | 'demandeur' | 'tech' | 'user';
  department?: string;
  status: 'active' | 'inactive' | 'pending';
  lastActive?: string;
  avatar?: string;
  ticketsAssigned?: number;
  ticketsResolved?: number;
}

export interface UserResponse {
  data: User[];
  totalCount: number;
}

export interface SingleUserResponse {
  data: User;
}
