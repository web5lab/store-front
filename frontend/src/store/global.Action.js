import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export const Login = createAsyncThunk('global/login', async ({ username, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.auth.login({ username, password });
    localStorage.setItem('authToken', data.token);
    return data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const GetUserData = createAsyncThunk('global/getUserData', async (_, { rejectWithValue }) => {
  try {
    if (!localStorage.getItem('authToken')) return rejectWithValue('No session');
    return await api.auth.me();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});
