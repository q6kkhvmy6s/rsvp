import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CreateEvent from './components/CreateEvent';
import EditEvent from './components/EditEvent';
import Event from './components/Event';
import ReservationForm from './components/ReservationForm';
import Login from './components/Login';
import Signup from './components/Signup';
import JoinEvent from './components/JoinEvent';
import PrivateRoute from './components/PrivateRoute';
import AdminUsers from './components/AdminUsers';
import AccountSettings from './components/AccountSettings';
import { AuthProvider } from './contexts/AuthContext';
import { Container } from 'react-bootstrap';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Container>
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
        </Container>
      </AuthProvider>
    </Router>
  );
}

export default App;