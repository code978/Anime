import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';
import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd?: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: Cookies.get('auth_token') || null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = Cookies.get('auth_token');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await authAPI.me();
      return { user: response.data.user, token };
    } catch (error: any) {
      Cookies.remove('auth_token');
      return rejectWithValue(error.response?.data?.error?.message || 'Authentication failed');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { login: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      
      Cookies.set('auth_token', token, { expires: 7, secure: true, sameSite: 'strict' });
      
      return { user, token };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      
      Cookies.set('auth_token', token, { expires: 7, secure: true, sameSite: 'strict' });
      
      return { user, token };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      Cookies.remove('auth_token');
      return true;
    } catch (error: any) {
      Cookies.remove('auth_token');
      return rejectWithValue(error.response?.data?.error?.message || 'Logout failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;