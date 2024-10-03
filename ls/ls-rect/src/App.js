import React, { useEffect, useState, useRef } from 'react';
import { fetchRectangleDimensions, updateRectangleDimensions } from './services/rectangleApi';
import './App.css';

function App() {
    const [rectangle, setRectangle] = useState({ width: 0, height: 0 });
    const [loading, setLoading] = useState(true);
    const [isResizing, setIsResizing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);
    const svgRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        const getRectangleData = async () => {
            try {
                const data = await fetchRectangleDimensions();
                setRectangle(data);
            } catch (error) {
                console.error("Error fetching rectangle data:", error);
                setError("Failed to load rectangle data.");
            } finally {
                setLoading(false);
            }
        };

        getRectangleData();
    }, []);

    const startResize = (e) => {
        e.preventDefault();
        setIsResizing(true);
        setError(null);

        // Cancel any ongoing update
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsUpdating(false);
        }
    };

    const stopResize = async () => {
        if (!isResizing) return;
        setIsResizing(false);
        setIsUpdating(true);
        setError(null);

        //AbortController
        abortControllerRef.current = new AbortController();

        try {
            const updatedRectangle = await updateRectangleDimensions(rectangle, abortControllerRef.current.signal);
            setRectangle(updatedRectangle);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Update was cancelled');
            } else {
                console.error("Error updating rectangle dimensions:", error);
                setError(error.message);
            }
        } finally {
            if (abortControllerRef.current.signal.aborted) {
                setIsUpdating(false);
            } else {
                setTimeout(() => setIsUpdating(false), 0);
            }
        }
    };

    const resize = (e) => {
        if (!isResizing) return;

        const svg = svgRef.current;
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = e.clientX;
        svgPoint.y = e.clientY;
        const cursor = svgPoint.matrixTransform(svg.getScreenCTM().inverse());

        setRectangle(prev => ({
            width: Math.max(10, Math.round(cursor.x)),
            height: Math.max(10, Math.round(cursor.y))
        }));
    };

    const calculatePerimeter = () => {
        return 2 * (rectangle.width + rectangle.height);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="App">
            <h1>Hold and drag the red button to resize</h1>
            <svg 
                ref={svgRef}
                width="400" 
                height="400" 
                onMouseMove={resize} 
                onMouseUp={stopResize} 
                onMouseLeave={stopResize}
            >
                <rect
                    width={rectangle.width}
                    height={rectangle.height}
                    style={{ fill: 'blue', stroke: 'black', strokeWidth: 3 }}
                />
                <circle
                    cx={rectangle.width}
                    cy={rectangle.height}
                    r="5"
                    fill="red"
                    onMouseDown={startResize}
                    style={{ cursor: 'nwse-resize' }}
                />
            </svg>
            <p>Width: {rectangle.width}px</p>
            <p>Height: {rectangle.height}px</p>
            <p>Perimeter: {calculatePerimeter()}px</p>
            {isUpdating && <p>Updating rectangle dimensions...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default App;

