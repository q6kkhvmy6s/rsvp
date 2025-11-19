import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const { signup, loginWithGoogle } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        try {
            setError('');
            setLoading(true);
            await signup(email, password, username, 'promoter'); // Default to promoter
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to create an account: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignup() {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle('promoter'); // Default to promoter
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to sign up with Google: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container className="d-flex align-items-center justify-content-center fade-in" style={{ minHeight: "100vh" }}>
            <div className="w-100" style={{ maxWidth: "400px" }}>
                <Card className="glass-card border-0">
                    <Card.Body className="p-4">
                        <div className="text-center mb-4">
                            <h2 className="fw-bold">Create Account</h2>
                            <p className="text-muted">Start managing your events today</p>
                        </div>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group id="username">
                                <Form.Label>Username</Form.Label>
                                <Form.Control type="text" required onChange={(e) => setUsername(e.target.value)} />
                            </Form.Group>
                            <Form.Group id="email">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" required onChange={(e) => setEmail(e.target.value)} />
                            </Form.Group>
                            <Form.Group id="password">
                                <Form.Label>Password</Form.Label>
                                <Form.Control type="password" required onChange={(e) => setPassword(e.target.value)} />
                            </Form.Group>
                            <Button disabled={loading} className="w-100 mt-4" type="submit">
                                Sign Up
                            </Button>
                        </Form>
                        <div className="w-100 text-center mt-3">
                            <Button variant="outline-danger" className="w-100" onClick={handleGoogleSignup} disabled={loading}>
                                <i className="bi bi-google me-2"></i> Sign up with Google
                            </Button>
                        </div>
                        <div className="w-100 text-center mt-3">
                            <Link to="/login">Already have an account? Log In</Link>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
}
