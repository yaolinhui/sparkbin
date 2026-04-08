// 临时脚本，用于更新 api.ts
import * as fs from 'fs';

const content = fs.readFileSync('./src/services/api.ts', 'utf8');

const oldHeader = `// Backend API Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token 管理
let authToken: string | null = localStorage.getItem('sparkbin_token');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('sparkbin_token', token);
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('sparkbin_token');
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return !!authToken;
}`;

const newHeader = `// Backend API Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token 和角色管理
let authToken: string | null = localStorage.getItem('sparkbin_token');
let userRole: string | null = localStorage.getItem('sparkbin_role');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('sparkbin_token', token);
  // 从 JWT 中解析角色
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userRole = payload.role || 'user';
    localStorage.setItem('sparkbin_role', userRole);
  } catch {
    userRole = 'user';
  }
}

export function clearAuthToken() {
  authToken = null;
  userRole = null;
  localStorage.removeItem('sparkbin_token');
  localStorage.removeItem('sparkbin_role');
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return !!authToken;
}

export function isAdmin(): boolean {
  return userRole === 'admin';
}

export function getUserRole(): string {
  return userRole || 'user';
}`;

const newContent = content.replace(oldHeader, newHeader);

fs.writeFileSync('./src/services/api.ts', newContent);
console.log('Updated api.ts');
