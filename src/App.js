import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Container, Spinner } from 'react-bootstrap';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const CreateEvent = lazy(() => import('./components/CreateEvent'));
const EditEvent = lazy(() => import('./components/EditEvent'));
const Event = lazy(() => import('./components/Event'));
const ReservationForm = lazy(() => import('./components/ReservationForm'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const JoinEvent = lazy(() => import('./components/JoinEvent'));
const PrivateRoute = lazy(() => import('./components/PrivateRoute'));
const AdminUsers = lazy(() => import('./components/AdminUsers'));
const AccountSettings = lazy(() => import('./components/AccountSettings'));

// Loading component
const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
    <Spinner animation="border" role="status" variant="primary">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Container>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/join/:id" element={<JoinEvent />} />
              <Route path="/reservation/:id" element={<ReservationForm />} />

              {/* Protected Routes */}
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/create" element={<PrivateRoute><CreateEvent /></PrivateRoute>} />
              <Route path="/edit/:id" element={<PrivateRoute><EditEvent /></PrivateRoute>} />
              <Route path="/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
              <Route path="/event/:id" element={<PrivateRoute><Event /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><AccountSettings /></PrivateRoute>} />
            </Routes>
          </Suspense>
        </Container>
      </AuthProvider>
    </Router>
  );
}

export default App;