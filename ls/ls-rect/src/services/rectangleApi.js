export const fetchRectangleDimensions = async () => {
    const response = await fetch('https://localhost:5001/api/rectangle');
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

export const updateRectangleDimensions = async (dimensions, signal) => {
    const response = await fetch('https://localhost:5001/api/rectangle', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dimensions),
        signal, //AbortSignal
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
    }
    return response.json();
};
