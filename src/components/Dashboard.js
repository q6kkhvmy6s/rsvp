import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Button, Card, Row, Col, Spinner, Form, Badge } from 'react-bootstrap';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, getEventColor } from '../utils';

const EventPlaceholder = ({ title }) => {
  return (
    <div
      className="d-flex align-items-center justify-content-center p-4"
      style={{
        background: getEventColor(title),
        color: 'white',
        height: '200px',
        textAlign: 'center',
        fontSize: '1.75rem',
        fontWeight: '800',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        letterSpacing: '-0.02em',
      }}
    >
      {title}
    </div>
  );
};

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'reservations'
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userProfile) return;

      try {
        const eventsCollection = collection(db, 'events');
        let q;

        if (userProfile.role === 'admin') {
          // Admin sees all events
          q = query(eventsCollection, orderBy('createdAt', 'desc'));
        } else {
          // Promoter sees only events they are attached to
          q = query(eventsCollection, where('promoters', 'array-contains', userProfile.uid));
        }

        const eventSnapshot = await getDocs(q);
        let eventList = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch reservation counts for each event
        const eventsWithCounts = await Promise.all(
          eventList.map(async (event) => {
            const reservationsCol = collection(db, 'events', event.id, 'reservations');
            const reservationsSnapshot = await getDocs(reservationsCol);
            return {
              ...event,
              reservationCount: reservationsSnapshot.size
            };
          })
        );

        setEvents(eventsWithCounts);
      } catch (error) {
        console.error("Error fetching events: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  // Sort events based on selected criteria
  const sortedEvents = [...events].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'reservations':
        return (b.reservationCount || 0) - (a.reservationCount || 0);
      case 'date':
      default:
        return b.createdAt - a.createdAt;
    }
  });

  // Filter events into Active and Past/Disabled
  const activeEvents = sortedEvents.filter(e => e.status !== 'disabled');
  const pastEvents = sortedEvents.filter(e => e.status === 'disabled');

  return (
    <Container className="page-container fade-in">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
        <div>
          <h1 className="display-5 mb-1 fw-bold text-gradient">Dashboard</h1>
          <p className="text-muted mb-0 fs-5">
            Welcome back, <span className="fw-semibold text-dark">{userProfile?.username}</span>
            <Badge bg="light" text="dark" className="ms-2 border">
              {userProfile?.role?.toUpperCase()}
            </Badge>
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <Form.Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto', minWidth: '160px' }}
            className="shadow-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="reservations">Sort by Reservations</option>
          </Form.Select>

          {userProfile?.role === 'admin' && (
            <>
              <Button as={Link} to="/users" variant="outline-secondary" className="d-flex align-items-center">
                <i className="bi bi-people me-2"></i> Users
              </Button>
              <Button as={Link} to="/create" variant="primary" className="d-flex align-items-center shadow-sm">
                <i className="bi bi-plus-lg me-2"></i> New Event
              </Button>
            </>
          )}

          <div className="vr mx-2 d-none d-md-block"></div>

          <Button as={Link} to="/settings" variant="light" className="btn-icon rounded-circle border" title="Settings">
            <i className="bi bi-gear-fill text-muted"></i>
          </Button>
          <Button variant="light" className="btn-icon rounded-circle border" onClick={handleLogout} title="Log Out">
            <i className="bi bi-box-arrow-right text-danger"></i>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="text-muted mt-3">Loading your events...</p>
        </div>
      ) : (
        <>
          {/* Stats Row (Optional - can be expanded later) */}
          <Row className="mb-4 g-3">
            <Col xs={6} md={3}>
              <Card className="glass-card border-0 h-100 p-3 text-center">
                <h3 className="fw-bold text-primary mb-0">{activeEvents.length}</h3>
                <small className="text-muted fw-bold">Active Events</small>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="glass-card border-0 h-100 p-3 text-center">
                <h3 className="fw-bold text-success mb-0">
                  {activeEvents.reduce((acc, curr) => acc + (curr.reservationCount || 0), 0)}
                </h3>
                <small className="text-muted fw-bold">Total Reservations</small>
              </Card>
            </Col>
          </Row>

          <h4 className="mb-4 fw-bold text-dark border-bottom pb-2">Active Events</h4>

          {activeEvents.length === 0 && (
            <div className="text-center py-5 glass-card">
              <div className="mb-3 text-muted" style={{ fontSize: '3rem' }}><i className="bi bi-calendar-x"></i></div>
              <h4>No active events found</h4>
              <p className="text-muted">Get started by creating a new event.</p>
              {userProfile?.role === 'admin' && (
                <Button as={Link} to="/create" variant="primary" className="mt-2">
                  Create Event
                </Button>
              )}
            </div>
          )}

          <Row className="g-4">
            {activeEvents.map(event => (
              <Col md={6} lg={4} key={event.id}>
                <Card as={Link} to={`/event/${event.id}`} className="h-100 glass-card border-0 overflow-hidden text-decoration-none text-dark">
                  <div className="position-relative">
                    {event.imageUrl === 'placeholder' || !event.imageUrl ? (
                      <EventPlaceholder title={event.title} />
                    ) : (
                      <Card.Img variant="top" src={event.imageUrl} style={{ height: '200px', objectFit: 'cover' }} />
                    )}
                    <div className="position-absolute top-0 end-0 p-3">
                      <Badge bg="white" text="dark" className="shadow-sm py-2 px-3 rounded-pill">
                        <i className="bi bi-people-fill me-1 text-primary"></i>
                        {event.reservationCount || 0}
                      </Badge>
                    </div>
                  </div>

                  <Card.Body className="p-4">
                    <Card.Title className="fw-bold mb-1 fs-5">{event.title}</Card.Title>
                    <Card.Text className="text-muted small mb-3">
                      <i className="bi bi-calendar-event me-2"></i>
                      {formatDate(event.time)}
                    </Card.Text>
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-primary fw-semibold small">Manage Event &rarr;</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {pastEvents.length > 0 && (
            <>
              <div className="d-flex align-items-center my-5">
                <hr className="flex-grow-1" />
                <span className="mx-3 text-muted fw-bold small text-uppercase">Past Events</span>
                <hr className="flex-grow-1" />
              </div>

              <Row className="g-4 opacity-75">
                {pastEvents.map(event => (
                  <Col md={6} lg={4} key={event.id}>
                    <Card as={Link} to={`/event/${event.id}`} className="text-decoration-none text-muted h-100 glass-card border-0 grayscale-hover">
                      <div style={{ filter: 'grayscale(100%)' }}>
                        {event.imageUrl === 'placeholder' || !event.imageUrl ? (
                          <EventPlaceholder title={event.title} />
                        ) : (
                          <Card.Img variant="top" src={event.imageUrl} style={{ height: '160px', objectFit: 'cover' }} />
                        )}
                      </div>
                      <Card.Body className="p-3">
                        <Card.Title className="fs-6">{event.title} (Disabled)</Card.Title>
                        <Card.Text className="small">
                          {formatDate(event.time)}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </>
      )}
    </Container>
  );
}

export default Dashboard;
