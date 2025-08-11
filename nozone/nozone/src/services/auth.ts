import { supabase } from './supabase';
import { User } from '../types';
import { StorageService } from './storage';

export interface AuthResult {
  success: boolean;
  user?: User;
  message: string;
  usernameTaken?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  name: string;
}

// Database function result types - simplified and consistent
interface RegisterUserResult {
  user_id: string;
  username_taken: boolean;
  success: boolean;
  message: string;
}

interface AuthenticateUserResult {
  login_success: boolean;
  user_id: string;
  username: string;
  name: string;
  email: string | null;
  is_verified: boolean;
  last_active: string;
  created_at: string;
  message: string;
}

export class AuthService {
  // Test Supabase connection
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return false;
      }
      
      console.log('✅ Supabase connected successfully!');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection error:', error);
      return false;
    }
  }

  // Simplified username validation
  private static validateUsername(username: string): { valid: boolean; message: string } {
    const trimmed = username.trim().toLowerCase();
    
    if (trimmed.length < 3) {
      return { valid: false, message: 'Username must be at least 3 characters long' };
    }
    
    if (trimmed.length > 20) {
      return { valid: false, message: 'Username must be 20 characters or less' };
    }
    
    // Only allow alphanumeric characters and underscores
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }
    
    // Cannot start with a number
    if (/^[0-9]/.test(trimmed)) {
      return { valid: false, message: 'Username cannot start with a number' };
    }
    
    // Reserved usernames
    const reserved = ['admin', 'root', 'user', 'test', 'null', 'undefined', 'nozone', 'support', 'help'];
    if (reserved.includes(trimmed)) {
      return { valid: false, message: 'This username is reserved' };
    }
    
    return { valid: true, message: 'Username is valid' };
  }

  // Simplified password validation
  private static validatePassword(password: string): { valid: boolean; message: string } {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    
    if (password.length > 128) {
      return { valid: false, message: 'Password must be 128 characters or less' };
    }
    
    return { valid: true, message: 'Password is valid' };
  }

  // Check if username is available
  static async checkUsernameAvailability(username: string): Promise<{ available: boolean; message: string }> {
    try {
      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        return { available: false, message: 'Database connection failed' };
      }

      const validation = this.validateUsername(username);
      if (!validation.valid) {
        return { available: false, message: validation.message };
      }

      const trimmed = username.trim().toLowerCase();
      
      console.log('🔍 Checking username availability for:', trimmed);
      
      // Use the database function for checking username availability
      const { data, error } = await supabase
        .rpc('check_username_availability', { p_username: trimmed });

      if (error) {
        console.error('❌ Username availability check error:', error);
        return { available: false, message: 'Failed to check username availability' };
      }

      console.log('✅ Username availability result:', data);
      return { 
        available: data, 
        message: data ? 'Username is available' : 'Username is already taken' 
      };
    } catch (error) {
      console.error('❌ Failed to check username availability:', error);
      return { available: false, message: 'Failed to check username availability' };
    }
  }

  // Register a new user - SIMPLIFIED
  static async register(credentials: RegisterCredentials): Promise<AuthResult> {
    try {
      console.log('🔄 Starting registration process for:', credentials.username);

      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        return { success: false, message: 'Database connection failed. Please check your internet connection.' };
      }

      // Validate inputs
      const usernameValidation = this.validateUsername(credentials.username);
      if (!usernameValidation.valid) {
        console.log('❌ Username validation failed:', usernameValidation.message);
        return { success: false, message: usernameValidation.message };
      }

      const passwordValidation = this.validatePassword(credentials.password);
      if (!passwordValidation.valid) {
        console.log('❌ Password validation failed:', passwordValidation.message);
        return { success: false, message: passwordValidation.message };
      }

      if (!credentials.name.trim()) {
        return { success: false, message: 'Name is required' };
      }

      if (credentials.name.trim().length < 2) {
        return { success: false, message: 'Name must be at least 2 characters long' };
      }

      // Check username availability
      console.log('🔍 Checking username availability...');
      const availability = await this.checkUsernameAvailability(credentials.username);
      if (!availability.available) {
        console.log('❌ Username not available:', availability.message);
        return { 
          success: false, 
          message: availability.message,
          usernameTaken: true 
        };
      }

      console.log('📝 Calling register_user function...');
      // Use the register_user function that handles bcrypt hashing
      const { data: registerResult, error: registerError } = await supabase
        .rpc('register_user', {
          p_name: credentials.name.trim(),
          p_username: credentials.username.trim().toLowerCase(),
          p_password: credentials.password, // Raw password - function will hash it
          p_email: null,
          p_phone: null
        });

      if (registerError) {
        console.error('❌ Registration RPC error:', registerError);
        return {
          success: false,
          message: `Registration failed: ${registerError.message}`
        };
      }

      console.log('📊 Registration RPC result:', registerResult);

      if (!registerResult || !Array.isArray(registerResult) || registerResult.length === 0) {
        console.error('❌ Empty or invalid registration result');
        return {
          success: false,
          message: 'Registration failed: Invalid response from server'
        };
      }

      const result = registerResult[0] as RegisterUserResult;
      console.log('📋 Parsed registration result:', result);

      if (!result || !result.success) {
        console.log('❌ Registration unsuccessful:', result?.message);
        return {
          success: false,
          message: result?.message || 'Registration failed',
          usernameTaken: result?.username_taken || false
        };
      }

      console.log('✅ Registration successful, fetching user data...');
      // Get the complete user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, name, email, phone, is_verified, last_active, created_at')
        .eq('id', result.user_id)
        .single();

      if (userError || !userData) {
        console.error('❌ Failed to fetch user data:', userError);
        return {
          success: false,
          message: 'Registration completed but failed to fetch user data'
        };
      }

      console.log('👤 User data fetched:', userData);

      const user: User = {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        isVerified: userData.is_verified,
        lastActive: userData.last_active ? new Date(userData.last_active) : undefined,
        createdAt: new Date(userData.created_at)
      };

      // Store user data locally
      await StorageService.storeUser(user);
      console.log('💾 User data stored locally');

      return {
        success: true,
        user,
        message: 'Account created successfully!'
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        message: `Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Login with username and password - SIMPLIFIED with DEBUG
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('🔄 Starting login process for:', credentials.username);

      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        return { success: false, message: 'Database connection failed. Please check your internet connection.' };
      }

      // Validate inputs
      if (!credentials.username.trim()) {
        return { success: false, message: 'Username is required' };
      }

      if (!credentials.password) {
        return { success: false, message: 'Password is required' };
      }

      const trimmedUsername = credentials.username.trim().toLowerCase();
      console.log('🔑 Attempting login with username:', trimmedUsername);

      // Use the authenticate_user function that handles bcrypt verification
      const { data: loginResult, error: loginError } = await supabase
        .rpc('authenticate_user', {
          p_username_or_email: trimmedUsername,
          p_password: credentials.password // Raw password - function will verify with bcrypt
        });

      if (loginError) {
        console.error('❌ Login RPC error:', loginError);
        return {
          success: false,
          message: `Login failed: ${loginError.message}`
        };
      }

      console.log('📊 Login RPC result:', loginResult);

      if (!loginResult || !Array.isArray(loginResult) || loginResult.length === 0) {
        console.error('❌ Empty or invalid login result');
        return {
          success: false,
          message: 'Login failed: Invalid response from server'
        };
      }

      const result = loginResult[0] as AuthenticateUserResult;
      console.log('📋 Parsed login result:', result);

      if (!result || !result.login_success) {
        console.log('❌ Login unsuccessful:', result?.message);
        return {
          success: false,
          message: result?.message || 'Invalid username or password'
        };
      }

      console.log('✅ Login successful, creating user object...');
      const user: User = {
        id: result.user_id,
        username: result.username,
        name: result.name,
        email: result.email || undefined, // Convert null to undefined
        isVerified: result.is_verified,
        lastActive: result.last_active ? new Date(result.last_active) : undefined,
        createdAt: new Date(result.created_at)
      };

      console.log('👤 User object created:', user);

      // Store user data locally
      await StorageService.storeUser(user);
      console.log('💾 User data stored locally');

      return {
        success: true,
        user,
        message: result.message
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get user by username (for forgot password, etc.)
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      console.log('🔍 Getting user by username:', username);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, email, phone, is_verified, last_active, created_at')
        .eq('username', username.trim().toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('👤 User not found:', username);
          return null;
        }
        console.error('❌ Error getting user by username:', error);
        throw error;
      }

      console.log('✅ User found:', data);
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        isVerified: data.is_verified,
        lastActive: data.last_active ? new Date(data.last_active) : undefined,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('❌ Failed to get user by username:', error);
      return null;
    }
  }

  // Test function to check if authentication is working
  static async testAuth(): Promise<{ connectionOk: boolean; functionsWork: boolean; message: string }> {
    try {
      console.log('🧪 Testing authentication system...');
      
      // Test connection
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        return { connectionOk: false, functionsWork: false, message: 'Database connection failed' };
      }

      // Test if functions exist
      try {
        await supabase.rpc('check_username_availability', { p_username: 'test_nonexistent_user_12345' });
        console.log('✅ check_username_availability function works');
      } catch (error) {
        console.error('❌ check_username_availability function failed:', error);
        return { connectionOk: true, functionsWork: false, message: 'Username availability function not found' };
      }

      try {
        await supabase.rpc('authenticate_user', { p_username_or_email: 'test', p_password: 'test' });
        console.log('✅ authenticate_user function works');
      } catch (error) {
        console.error('❌ authenticate_user function failed:', error);
        return { connectionOk: true, functionsWork: false, message: 'Authentication function not found' };
      }

      return { connectionOk: true, functionsWork: true, message: 'All systems working' };
    } catch (error) {
      console.error('❌ Test auth error:', error);
      return { connectionOk: false, functionsWork: false, message: 'Test failed' };
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: { name?: string }): Promise<AuthResult> {
    try {
      if (updates.name && updates.name.trim().length < 2) {
        return { success: false, message: 'Name must be at least 2 characters long' };
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name) {
        updateData.name = updates.name.trim();
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      const user: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        isVerified: data.is_verified,
        lastActive: data.last_active ? new Date(data.last_active) : undefined,
        createdAt: new Date(data.created_at)
      };

      // Update stored user data
      await StorageService.storeUser(user);

      return {
        success: true,
        user,
        message: 'Profile updated successfully!'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Failed to update profile. Please try again.'
      };
    }
  }

  // Logout
  static async logout(): Promise<void> {
    try {
      // Clear stored user data
      await StorageService.clearUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Get current user from storage
  static async getCurrentUser(): Promise<User | null> {
    try {
      return await StorageService.getUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // Update user last active time
  static async updateLastActive(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update last active:', error);
    }
  }
}
