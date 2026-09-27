import { createSelector } from '@reduxjs/toolkit';

const globalSelector = (state) => state.global;

export const logedInSelector = createSelector([globalSelector], (global) => global.logedIn);
export const userSelector = createSelector([globalSelector], (global) => global.user);
export const isAdminSelector = createSelector([globalSelector], (global) => global.user?.role === 'admin');
