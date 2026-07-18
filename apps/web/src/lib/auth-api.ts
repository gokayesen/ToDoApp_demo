import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@todoapp/shared';

import { apiFetch, setAccessToken } from './api-client';

export async function register(input: RegisterRequest) {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function login(input: LoginRequest) {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  setAccessToken(null);
}

export function forgotPassword(input: ForgotPasswordRequest) {
  return apiFetch<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(input) });
}

export function resetPassword(input: ResetPasswordRequest) {
  return apiFetch<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(input) });
}

export async function refreshSession() {
  const data = await apiFetch<AuthResponse>('/auth/refresh', { method: 'POST' });
  setAccessToken(data.accessToken);
  return data;
}
