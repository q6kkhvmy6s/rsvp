import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { formatDate } from '../utils';
import PageLoader from './PageLoader';

export default function JoinEvent() {
    const { id } = useParams(); // Event ID
    const { currentUser, userProfile, signup, loginWithGoogle, logout } = useAuth();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state for new users
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const eventDoc = await getDoc(doc(db, 'events', id));
                if (eventDoc.exists()) {
                    const eventData = { id: eventDoc.id, ...eventDoc.data() };
                    setEvent(eventData);
                    document.title = eventData.title;
                } else {
                    setError('Event not found');
                }
            } catch (err) {
                setError('Failed to load event');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();

        return () => {
            document.title = 'Reservaciones';
        };
    }, [id]);

    const handleJoin = async () => {
        if (!currentUser) return;
        setSubmitting(true);
        try {
            // Add user to event's promoters list
            await updateDoc(doc(db, 'events', id), {
                promoters: arrayUnion(currentUser.uid)
            });

            // Add event to user's events list (if not already there - though we store it in profile for quick access if needed, 
            // but mainly we rely on the event's promoters array or querying events where promoters contains uid)
            // Let's update the user profile too for redundancy/ease
            await updateDoc(doc(db, 'users', currentUser.uid), {
                events: arrayUnion(id),
                role: 'promoter' // Ensure they have promoter role (or keep admin if they are admin)
            });

            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to join event: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleJoin = async () => {
        setSubmitting(true);
        try {
            const res = await loginWithGoogle('promoter');
            const uid = res.user.uid;

            // Add user to event's promoters list
            await updateDoc(doc(db, 'events', id), {
                promoters: arrayUnion(uid)
            });

            // Update user profile with event
            await updateDoc(doc(db, 'users', uid), {
                events: arrayUnion(id)
            });

            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to join with Google: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignupAndJoin = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Create account as promoter
            const res = await signup(email, password, username, 'promoter');
            const uid = res.user.uid;

            // Add user to event's promoters list
            await updateDoc(doc(db, 'events', id), {
                promoters: arrayUnion(uid)
            });

            // Update user profile with event
            await updateDoc(doc(db, 'users', uid), {
                events: arrayUnion(id)
            });

            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to create account and join: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
            <div className="w-100" style={{ maxWidth: "500px" }}>
                <Card className="glass-card border-0">
                    <Card.Body className="p-4">
                        <h2 className="text-center mb-4 fw-bold">Join Event Team</h2>
                        <div className="text-center mb-4">
                            <h5>{event.title}</h5>
                            <p className="text-muted">{formatDate(event.time)}</p>
                        </div>

                        {currentUser ? (
                            <div className="text-center">
                                <p>You are logged in as <strong>{userProfile?.username || currentUser.email}</strong>.</p>
                                <Button onClick={handleJoin} disabled={submitting} className="w-100">
                                    {submitting ? <Spinner size="sm" animation="border" /> : 'Join as Promoter'}
                                </Button>
                                <div className="mt-3">
                                    <small>Not you? <span className="text-primary" style={{ cursor: 'pointer' }} onClick={handleLogout}>Log out</span></small>
                                </div>
                            </div>
                        ) : (
                            <Form onSubmit={handleSignupAndJoin}>
                                <Alert variant="info">Create an account to become a promoter for this event.</Alert>
                                <Form.Group id="username" className="mb-3">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control type="text" required onChange={(e) => setUsername(e.target.value)} />
                                </Form.Group>
                                <Form.Group id="email" className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control type="email" required onChange={(e) => setEmail(e.target.value)} />
                                </Form.Group>
                                <Form.Group id="password" className="mb-3">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control type="password" required onChange={(e) => setPassword(e.target.value)} />
                                </Form.Group>
                                <Button disabled={submitting} className="w-100" type="submit">
                                    Create Account & Join
                                </Button>
                                <div className="w-100 text-center mt-3">
                                    <Button variant="outline-danger" className="w-100" onClick={handleGoogleJoin} disabled={submitting}>
                                        <i className="bi bi-google me-2"></i> Join with Google
                                    </Button>
                                </div>
                                <div className="w-100 text-center mt-3">
                                    <Link to="/login">Already have an account? Log In</Link>
                                </div>
                            </Form>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
}
