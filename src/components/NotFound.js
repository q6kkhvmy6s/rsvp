import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';

const NotFound = () => {
    return (
        <Container className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <div className="glass-card p-5 text-center" style={{ maxWidth: '600px', width: '100%' }}>
                <h1 className="display-1 fw-bold text-gradient mb-3">404</h1>
                <h2 className="h3 mb-4 text-dark">Page Not Found</h2>
                <p className="text-muted mb-5">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <Link to="/">
                    <Button variant="primary" className="btn-primary btn-lg">
                        <i className="bi bi-house-door me-2"></i>
                        Back to Home
                    </Button>
                </Link>
            </div>
        </Container>
    );
};

export default NotFound;
