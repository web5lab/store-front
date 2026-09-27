import { createSlice } from '@reduxjs/toolkit';
import { GetUserData, Login } from './global.Action';

/**
 * Redux holds one thing: who is signed in. Server data (products, invoices,
 * ledgers) is fetched where it is shown, through src/lib/api.js, so no screen
 * ever renders yesterday's cached numbers.
 */
const initialState = {
  logedIn: false,
  user: null,
};

export const globalSlice = createSlice({
  name: 'globalState',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('authToken');
      state.logedIn = false;
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(Login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.logedIn = true;
      })
      .addCase(GetUserData.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.logedIn = true;
      });
    /* A failed re-check is not a sign-out: the server may just be restarting.
       Real rejections (401) arrive through the auth:expired event instead. */
  },
});

export const { logout } = globalSlice.actions;
export default globalSlice.reducer;
