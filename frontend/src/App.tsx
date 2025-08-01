import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { checkAuth } from './store/slices/authSlice';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingSpinner from './components/ui/LoadingSpinner';

import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PromptEditorPage from './pages/PromptEditorPage';
import GalleryPage from './pages/GalleryPage';
import StudioPage from './pages/StudioPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col anime-bg-pattern">
      <Navbar />
      
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create" 
            element={
              <ProtectedRoute>
                <PromptEditorPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gallery" 
            element={
              <ProtectedRoute>
                <GalleryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/studio/:outputId" 
            element={
              <ProtectedRoute>
                <StudioPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;