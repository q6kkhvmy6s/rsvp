import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function AccountSettings() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // For re-auth (if needed, though we might skip complex re-auth UI for this MVP unless it errors)
    // Firebase throws 'auth/requires-recent-login' if the user hasn't logged in recently.

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        try {
            setError('');
            setMessage('');
            setLoading(true);
            await updatePassword(currentUser, password);
            setMessage('Password updated successfully');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                setError('For security, please log out and log back in to change your password.');
            } else {
                setError('Failed to update password: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setError('');
            setLoading(true);

            // 1. Delete user data from Firestore
            await deleteDoc(doc(db, 'users', currentUser.uid));

            // 2. Delete user from Firebase Auth
            await deleteUser(currentUser);

            // Redirect is handled by AuthContext or App state change usually, but let's force it
            navigate('/login');
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                setError('For security, please log out and log back in to delete your account.');
                setShowDeleteModal(false);
            } else {
                setError('Failed to delete account: ' + err.message);
                setShowDeleteModal(false);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="my-4" style={{ maxWidth: '600px' }}>
            <h2 className="mb-4">Account Settings</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}

            <Card className="glass-card border-0 mb-4">
                <Card.Body>
                    <h4 className="mb-3">Change Password</h4>
                    <Form onSubmit={handlePasswordChange}>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </Form.Group>
                        <Button disabled={loading} type="submit" variant="primary">
                            Update Password
                        </Button>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="glass-card border-0 border-danger">
                <Card.Body>
                    <h4 className="text-danger mb-3">Danger Zone</h4>
                    <p>Once you delete your account, there is no going back. Please be certain.</p>
                    <Button variant="danger" onClick={() => setShowDeleteModal(true)} disabled={loading}>
                        Delete Account
                    </Button>
                </Card.Body>
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Delete Account</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete your account? This action cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteAccount} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete Forever'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
