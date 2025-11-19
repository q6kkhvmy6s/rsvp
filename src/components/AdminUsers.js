import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Double check admin role
        if (userProfile && userProfile.role !== 'admin') {
            navigate('/');
            return;
        }

        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(userList);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load users.");
            } finally {
                setLoading(false);
            }
        };

        if (userProfile) {
            fetchUsers();
        }
    }, [userProfile, navigate]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateDoc(doc(db, 'users', userId), {
                role: newRole
            });

            // Update local state
            setUsers(users.map(user =>
                user.id === userId ? { ...user, role: newRole } : user
            ));
        } catch (err) {
            console.error("Error updating role:", err);
            setError("Failed to update user role.");
        }
    };

    if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

    return (
        <Container className="my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">User Management</h2>
                <Button variant="outline-secondary" onClick={() => navigate('/')}>Back to Dashboard</Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <div className="glass-card p-4">
                <Table responsive hover className="mb-0">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="align-middle">{user.username}</td>
                                <td className="align-middle">{user.email}</td>
                                <td className="align-middle">
                                    <Badge bg={user.role === 'admin' ? 'primary' : 'secondary'}>
                                        {user.role}
                                    </Badge>
                                </td>
                                <td className="align-middle">
                                    {user.role !== 'admin' ? (
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleRoleChange(user.id, 'admin')}
                                        >
                                            Make Admin
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => handleRoleChange(user.id, 'promoter')}
                                            disabled={user.id === userProfile.uid} // Prevent demoting yourself
                                        >
                                            Make Promoter
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
}
