
import fetch from 'node-fetch';
import { networkInterfaces } from 'os';

export async function validateIpAndPhone(phoneNumber) {
  try {
    // Get local IP
    const nets = networkInterfaces();
    const results = Object.values(nets).flat();
    const ip = results.find(addr => !addr.internal && addr.family === 'IPv4')?.address || '';
    
    // Validate phone number format
    if (!/^\d{10,15}$/.test(phoneNumber)) {
      return {
        authorized: false,
        ip: ip,
        error: 'Invalid phone number format'
      };
    }

    // Fetch authorized IPs and numbers from GitHub
    const response = await fetch('https://raw.githubusercontent.com/hitlabmodv2/IP_SC_BOT/main/IP_NUMBER.js');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const text = await response.text();
    
    try {
      // Remove any comments or invalid characters
      const cleanText = text
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .trim();

      // Attempt to parse the JSON
      const data = JSON.parse(cleanText);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data structure');
      }

      // Check if IP and phone combination exists
      const isAuthorized = data.some(entry => 
        entry && typeof entry === 'object' &&
        entry.ip === ip && entry.phone === phoneNumber
      );

      return {
        authorized: isAuthorized,
        ip: ip
      };
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError.message);
      return {
        authorized: false,
        ip: ip,
        error: 'Server configuration error - please try again later'
      };
    }
  } catch (error) {
    console.error('Validation error:', error.message);
    return {
      authorized: false,
      ip: ip,
      error: 'Network error - please check your connection'
    };
  }
}
