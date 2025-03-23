
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
    const data = await response.json();
    
    // Check if IP and phone combination exists
    const isAuthorized = data.some(entry => 
      entry.ip === ip && entry.phone === phoneNumber
    );

    return {
      authorized: isAuthorized,
      ip: ip
    };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      authorized: false,
      ip: null
    };
  }
}
