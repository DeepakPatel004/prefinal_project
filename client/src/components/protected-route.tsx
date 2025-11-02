import { useAuth } from '@/lib/authContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

type Props = {
  children: React.ReactNode;
  roles?: ('admin' | 'official' | 'citizen')[];
};

export function ProtectedRoute({ children, roles }: Props) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation('/login');
        return;
      }

      if (roles && !roles.includes(user.role)) {
        // Redirect based on role
        switch (user.role) {
          case 'admin':
            setLocation('/admin');
            break;
          case 'official':
            setLocation('/official');
            break;
          case 'citizen':
            setLocation('/dashboard');
            break;
          default:
            setLocation('/login');
        }
      }
    }
  }, [user, loading, roles, setLocation]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (roles && !roles.includes(user.role)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}