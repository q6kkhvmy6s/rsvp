import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate, useParams, Link } from 'react-router-dom';

function EditEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState('');
    const [place, setPlace] = useState('');
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');
    const [image, setImage] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [primaryField, setPrimaryField] = useState(null);
    const [fields, setFields] = useState([]);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const eventDoc = doc(db, 'events', id);
                const eventSnapshot = await getDoc(eventDoc);

                if (eventSnapshot.exists()) {
                    const data = eventSnapshot.data();
                    setTitle(data.title || '');
                    setDescription(data.description || '');
                    setTime(data.time || '');
                    setPlace(data.place || '');
                    setAddress(data.address || '');
                    setNote(data.note || '');
                    setCurrentImageUrl(data.imageUrl || '');
                    setFields(data.fields || []);
                    setPrimaryField(data.primaryField || null);
                } else {
                    setError('Event not found.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load event.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    const addField = (type) => {
        const newField = {
            id: Date.now(),
            label: '',
            type: type,
            required: false,
            options: type === 'select' ? [''] : undefined,
        };
        setFields([...fields, newField]);
    };

    const handleFieldChange = (id, event) => {
        const { name, value } = event.target;
        const newFields = fields.map((field) => {
            if (field.id === id) {
                return { ...field, [name]: value };
            }
            return field;
        });
        setFields(newFields);
    };

    const handleOptionChange = (fieldId, optionIndex, event) => {
        const newFields = fields.map((field) => {
            if (field.id === fieldId) {
                const newOptions = field.options.map((option, index) => {
                    if (index === optionIndex) {
                        return event.target.value;
                    }
                    return option;
                });
                return { ...field, options: newOptions };
            }
            return field;
        });
        setFields(newFields);
    };

    const addOption = (fieldId) => {
        const newFields = fields.map((field) => {
            if (field.id === fieldId) {
                return { ...field, options: [...field.options, ''] };
            }
            return field;
        });
        setFields(newFields);
    };

    const removeOption = (fieldId, optionIndex) => {
        const newFields = fields.map((field) => {
            if (field.id === fieldId) {
                const newOptions = field.options.filter((_, index) => index !== optionIndex);
                return { ...field, options: newOptions };
            }
            return field;
        });
        setFields(newFields);
    };

    const removeField = (id) => {
        setFields(fields.filter((field) => field.id !== id));
    };

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            let imageUrl = currentImageUrl;

            // Upload new image if one was selected
            if (image) {
                try {
                    const imageRef = ref(storage, `events/${Date.now()}_${image.name}`);
                    const snapshot = await uploadBytes(imageRef, image);
                    imageUrl = await getDownloadURL(snapshot.ref);
                } catch (uploadError) {
                    console.error("Image upload failed:", uploadError);
                    alert("Failed to upload image. Event will be updated without changing the image.");
                }
            }

            // Deep clean function to remove undefined values
            const cleanData = (obj) => {
                if (Array.isArray(obj)) {
                    return obj.map(item => cleanData(item));
                } else if (obj !== null && typeof obj === 'object') {
                    const cleaned = {};
                    Object.keys(obj).forEach(key => {
                        if (obj[key] !== undefined) {
                            cleaned[key] = cleanData(obj[key]);
                        }
                    });
                    return cleaned;
                }
                return obj;
            };

            const eventData = cleanData({
                title,
                description,
                time,
                place,
                address,
                note,
                imageUrl: imageUrl || 'placeholder',
                fields,
                primaryField,
            });

            await updateDoc(doc(db, 'events', id), eventData);
            setSaving(false);
            navigate(`/event/${id}`);
        } catch (error) {
            console.error("Error updating event: ", error);
            setSaving(false);
            alert('Failed to update event. Please try again.');
        }
    };

    if (loading) return <Container className="text-center my-5"><Spinner animation="border" /></Container>;
    if (error) return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;

    return (
        <Container className="page-container fade-in">
            {/* Header */}
            <div className="mb-5">
                <h1 className="display-5 fw-bold text-gradient mb-2">Edit Event</h1>
                <p className="text-muted fs-6">Update your event details and reservation form</p>
            </div>

            <Form onSubmit={handleSubmit}>
                {/* Event Details Section */}
                <div className="card-section">
                    <div className="section-header">
                        <div className="icon">
                            <i className="bi bi-calendar-event"></i>
                        </div>
                        <h3>Event Details</h3>
                    </div>

                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="form-label-icon">
                                    <i className="bi bi-type"></i>
                                    <span>Event Title</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    disabled={saving}
                                    placeholder="Enter event name"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="form-label-icon">
                                    <i className="bi bi-text-paragraph"></i>
                                    <span>Description</span>
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={saving}
                                    placeholder="Describe your event..."
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="form-label-icon">
                                    <i className="bi bi-clock"></i>
                                    <span>Date & Time</span>
                                </Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    disabled={saving}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="form-label-icon">
                                    <i className="bi bi-geo-alt"></i>
                                    <span>Venue Name</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={place}
                                    onChange={(e) => setPlace(e.target.value)}
                                    disabled={saving}
                                    placeholder="e.g., Grand Ballroom"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="form-label-icon">
                                    <i className="bi bi-pin-map"></i>
                                    <span>Address</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    disabled={saving}
                                    placeholder="Full address"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="form-label-icon">
                                    <i className="bi bi-sticky"></i>
                                    <span>Internal Note</span>
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={saving}
                                    placeholder="Private notes for admins and promoters"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-0">
                                <Form.Label className="form-label-icon">
                                    <i className="bi bi-image"></i>
                                    <span>Cover Image</span>
                                </Form.Label>
                                {currentImageUrl && currentImageUrl !== 'placeholder' && (
                                    <div className="mb-2">
                                        <small className="text-muted d-block">Current image:</small>
                                        <img src={currentImageUrl} alt="Current event" style={{ maxWidth: '200px', height: 'auto' }} className="rounded" />
                                    </div>
                                )}
                                <Form.Control
                                    type="file"
                                    onChange={handleImageChange}
                                    disabled={saving}
                                    accept="image/*"
                                />
                                <Form.Text className="text-muted">
                                    Upload a new image to replace the current one. Recommended size: 1200x600px
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>
                </div>

                {/* Reservation Form Fields Section */}
                <div className="card-section">
                    <div className="section-header">
                        <div className="icon">
                            <i className="bi bi-ui-checks"></i>
                        </div>
                        <h3>Reservation Form Fields</h3>
                    </div>

                    <div className="info-box mb-4">
                        <p>
                            <i className="bi bi-info-circle me-2"></i>
                            Customize the information you want to collect from attendees. Mark fields as "Internal" to hide them from public forms.
                        </p>
                    </div>

                    {/* Fields List */}
                    {fields.map((field) => (
                        <div key={field.id} className="form-field-card">
                            <Row className="align-items-end g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Field Label</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="label"
                                            value={field.label}
                                            onChange={(e) => handleFieldChange(field.id, e)}
                                            placeholder="e.g., Email Address"
                                            disabled={saving}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Field Type</Form.Label>
                                        <Form.Control as="select" name="type" value={field.type} disabled>
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="select">Dropdown</option>
                                        </Form.Control>
                                    </Form.Group>
                                </Col>
                                <Col md="auto">
                                    <Form.Check
                                        type="radio"
                                        name="primaryField"
                                        label={
                                            <span className="small fw-bold">
                                                <i className="bi bi-star-fill text-warning me-1"></i>
                                                Primary
                                            </span>
                                        }
                                        checked={primaryField === field.id}
                                        onChange={() => setPrimaryField(field.id)}
                                    />
                                </Col>
                                <Col md="auto">
                                    <Form.Check
                                        type="checkbox"
                                        label={
                                            <span className="small fw-bold">
                                                <i className="bi bi-eye-slash me-1"></i>
                                                Internal
                                            </span>
                                        }
                                        checked={field.isInternal || false}
                                        onChange={(e) => handleFieldChange(field.id, { target: { name: 'isInternal', value: e.target.checked } })}
                                    />
                                </Col>
                                <Col md="auto" className="ms-auto">
                                    {!field.required && (
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => removeField(field.id)}
                                            disabled={saving}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    )}
                                </Col>
                            </Row>

                            {/* Options for Select Fields */}
                            {field.type === 'select' && (
                                <div className="options-container">
                                    <h6>
                                        <i className="bi bi-list-ul me-2"></i>
                                        Dropdown Options
                                    </h6>
                                    {field.options.map((option, index) => (
                                        <InputGroup className="mb-2" key={index} size="sm">
                                            <Form.Control
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(field.id, index, e)}
                                                placeholder={`Option ${index + 1}`}
                                                disabled={saving}
                                            />
                                            <Button
                                                variant="outline-danger"
                                                onClick={() => removeOption(field.id, index)}
                                                disabled={saving}
                                            >
                                                <i className="bi bi-x-lg"></i>
                                            </Button>
                                        </InputGroup>
                                    ))}
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => addOption(field.id)}
                                        disabled={saving}
                                    >
                                        <i className="bi bi-plus-lg me-1"></i>
                                        Add Option
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Field Buttons */}
                    <div className="d-flex gap-2 flex-wrap mt-3">
                        <Button
                            variant="link"
                            className="btn-add-field"
                            onClick={() => addField('text')}
                            disabled={saving}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Text Field
                        </Button>
                        <Button
                            variant="link"
                            className="btn-add-field"
                            onClick={() => addField('number')}
                            disabled={saving}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Number Field
                        </Button>
                        <Button
                            variant="link"
                            className="btn-add-field"
                            onClick={() => addField('date')}
                            disabled={saving}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Date Field
                        </Button>
                        <Button
                            variant="link"
                            className="btn-add-field"
                            onClick={() => addField('select')}
                            disabled={saving}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Dropdown Field
                        </Button>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="d-flex gap-2 justify-content-center">
                    <Button
                        as={Link}
                        to={`/event/${id}`}
                        variant="outline-secondary"
                        className="px-5"
                        disabled={saving}
                    >
                        <i className="bi bi-x-circle me-2"></i>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        className="btn-submit-large px-5"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                Saving Changes...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle me-2"></i>
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </Form>
        </Container>
    );
}

export default EditEvent;
