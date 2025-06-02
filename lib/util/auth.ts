// utils/auth.ts
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken'); 
  }
  return null;
};

export const getUserIdFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    // Remove 'Bearer ' prefix if present
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    // Split token and decode payload
    const payload = JSON.parse(atob(actualToken.split('.')[1]));
    
    // Try different possible user ID fields based on your auth.py
    return payload.user_id ||  // From create_admin_token
           payload.sub ||      // Could be email (from create_access_token)
           payload.userId ||   // Alternative field
           null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getUserRoleFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = JSON.parse(atob(actualToken.split('.')[1]));
    return payload.role || null; // From create_admin_token
  } catch (error) {
    console.error('Error decoding token role:', error);
    return null;
  }
};

export const isSuperAdminFromToken = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = JSON.parse(atob(actualToken.split('.')[1]));
    return payload.is_super_admin || false; // From create_admin_token
  } catch (error) {
    console.error('Error decoding super admin status:', error);
    return false;
  }
};