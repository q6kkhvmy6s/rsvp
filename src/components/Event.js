import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Alert, Button, Table, Form, Badge } from 'react-bootstrap';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, getEventColor, exportToCSV } from '../utils';

const EventPlaceholder = ({ title }) => {
  return (
    <div
      className="d-flex align-items-center justify-content-center p-4"
      style={{
        background: getEventColor(title),
        color: 'white',
        height: '250px',
        textAlign: 'center',
        fontSize: '2rem',
        fontWeight: '800',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        letterSpacing: '-0.02em',
      }}
    >
      {title}
    </div>
  );
};

function Event() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [event, setEvent] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [promoterNames, setPromoterNames] = useState({});
  const [prefilledLink, setPrefilledLink] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');

  // Construct URLs
  const baseUrl = window.location.origin;
  // If user is promoter, append their ID. If admin, maybe show generic or let them choose? 
  // For now, Admin gets generic link, Promoter gets ref link.
  const reservationUrl = `${baseUrl}/reservation/${id}` + (userProfile?.role === 'promoter' ? `?ref=${userProfile.uid}` : '');
  const inviteUrl = `${baseUrl}/join/${id}`;

  useEffect(() => {
    if (event) {
      const internalFields = event.fields.filter(f => f.isInternal);
      if (internalFields.length === 1) {
        setSelectedFieldId(internalFields[0].id);
      }
    }
  }, [event]);

  useEffect(() => {
    if (selectedFieldId && customFieldValue) {
      const params = new URLSearchParams();
      if (userProfile?.role === 'promoter') {
        params.append('ref', userProfile.uid);
      }
      params.append('field_id', selectedFieldId);
      // Encode value to Base64 to hide it from plain view
      const encodedValue = btoa(unescape(encodeURIComponent(customFieldValue)));
      params.append('val', encodedValue);
      setPrefilledLink(`${baseUrl}/reservation/${id}?${params.toString()}`);
    } else {
      setPrefilledLink('');
    }
  }, [id, baseUrl, userProfile, selectedFieldId, customFieldValue]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const eventDoc = doc(db, 'events', id);
        const eventSnapshot = await getDoc(eventDoc);

        if (eventSnapshot.exists()) {
          const eventData = { id: eventSnapshot.id, ...eventSnapshot.data() };
          setEvent(eventData);

          const reservationsCol = collection(db, 'events', id, 'reservations');
          const q = query(reservationsCol, orderBy('createdAt', 'desc'));
          const reservationsSnapshot = await getDocs(q);
          const reservationsList = reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setReservations(reservationsList);

          // Fetch promoter names for display
          const pNames = {};
          // Get unique promoter IDs from reservations
          const promoterIds = [...new Set(reservationsList.map(r => r.promoterId).filter(Boolean))];
          // Also fetch event promoters to map names if needed, but reservation.promoterId is what matters for the table.
          // We can fetch users one by one or just show ID if name not found. 
          // For efficiency, let's just fetch the ones we need.
          for (const pid of promoterIds) {
            const pDoc = await getDoc(doc(db, 'users', pid));
            if (pDoc.exists()) {
              pNames[pid] = pDoc.data().username || pDoc.data().email;
            }
          }
          setPromoterNames(pNames);

        } else {
          setError('Event not found.');
        }
      } catch (err) {
        setError('Failed to fetch data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const sortedReservations = useMemo(() => {
    let sortableItems = [...reservations];

    // Filter for promoters: Show ONLY their reservations? 
    // Prompt: "list of reservations made by the promoter" -> ambiguous. 
    // Usually promoters want to see THEIR list. Admins want to see ALL.
    // Let's filter if role is promoter.
    if (userProfile?.role === 'promoter') {
      sortableItems = sortableItems.filter(r => r.promoterId === userProfile.uid);
    }

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        // Handle nested formData or top-level keys
        let aValue = a.formData?.[sortConfig.key] || a[sortConfig.key];
        let bValue = b.formData?.[sortConfig.key] || b[sortConfig.key];

        // Special case for Promoter Name sorting
        if (sortConfig.key === 'promoterId') {
          aValue = promoterNames[a.promoterId] || '';
          bValue = promoterNames[b.promoterId] || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [reservations, sortConfig, userProfile, promoterNames]);

  const handleSortChange = (e) => {
    const [key, direction] = e.target.value.split('|');
    setSortConfig({ key, direction });
  };

  const toggleEventStatus = async () => {
    if (!event) return;
    const newStatus = event.status === 'disabled' ? 'active' : 'disabled';
    try {
      await updateDoc(doc(db, 'events', id), { status: newStatus });
      setEvent(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const toggleAcceptingReservations = async () => {
    if (!event) return;
    const newValue = !event.acceptingReservations;
    try {
      await updateDoc(doc(db, 'events', id), { acceptingReservations: newValue });
      setEvent(prev => ({ ...prev, acceptingReservations: newValue }));
    } catch (err) {
      console.error(err);
      alert('Failed to update reservation status');
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) return;
    try {
      await deleteDoc(doc(db, 'events', id, 'reservations', reservationId));
      setReservations(prev => prev.filter(r => r.id !== reservationId));
    } catch (err) {
      console.error("Error deleting reservation:", err);
      alert("Failed to delete reservation.");
    }
  };

  if (loading) return <Container className="text-center my-5"><Spinner animation="border" /></Container>;
  if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <Button as={Link} to="/" variant="outline-secondary"><i className="bi bi-arrow-left me-2"></i>Back to Dashboard</Button>
        {userProfile?.role === 'admin' && (
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-primary" onClick={() => navigate(`/edit/${id}`)}>
              <i className="bi bi-pencil me-2"></i>Edit Event
            </Button>
            <Button
              variant={event.acceptingReservations !== false ? "warning" : "success"}
              onClick={toggleAcceptingReservations}
            >
              <i className={`bi ${event.acceptingReservations !== false ? 'bi-pause-circle' : 'bi-play-circle'} me-2`}></i>
              {event.acceptingReservations !== false ? "Pause Reservations" : "Resume Reservations"}
            </Button>
            <Button
              variant="outline-danger"
              onClick={toggleEventStatus}
            >
              <i className="bi bi-x-circle me-2"></i>
              {event.status === 'disabled' ? "Enable Event" : "Disable Event"}
            </Button>
            <Button
              variant="success"
              onClick={() => exportToCSV(reservations, event, promoterNames)}
            >
              <i className="bi bi-download me-2"></i>Export CSV
            </Button>
          </div>
        )}
      </div>

      {event && (
        <>
          <Row className="mb-4">
            <Col md={8}>
              <h1 className="display-6 fw-bold">
                {event.title}
                {event.status === 'disabled' && <Badge bg="secondary">Disabled</Badge>}
                {event.acceptingReservations === false && <Badge bg="warning" text="dark" className="ms-2">Reservations Paused</Badge>}
              </h1>
              <p className="text-muted fs-5 mb-3"><i className="bi bi-calendar-event me-2"></i>{formatDate(event.time)}</p>
              <p className="fs-6">{event.description}</p>
              {/* Internal Note for Admin/Promoter */}
              {event.note && <Alert variant="info" className="glass-card border-0"><strong>Note:</strong> {event.note}</Alert>}

              {/* Event Image */}
              {event.imageUrl && event.imageUrl !== 'placeholder' && (
                <Card className="glass-card border-0 overflow-hidden mt-4">
                  <Card.Img
                    src={event.imageUrl}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '800px',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                </Card>
              )}
            </Col>
            <Col md={4}>
              <Card className="mb-3 glass-card border-0">
                <Card.Body className="text-center">
                  <h5 className="fw-bold">Reservation Link</h5>
                  <div className="my-3"><QRCodeSVG value={reservationUrl} size={128} /></div>
                  <small className="d-block text-break mb-2 text-muted">{reservationUrl}</small>
                  <Button variant="primary" size="sm" className="w-100" onClick={() => navigator.clipboard.writeText(reservationUrl)}>Copy Link</Button>
                </Card.Body>
              </Card>

              {userProfile?.role === 'admin' && (
                <Card className="mb-3 glass-card border-0">
                  <Card.Body className="text-center">
                    <h5 className="fw-bold">Invite Promoters</h5>
                    <div className="my-3"><QRCodeSVG value={inviteUrl} size={128} /></div>
                    <small className="d-block text-break mb-2 text-muted">{inviteUrl}</small>
                    <Button variant="outline-primary" size="sm" className="w-100" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy Invite Link</Button>
                  </Card.Body>
                </Card>
              )}

              <Card className="glass-card border-0 mt-3">
                <Card.Body>
                  <h5 className="fw-bold">Create Link for Someone Else</h5>
                  <Form.Group className="mb-2">
                    <Form.Label className="small">Select Question to Answer</Form.Label>
                    <Form.Select
                      size="sm"
                      value={selectedFieldId}
                      onChange={(e) => {
                        setSelectedFieldId(e.target.value);
                        setCustomFieldValue(''); // Reset value on field change
                      }}
                    >
                      <option value="">-- Select a Field --</option>
                      {event.fields.filter(f => f.isInternal).map(field => (
                        <option key={field.id} value={field.id}>
                          {field.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {selectedFieldId && (
                    <Form.Group className="mb-3">
                      <Form.Label className="small">Answer</Form.Label>
                      {(() => {
                        const field = event.fields.find(f => f.id === Number(selectedFieldId) || f.id === selectedFieldId);
                        if (!field) return null;

                        if (field.type === 'select') {
                          return (
                            <Form.Select
                              size="sm"
                              value={customFieldValue}
                              onChange={(e) => setCustomFieldValue(e.target.value)}
                            >
                              <option value="">Select option...</option>
                              {field.options.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                              ))}
                            </Form.Select>
                          );
                        } else {
                          return (
                            <Form.Control
                              size="sm"
                              type={field.type}
                              value={customFieldValue}
                              onChange={(e) => setCustomFieldValue(e.target.value)}
                              placeholder={`Enter ${field.label}`}
                            />
                          );
                        }
                      })()}
                    </Form.Group>
                  )}

                  {prefilledLink && (
                    <div className="mt-3">
                      <small className="d-block text-break mb-2 text-muted">{prefilledLink}</small>
                      <Button variant="outline-primary" size="sm" className="w-100" onClick={() => navigator.clipboard.writeText(prefilledLink)}>Copy Link with Answer</Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <hr className="my-4" />

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="mb-1">Reservations</h2>
              {userProfile?.role === 'promoter' ? (
                <small className="text-muted">
                  Total: <strong>{reservations.length}</strong> |
                  Your Reservations: <strong>{sortedReservations.length}</strong>
                </small>
              ) : (
                <small className="text-muted">Total: <strong>{reservations.length}</strong></small>
              )}
            </div>
          </div>
          {reservations.length > 0 ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Form.Group as={Row} className="align-items-center m-0">
                  <Form.Label column sm="auto">Sort by:</Form.Label>
                  <Col sm="auto">
                    <Form.Select onChange={handleSortChange} defaultValue={`${sortConfig.key}|${sortConfig.direction}`}>
                      <option value="createdAt|desc">Most Recent</option>
                      {event.fields.map(field => (
                        <option key={field.id} value={`${field.label}|asc`}>{field.label}</option>
                      ))}
                      <option value="promoterId|asc">Promoter</option>
                    </Form.Select>
                  </Col>
                </Form.Group>

                <Button
                  variant="primary"
                  href={reservationUrl}
                  target="_blank"
                >
                  + Create Reservation
                </Button>
              </div>

              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    {event.fields.map(field => (
                      <th key={field.id}>
                        {field.label}
                        {field.isInternal && <Badge bg="warning" text="dark" className="ms-1">Internal</Badge>}
                      </th>
                    ))}
                    <th>Promoter</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReservations.map(res => (
                    <tr key={res.id}>
                      {event.fields.map(field => (
                        <td key={field.id}>{res.formData[field.label] || '-'}</td>
                      ))}
                      <td>{promoterNames[res.promoterId] || (res.promoterId ? 'Unknown' : '-')}</td>
                      <td>{formatDate(res.createdAt)}</td>
                      <td>
                        {(userProfile?.role === 'admin' || (userProfile?.role === 'promoter' && res.promoterId === userProfile.uid)) && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteReservation(res.id)}
                          >
                            <i className="bi bi-trash"></i> Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          ) : (
            <Alert variant="info">No reservations found.</Alert>
          )}
        </>
      )
      }
    </Container >
  );
}

export default Event;
