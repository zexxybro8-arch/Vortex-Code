import React from 'react';
import { AdminProvider, useAdmin } from '../../context/AdminContext';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminLayout } from './AdminLayout';

const AdminContent: React.FC = () => {
  const { adminUser } = useAdmin();

  if (!adminUser) {
    return <AdminLoginPage />;
  }

  return <AdminLayout />;
};

export const AdminContainer: React.FC = () => {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
};
