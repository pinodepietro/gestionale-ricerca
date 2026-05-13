// frontend/src/types/auth.ts
import type { Ruolo } from '../config/constants';

export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: Ruolo;
  deve_cambiare_password?: boolean;
}

export interface JwtPayload {
  sub: string;       // persona_id
  email: string;
  ruolo: Ruolo;
  exp: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}
