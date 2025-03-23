
import fetch from 'node-fetch';
import { networkInterfaces } from 'os';

export async function validateIpAndPhone(phoneNumber) {
  try {
    // Get client IP from environment or generate a unique one
    const clientIp = process.env.CLIENT_IP || `172.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    
    // Use the dynamic IP
    const currentIp = clientIp;

    // Validate phone number format
    if (!/^\d{10,15}$/.test(phoneNumber)) {
      return {
        authorized: false,
        ip: currentIp,
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
      // Clean the text before parsing
      const cleanText = text
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();

      const data = JSON.parse(cleanText);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data structure');
      }

      // Check if any of our IPs match with the phone number
      const isAuthorized = data.some(entry => 
        entry && 
        typeof entry === 'object' &&
        validIps.includes(entry.ip) && 
        entry.phone === phoneNumber
      );

      return {
        authorized: isAuthorized,
        ip: currentIp
      };
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError.message);
      return {
        authorized: false,
        ip: currentIp,
        error: 'Server configuration error - please try again later'
      };
    }
  } catch (error) {
    console.error('Validation error:', error.message);
    return {
      authorized: false,
      ip: '',
      error: 'Network error - please check your connection'
    };
  }
}
