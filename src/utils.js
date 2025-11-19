export const formatDate = (dateInput) => {
    if (!dateInput) return '';

    let date;
    // Handle Firestore Timestamp (has seconds property)
    if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        date = new Date(dateInput.seconds * 1000);
    } else {
        // Handle string or Date object
        date = new Date(dateInput);
    }

    // Check if valid
    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleString('default', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

// Generate a deterministic color gradient based on event title
// Always returns the same gradient for the same title
export const getEventColor = (title) => {
    const gradients = [
        'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    ];

    // Generate hash from title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use hash to select gradient
    return gradients[Math.abs(hash) % gradients.length];
};

// Export reservations to CSV
export const exportToCSV = (reservations, event, promoterNames) => {
    if (!reservations || reservations.length === 0) {
        alert('No reservations to export');
        return;
    }

    // Prepare CSV headers
    const headers = event.fields.map(field => field.label);
    headers.push('Promoter', 'Created At');

    // Prepare CSV rows
    const rows = reservations.map(reservation => {
        const row = event.fields.map(field => {
            const value = reservation.formData[field.label] || '';
            // Escape commas and quotes in values
            return `"${String(value).replace(/"/g, '""')}"`;
        });

        // Add promoter name
        const promoterName = promoterNames[reservation.promoterId] || (reservation.promoterId ? 'Unknown' : 'Direct');
        row.push(`"${promoterName}"`);

        // Add created at timestamp
        const createdAt = formatDate(reservation.createdAt);
        row.push(`"${createdAt}"`);

        return row.join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_')}_reservations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
