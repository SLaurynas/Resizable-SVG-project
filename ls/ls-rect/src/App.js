import React, { useEffect, useState, useRef } from 'react';
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

    const startResize = (e, handle) => {
        e.preventDefault();
        setIsResizing(true);
        setResizeHandle(handle);
        setError(null);
        startPositionRef.current = { x: e.clientX, y: e.clientY };

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsUpdating(false);
        }
    };

    const startDrag = (e) => {
        e.preventDefault();
        setIsDragging(true);
        startPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const stopInteraction = () => {
        if (!isResizing && !isDragging) return;
        setIsResizing(false);
        setIsDragging(false);
        setResizeHandle(null);

        // Use the debounced update function
        updateRectangleWithDebounce(rectangle);
    };

    const handleInteraction = (e) => {
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
                    default:
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
    };

    const calculatePerimeter = () => {
        return 2 * (rectangle.width + rectangle.height);
    };

    const renderResizeHandles = () => {
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
    };

    const updateRectangleWithDebounce = (updatedRectangle) => {
        // Clear any existing timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Abort any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Set a new timeout to update after a short delay
        updateTimeoutRef.current = setTimeout(() => {
            updateRectangleOnServer(updatedRectangle);
        }, 500); // 500ms delay
    };

    const handleInputChange = (e) => {
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

                const updatedRectangle = {
                    ...prev,
                    [name]: newValue
                };

                updateRectangleWithDebounce(updatedRectangle);

                return updatedRectangle;
            });
        }
    };

    const updateRectangleOnServer = async (rectangleData) => {
        setIsUpdating(true);
        setError(null);

        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController();

        try {
            const updatedRectangle = await updateRectangleDimensions(rectangleData, abortControllerRef.current.signal);
            setRectangle(updatedRectangle);
            setUpdateComplete(true);
            setTimeout(() => setUpdateComplete(false), 2000);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Update was cancelled');
            } else {
                console.error("Error updating rectangle dimensions:", error);
                setError(error.message);
            }
        } finally {
            setIsUpdating(false);
            abortControllerRef.current = null;
        }
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
                <div className="info-item">
                    <span className="info-label">Width:</span>
                    <input
                        type="number"
                        name="width"
                        value={rectangle.width}
                        onChange={handleInputChange}
                        min="10"
                        className="info-input"
                    />
                </div>
                <div className="info-item">
                    <span className="info-label">Height:</span>
                    <input
                        type="number"
                        name="height"
                        value={rectangle.height}
                        onChange={handleInputChange}
                        min="10"
                        className="info-input"
                    />
                </div>
                <div className="info-item">
                    <span className="info-label">X:</span>
                    <input
                        type="number"
                        name="x"
                        value={rectangle.x}
                        onChange={handleInputChange}
                        min="0"
                        className="info-input"
                    />
                </div>
                <div className="info-item">
                    <span className="info-label">Y:</span>
                    <input
                        type="number"
                        name="y"
                        value={rectangle.y}
                        onChange={handleInputChange}
                        min="0"
                        className="info-input"
                    />
                </div>
                <div className="info-item">
                    <span className="info-label">Perimeter:</span>
                    <span className="info-value">{calculatePerimeter()}px</span>
                </div>
            </div>
            {isUpdating && <p className="status-message updating">Updating rectangle dimensions...</p>}
            {error && <p className="status-message error">{error}</p>}
            {updateComplete && <p className="status-message update-complete">Update Complete!</p>}
        </div>
    );
}

export default App;