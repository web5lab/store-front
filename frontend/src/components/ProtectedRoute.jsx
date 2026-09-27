import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { GetUserData } from '@/store/global.Action';
import { logout } from '@/store/global.Slice';
import { userSelector } from '@/store/global.Selector';

/**
 * Signed in = a token in localStorage and a user in the store. The account is
 * re-checked once per load so a deactivated user is sent out promptly, and any
 * 401 from the API (see axiosInstance) signs the person out everywhere.
 */
export function ProtectedRoute({ children }) {
  const user = useSelector(userSelector);
  const dispatch = useDispatch();
  const location = useLocation();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    if (token) dispatch(GetUserData());
  }, [dispatch, token]);

  useEffect(() => {
    const onExpired = () => dispatch(logout());
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [dispatch]);

  if (!token || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
