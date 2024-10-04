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

    useEffect(() => {
        const getRectangleData = async () => {
            try {
                const data = await fetchRectangleDimensions();
                setRectangle({ ...data, x: 0, y: 0 }); // Initialize position
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

    const stopInteraction = async () => {
        if (!isResizing && !isDragging) return;
        setIsResizing(false);
        setIsDragging(false);
        setResizeHandle(null);
        setIsUpdating(true);
        setError(null);

        abortControllerRef.current = new AbortController();

        try {
            const updatedRectangle = await updateRectangleDimensions(rectangle, abortControllerRef.current.signal);
            setRectangle(prev => ({ ...updatedRectangle, x: prev.x, y: prev.y }));
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
        }
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
                    <span className="info-value">{rectangle.width}px</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Height:</span>
                    <span className="info-value">{rectangle.height}px</span>
                </div>
                <div className="info-item">
                    <span className="info-label">X:</span>
                    <span className="info-value">{rectangle.x}px</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Y:</span>
                    <span className="info-value">{rectangle.y}px</span>
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