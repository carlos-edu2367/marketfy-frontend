import { useContext } from 'react';
import { AuthContext } from '../context/AuthContextDefinition';

export function useAuth() {
  return useContext(AuthContext);
}
