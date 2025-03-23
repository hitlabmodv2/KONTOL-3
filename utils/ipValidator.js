
import fetch from 'node-fetch';
import { networkInterfaces } from 'os';

export async function validateIpAndPhone(phoneNumber) {
  try {
    // Get local IP
    const nets = networkInterfaces();
    const results = Object.values(nets).flat();
    const ip = results.find(addr => !addr.internal && addr.family === 'IPv4')?.address || '';
    
    // Fetch authorized IPs and numbers from GitHub
    const response = await fetch('https://raw.githubusercontent.com/hitlabmodv2/IP_SC_BOT/refs/heads/main/IP_NUMBER.js');
    const text = await response.text();
    
    try {
      // Clean the text before parsing
      const cleanText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      const data = JSON.parse(cleanText);
      
      // Check if IP and phone combination exists
      const isAuthorized = Array.isArray(data) && data.some(entry => 
        entry && typeof entry === 'object' &&
        entry.ip === ip && entry.phone === phoneNumber
      );

      return {
        authorized: isAuthorized,
        ip: ip
      };
    } catch (parseError) {
      console.error('Failed to parse JSON response. Please check the data format.');
      return {
        authorized: false,
        ip: ip,
        error: 'Invalid data format - please contact administrator'
      };
    }
  } catch (error) {
    console.error('Validation error:', error);
    return {
      authorized: false,
      ip: ip,
      error: 'Network or system error - please try again later'
    };
  }
}
