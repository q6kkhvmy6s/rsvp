import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Form, Button, Card, Spinner, Alert } from 'react-bootstrap';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { formatDate } from '../utils';

function ReservationForm() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const promoterId = searchParams.get('ref'); // Get promoter ID from URL
    const prefilledFieldId = searchParams.get('field_id');
    const encodedValue = searchParams.get('val');

    let prefilledFieldValue = searchParams.get('field_value'); // Legacy support
    if (encodedValue) {
        try {
            prefilledFieldValue = decodeURIComponent(escape(atob(encodedValue)));
        } catch (e) {
            console.error("Failed to decode value", e);
        }
    }

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const eventDoc = doc(db, 'events', id);
                const eventSnapshot = await getDoc(eventDoc);

                if (eventSnapshot.exists()) {
                    const data = eventSnapshot.data();
                    if (data.status === 'disabled') {
                        setError('This event is no longer accepting reservations.');
                    } else if (data.acceptingReservations === false) {
                        setError('Reservations for this event are currently paused. Please check back later.');
                    } else {
                        setEvent({ id: eventSnapshot.id, ...data });
                        // Initialize form data
                        const initialData = {};
                        data.fields.forEach(field => {
                            if (!field.isInternal) {
                                initialData[field.label] = '';
                            }
                        });

                        // Pre-fill form data if a special link was used
                        if (prefilledFieldId && prefilledFieldValue) {
                            // field.id is usually a number, prefilledFieldId is a string from URL
                            const fieldToPrefill = data.fields.find(f => String(f.id) === prefilledFieldId);
                            if (fieldToPrefill) {
                                initialData[fieldToPrefill.label] = prefilledFieldValue;
                            }
                        }

                        setFormData(initialData);
                    }
                } else {
                    setError('Event not found.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id, prefilledFieldId, prefilledFieldValue]);


    const handleChange = (label, value) => {
        setFormData(prev => ({
            ...prev,
            [label]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'events', id, 'reservations'), {
                formData,
                promoterId: promoterId || null, // Save promoter ID
                createdAt: serverTimestamp()
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Failed to submit reservation. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Container className="text-center my-5"><Spinner animation="border" /></Container>;
    if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;

    if (submitted) {
        return (
            <Container className="my-5">
                <Card className="text-center p-5 shadow-sm">
                    <Card.Body>
                        <h2 className="text-success mb-4">Reservation Confirmed!</h2>
                        <p className="lead">Thank you for reserving your spot at <strong>{event.title}</strong>.</p>
                        <hr />
                        <div className="text-start d-inline-block">
                            <h5 className="mb-3">Your Details:</h5>
                            {event.fields.filter(f => !f.isInternal).map(field => (
                                <p key={field.id}><strong>{field.label}:</strong> {formData[field.label]}</p>
                            ))}
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    // Filter out internal fields
    const publicFields = event.fields.filter(field => !field.isInternal);

    return (
        <Container className="my-5" style={{ maxWidth: '600px' }}>
            <Card className="shadow-sm glass-card border-0">
                {event.imageUrl && event.imageUrl !== 'placeholder' && (
                    <Card.Img
                        variant="top"
                        src={event.imageUrl}
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '400px',
                            objectFit: 'contain',
                            display: 'block'
                        }}
                    />
                )}

                <Card.Body className="p-4">
                    <Card.Title as="h2" className="mb-3">{event.title}</Card.Title>
                    <Card.Text className="text-muted mb-4">
                        <i className="bi bi-calendar-event me-2"></i>
                        {formatDate(event.time)}
                        <br />
                        <i className="bi bi-geo-alt me-2"></i>
                        {event.place} - {event.address}
                    </Card.Text>
                    <Card.Text>{event.description}</Card.Text>

                    {/* Note is internal? Prompt said "option to leave a note" when creating event. 
              Usually notes are public info like "Dress code". 
              If it was internal, it would be a field. 
              Let's keep it public as per previous implementation unless specified. 
          */}
                    {event.note && <Alert variant="info" className="mt-3">{event.note}</Alert>}

                    <hr className="my-4" />

                    <Form onSubmit={handleSubmit}>
                        {publicFields.map(field => (
                            <Form.Group className="mb-3" key={field.id}>
                                <Form.Label>{field.label} {field.required && <span className="text-danger">*</span>}</Form.Label>
                                {field.type === 'select' ? (
                                    <Form.Select
                                        required={field.required}
                                        value={formData[field.label] || ''}
                                        onChange={(e) => handleChange(field.label, e.target.value)}
                                    >
                                        <option value="">Select an option...</option>
                                        {field.options.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </Form.Select>
                                ) : (
                                    <Form.Control
                                        type={field.type}
                                        required={field.required}
                                        value={formData[field.label] || ''}
                                        onChange={(e) => handleChange(field.label, e.target.value)}
                                        disabled={String(field.id) === prefilledFieldId}
                                    />
                                )}
                            </Form.Group>
                        ))}
                        <Button variant="primary" type="submit" className="w-100 mt-3" disabled={submitting}>
                            {submitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Confirm Reservation'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default ReservationForm;
