import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchRectangleDimensions, updateRectangleDimensions } from './services/rectangleApi';
import './App.css';

function App() {
    const [rectangle, setRectangle] = useState({ width: 0, height: 0, x: 0, y: 0, svgWidth: 0, svgHeight: 0 });
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

    // Fetch initial rectangle data on component mount
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

    const enforceBoundaries = useCallback((rect, prev) => {
        const { width, height, x, y, svgWidth, svgHeight } = rect;
        let newX = x;
        let newY = y;
        let newWidth = width;
        let newHeight = height;

        // Prevent moving outside left and top boundaries
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;

        // Prevent moving outside right and bottom boundaries
        if (newX + newWidth > svgWidth) newX = svgWidth - newWidth;
        if (newY + newHeight > svgHeight) newY = svgHeight - newHeight;

        // If dimensions would exceed boundaries, keep previous values
        if (newWidth > svgWidth) newWidth = prev.width;
        if (newHeight > svgHeight) newHeight = prev.height;

        // Ensure X and Y are not negative
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        return {
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY,
            svgWidth,
            svgHeight
        };
    }, []);

    const updateRectangleWithDebounce = useCallback((updatedRectangle) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();


        updateTimeoutRef.current = setTimeout(() => {
            updateRectangleOnServer(updatedRectangle, abortControllerRef.current.signal);
        }, 500);
    }, []);

    const updateRectangleOnServer = async (rectangleData, signal) => {
        setIsUpdating(true);
        setError(null);

        try {
            const updatedRectangle = await updateRectangleDimensions(rectangleData, signal);
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
        }
    };

    const handleInteraction = useCallback((e) => {
        if (!isResizing && !isDragging) return;

        const dx = e.clientX - startPositionRef.current.x;
        const dy = e.clientY - startPositionRef.current.y;

        setRectangle(prev => {
            let newRect = { ...prev };

            if (isDragging) {
                newRect.x += dx;
                newRect.y += dy;
            } else if (isResizing) {
                switch (resizeHandle) {
                    case 'top':
                        newRect.y += dy;
                        newRect.height -= dy;
                        break;
                    case 'right':
                        newRect.width += dx;
                        break;
                    case 'bottom':
                        newRect.height += dy;
                        break;
                    case 'left':
                        newRect.x += dx;
                        newRect.width -= dx;
                        break;
                    case 'topLeft':
                        newRect.x += dx;
                        newRect.y += dy;
                        newRect.width -= dx;
                        newRect.height -= dy;
                        break;
                    case 'topRight':
                        newRect.y += dy;
                        newRect.width += dx;
                        newRect.height -= dy;
                        break;
                    case 'bottomLeft':
                        newRect.x += dx;
                        newRect.width -= dx;
                        newRect.height += dy;
                        break;
                    case 'bottomRight':
                        newRect.width += dx;
                        newRect.height += dy;
                        break;
                }
            }

            const boundedRect = enforceBoundaries(newRect, prev);
            updateRectangleWithDebounce(boundedRect);
            return boundedRect;
        });

        startPositionRef.current = { x: e.clientX, y: e.clientY };
    }, [isDragging, isResizing, resizeHandle, enforceBoundaries, updateRectangleWithDebounce]);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        
        if (value !== '' && value.length > 3) return;

        const numValue = value === '' ? 0 : Math.max(0, parseInt(value, 10));
        
        setRectangle(prev => {
            const updatedRect = { ...prev, [name]: numValue };
            const boundedRect = enforceBoundaries(updatedRect, prev);
            updateRectangleWithDebounce(boundedRect);
            return boundedRect;
        });
    }, [enforceBoundaries, updateRectangleWithDebounce]);

    const handleSpinnerClick = useCallback((prop, increment) => {
        setRectangle(prev => {
            const updatedRect = { ...prev, [prop]: prev[prop] + increment };
            const boundedRect = enforceBoundaries(updatedRect, prev);
            updateRectangleWithDebounce(boundedRect);
            return boundedRect;
        });
    }, [enforceBoundaries, updateRectangleWithDebounce]);

    // Is resizing the rectangle
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

    // Is dragging the rectangle
    const startDrag = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        startPositionRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    // Stopped resizing or dragging the rectangle
    const stopInteraction = useCallback(() => {
        if (!isResizing && !isDragging) return;
        setIsResizing(false);
        setIsDragging(false);
        setResizeHandle(null);
        updateRectangleWithDebounce(rectangle);
    }, [isResizing, isDragging, rectangle, updateRectangleWithDebounce]);

    // Render resize handles for the rectangle
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

    // Show loading state while fetching initial data
    if (loading) {
        return <div>Loading...</div>;
    }
    // Render the main application UI
    return (
        <div className="App">
            <h1>Interactive Rectangle</h1>
            <div className="svg-container">
                <svg 
                    ref={svgRef}
                    width={rectangle.svgWidth} 
                    height={rectangle.svgHeight} 
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
                                className="info-input"
                                maxLength="3"
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