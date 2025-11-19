import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loginWithGoogle } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(email, password);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to log in: ' + err.message);
        }

        setLoading(false);
    }

    async function handleGoogleLogin() {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle('promoter'); // Role ignored if profile exists
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to log in with Google: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container className="d-flex align-items-center justify-content-center fade-in" style={{ minHeight: "100vh" }}>
            <div className="w-100" style={{ maxWidth: "420px" }}>
                <div className="text-center mb-5">
                    <h1 className="fw-bold display-5 text-gradient mb-2">Reservaciones</h1>
                    <p className="text-muted fs-5">Event Management System</p>
                </div>

                <Card className="glass-card border-0 shadow-lg">
                    <Card.Body className="p-5">
                        <div className="text-center mb-4">
                            <h3 className="fw-bold mb-1">Welcome Back</h3>
                            <p className="text-muted small">Please enter your details to sign in</p>
                        </div>

                        {error && <Alert variant="danger" className="border-0 bg-danger-subtle text-danger">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group id="email" className="mb-3">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    required
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                />
                            </Form.Group>
                            <Form.Group id="password" className="mb-4">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    required
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </Form.Group>
                            <Button disabled={loading} className="w-100 py-2 mb-3 btn-primary" type="submit">
                                Sign In
                            </Button>
                        </Form>

                        <div className="position-relative my-4">
                            <hr className="text-muted opacity-25" />
                            <span className="position-absolute top-50 start-50 translate-middle px-2 bg-white text-muted small" style={{ zIndex: 1 }}>
                                or continue with
                            </span>
                        </div>

                        <div className="w-100 text-center">
                            <Button variant="outline-secondary" className="w-100 py-2 d-flex align-items-center justify-content-center gap-2" onClick={handleGoogleLogin} disabled={loading}>
                                <i className="bi bi-google"></i> Google
                            </Button>
                        </div>
                    </Card.Body>
                    <Card.Footer className="bg-transparent border-0 text-center py-3">
                        <span className="text-muted small">Don't have an account? </span>
                        <Link to="/signup" className="text-decoration-none fw-semibold">Create account</Link>
                    </Card.Footer>
                </Card>

                <div className="text-center mt-4 text-muted small opacity-75">
                    &copy; {new Date().getFullYear()} Reservaciones Admin
                </div>
            </div>
        </Container>
    );
}
