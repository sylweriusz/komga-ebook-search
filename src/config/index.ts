/**
 * Configuration - Environment Setup
 * 
 * Central configuration management. No hardcoded secrets, 
 * no scattered configuration. Just clean, typed setup.
 */

export interface KomgaConfig {
  url: string;
  username: string;
  password: string;
  defaultLibrary: string;
}

export interface ServerConfig {
  name: string;
  version: string;
}

// Configuration validation
export function loadKomgaConfig(): KomgaConfig {
  const config = {
    url: process.env.KOMGA_URL || 'http://localhost:25600',
    username: process.env.KOMGA_USERNAME || '',
    password: process.env.KOMGA_PASSWORD || '',
    defaultLibrary: process.env.KOMGA_LIBRARY || ''
  };

  if (!config.username || !config.password) {
    throw new Error('KOMGA_USERNAME and KOMGA_PASSWORD must be configured');
  }

  return config;
}

export function getServerConfig(): ServerConfig {
  return {
    name: 'mcp-search-ebooks',
    version: '0.3.0'
  };
}
export function isConfigured(): boolean {
  try {
    loadKomgaConfig();
    return true;
  } catch {
    return false;
  }
}
