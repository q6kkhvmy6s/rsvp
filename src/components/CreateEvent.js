import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, InputGroup, Spinner } from 'react-bootstrap';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

function CreateEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [primaryField, setPrimaryField] = useState(null);

  const [fields, setFields] = useState([
    { id: 1, label: 'Nombre', type: 'text', required: true },
    { id: 2, label: 'Número de personas', type: 'number', required: true },
    { id: 3, label: 'Gasto aproximado', type: 'number', required: false },
  ]);

  const addField = (type) => {
    const newField = {
      id: Date.now(), // Use timestamp for unique ID
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
    setLoading(true);

    try {
      let imageUrl = '';
      if (image) {
        try {
          const imageRef = ref(storage, `events/${Date.now()}_${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          imageUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          alert("Failed to upload image (check Firebase Storage rules). Event will be created without it.");
          // Proceed without image
        }
      }

      // Deep clean function to remove undefined values from nested objects/arrays
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
        status: 'active',
        acceptingReservations: true,
        promoters: [],
        createdAt: Date.now(),
      });

      const docRef = await addDoc(collection(db, 'events'), eventData);
      setLoading(false);
      navigate(`/event/${docRef.id}`);
    } catch (error) {
      console.error("Error creating event: ", error);
      setLoading(false);
      alert('Failed to create event. Please try again.');
    }
  };

  return (
    <Container className="page-container fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="display-5 fw-bold text-gradient mb-2">Create New Event</h1>
        <p className="text-muted fs-6">Set up your event and customize the reservation form</p>
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                <Form.Control
                  type="file"
                  onChange={handleImageChange}
                  disabled={loading}
                  accept="image/*"
                />
                <Form.Text className="text-muted">
                  Recommended size: 1200x600px
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
                      disabled={loading}
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
                      disabled={loading}
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
                        disabled={loading}
                      />
                      <Button
                        variant="outline-danger"
                        onClick={() => removeOption(field.id, index)}
                        disabled={loading}
                      >
                        <i className="bi bi-x-lg"></i>
                      </Button>
                    </InputGroup>
                  ))}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => addOption(field.id)}
                    disabled={loading}
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
              disabled={loading}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Text Field
            </Button>
            <Button
              variant="link"
              className="btn-add-field"
              onClick={() => addField('number')}
              disabled={loading}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Number Field
            </Button>
            <Button
              variant="link"
              className="btn-add-field"
              onClick={() => addField('date')}
              disabled={loading}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Date Field
            </Button>
            <Button
              variant="link"
              className="btn-add-field"
              onClick={() => addField('select')}
              disabled={loading}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Dropdown Field
            </Button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <Button
            variant="primary"
            type="submit"
            className="btn-submit-large px-5"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Creating Event...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Create Event
              </>
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
}

export default CreateEvent;