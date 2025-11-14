export interface User {
  id: number;
  email: string;
  fullName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  tokenType: string;
}


