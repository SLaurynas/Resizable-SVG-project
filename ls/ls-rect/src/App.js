import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchRectangleDimensions, updateRectangleDimensions } from './services/rectangleApi';
import './App.css';

function App() {
    const [rectangle, setRectangle] = useState({ width: 0, height: 0, x: 0, y: 0 });
    const [loading, setLoading] = useState(true);
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [updateComplete, setUpdateComplete] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const svgRef = useRef(null);
    const abortControllerRef = useRef(null);
    const startPositionRef = useRef({ x: 0, y: 0 });
    const updateTimeoutRef = useRef(null);

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

    const updateRectangleWithDebounce = useCallback((updatedRectangle) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        updateTimeoutRef.current = setTimeout(() => {
            updateRectangleOnServer(updatedRectangle);
        }, 500);
    }, []);

    const updateRectangleOnServer = async (rectangleData) => {
        setIsUpdating(true);
        setError(null);
        abortControllerRef.current = new AbortController();

        try {
            const updatedRectangle = await updateRectangleDimensions(rectangleData, abortControllerRef.current.signal);
            setRectangle(updatedRectangle);
            setUpdateComplete(true);
            setTimeout(() => setUpdateComplete(false), 2000);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error updating rectangle dimensions:", error);
                setError(error.message);
            }
        } finally {
            setIsUpdating(false);
            abortControllerRef.current = null;
        }
    };

    const handleInteraction = useCallback((e) => {
        if (!isResizing && !isDragging) return;

        const svg = svgRef.current;
        const svgRect = svg.getBoundingClientRect();
        const svgWidth = svgRect.width;
        const svgHeight = svgRect.height;

        const dx = e.clientX - startPositionRef.current.x;
        const dy = e.clientY - startPositionRef.current.y;

        setRectangle(prev => {
            let newWidth = prev.width;
            let newHeight = prev.height;
            let newX = prev.x;
            let newY = prev.y;

            if (isDragging) {
                newX = Math.max(0, Math.min(svgWidth - prev.width, prev.x + dx));
                newY = Math.max(0, Math.min(svgHeight - prev.height, prev.y + dy));
            } else if (isResizing) {
                switch (resizeHandle) {
                    case 'top':
                        newHeight = Math.max(10, prev.height - dy);
                        newY = Math.max(0, Math.min(prev.y + prev.height - 10, prev.y + dy));
                        break;
                    case 'right':
                        newWidth = Math.max(10, Math.min(svgWidth - prev.x, prev.width + dx));
                        break;
                    case 'bottom':
                        newHeight = Math.max(10, Math.min(svgHeight - prev.y, prev.height + dy));
                        break;
                    case 'left':
                        newWidth = Math.max(10, prev.width - dx);
                        newX = Math.max(0, Math.min(prev.x + prev.width - 10, prev.x + dx));
                        break;
                    case 'topLeft':
                        newWidth = Math.max(10, prev.width - dx);
                        newHeight = Math.max(10, prev.height - dy);
                        newX = Math.max(0, Math.min(prev.x + prev.width - 10, prev.x + dx));
                        newY = Math.max(0, Math.min(prev.y + prev.height - 10, prev.y + dy));
                        break;
                    case 'topRight':
                        newWidth = Math.max(10, Math.min(svgWidth - prev.x, prev.width + dx));
                        newHeight = Math.max(10, prev.height - dy);
                        newY = Math.max(0, Math.min(prev.y + prev.height - 10, prev.y + dy));
                        break;
                    case 'bottomLeft':
                        newWidth = Math.max(10, prev.width - dx);
                        newHeight = Math.max(10, Math.min(svgHeight - prev.y, prev.height + dy));
                        newX = Math.max(0, Math.min(prev.x + prev.width - 10, prev.x + dx));
                        break;
                    case 'bottomRight':
                        newWidth = Math.max(10, Math.min(svgWidth - prev.x, prev.width + dx));
                        newHeight = Math.max(10, Math.min(svgHeight - prev.y, prev.height + dy));
                        break;
                }
            }

            return {
                width: Math.round(newWidth),
                height: Math.round(newHeight),
                x: Math.round(newX),
                y: Math.round(newY)
            };
        });

        startPositionRef.current = { x: e.clientX, y: e.clientY };
    }, [isDragging, isResizing, resizeHandle]);

    const startResize = useCallback((e, handle) => {
        e.preventDefault();
        setIsResizing(true);
        setResizeHandle(handle);
        setError(null);
        startPositionRef.current = { x: e.clientX, y: e.clientY };

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsUpdating(false);
        }
    }, []);

    const startDrag = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        startPositionRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const stopInteraction = useCallback(() => {
        if (!isResizing && !isDragging) return;
        setIsResizing(false);
        setIsDragging(false);
        setResizeHandle(null);
        updateRectangleWithDebounce(rectangle);
    }, [isResizing, isDragging, rectangle, updateRectangleWithDebounce]);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        
        if (!isNaN(numValue)) {
            setRectangle(prev => {
                const svgRect = svgRef.current.getBoundingClientRect();
                const svgWidth = svgRect.width;
                const svgHeight = svgRect.height;

                let newValue = numValue;
                if (name === 'width') {
                    newValue = Math.max(10, Math.min(svgWidth - prev.x, numValue));
                } else if (name === 'height') {
                    newValue = Math.max(10, Math.min(svgHeight - prev.y, numValue));
                } else if (name === 'x') {
                    newValue = Math.max(0, Math.min(svgWidth - prev.width, numValue));
                } else if (name === 'y') {
                    newValue = Math.max(0, Math.min(svgHeight - prev.height, numValue));
                }

                const updatedRectangle = { ...prev, [name]: newValue };
                updateRectangleWithDebounce(updatedRectangle);
                return updatedRectangle;
            });
        }
    }, [updateRectangleWithDebounce]);

    const renderResizeHandles = useCallback(() => {
        const handles = [
            { cx: 0, cy: 0, cursor: 'nwse-resize', handle: 'topLeft' },
            { cx: rectangle.width / 2, cy: 0, cursor: 'ns-resize', handle: 'top' },
            { cx: rectangle.width, cy: 0, cursor: 'nesw-resize', handle: 'topRight' },
            { cx: rectangle.width, cy: rectangle.height / 2, cursor: 'ew-resize', handle: 'right' },
            { cx: rectangle.width, cy: rectangle.height, cursor: 'nwse-resize', handle: 'bottomRight' },
            { cx: rectangle.width / 2, cy: rectangle.height, cursor: 'ns-resize', handle: 'bottom' },
            { cx: 0, cy: rectangle.height, cursor: 'nesw-resize', handle: 'bottomLeft' },
            { cx: 0, cy: rectangle.height / 2, cursor: 'ew-resize', handle: 'left' },
        ];

        return handles.map((handle, index) => (
            <circle
                key={index}
                cx={rectangle.x + handle.cx}
                cy={rectangle.y + handle.cy}
                r="5"
                fill="red"
                style={{ cursor: handle.cursor }}
                onMouseDown={(e) => startResize(e, handle.handle)}
            />
        ));
    }, [rectangle, startResize]);

    const handleSpinnerClick = (prop, increment) => {
        setRectangle(prev => {
            const newValue = prev[prop] + increment;
            const updatedRectangle = { ...prev, [prop]: newValue };
            updateRectangleWithDebounce(updatedRectangle);
            return updatedRectangle;
        });
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="App">
            <h1>Interactive Rectangle</h1>
            <div className="svg-container">
                <svg 
                    ref={svgRef}
                    width="600" 
                    height="400" 
                    onMouseMove={handleInteraction} 
                    onMouseUp={stopInteraction} 
                    onMouseLeave={stopInteraction}
                >
                    <rect
                        x={rectangle.x}
                        y={rectangle.y}
                        width={rectangle.width}
                        height={rectangle.height}
                        style={{ fill: '#3498db', stroke: '#2980b9', strokeWidth: 3, cursor: 'move' }}
                        onMouseDown={startDrag}
                    />
                    {renderResizeHandles()}
                </svg>
            </div>
            <div className="info-panel">
                {['width', 'height', 'x', 'y'].map(prop => (
                    <div key={prop} className="info-item">
                        <span className="info-label">{prop.charAt(0).toUpperCase() + prop.slice(1)}</span>
                        <div className="info-input-container">
                            <input
                                type="number"
                                name={prop}
                                value={rectangle[prop]}
                                onChange={handleInputChange}
                                min={prop === 'width' || prop === 'height' ? "10" : "0"}
                                className="info-input"
                            />
                            <div className="input-spinner">
                                <button className="spinner-button" onClick={() => handleSpinnerClick(prop, 1)}>▲</button>
                                <button className="spinner-button" onClick={() => handleSpinnerClick(prop, -1)}>▼</button>
                            </div>
                        </div>
                    </div>
                ))}
                <div className="info-item">
                    <span className="info-label">Perimeter</span>
                    <span className="info-value">{2 * (rectangle.width + rectangle.height)}px</span>
                </div>
            </div>
            {isUpdating && <p className="status-message updating">Updating rectangle dimensions...</p>}
            {error && <p className="status-message error">{error}</p>}
            {updateComplete && <p className="status-message update-complete">Update Complete!</p>}
        </div>
    );
}

export default App;