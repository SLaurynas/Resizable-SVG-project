![image](https://github.com/user-attachments/assets/17a065d0-b564-45ae-82b8-d348030f1491)

# Resizable Rectangle Project

This project consists of a React frontend and an ASP.NET Core backend for displaying and resizing a rectangle.

### Prerequisites

- Node.js (v14 or later)
- npm (usually comes with Node.js)
- .NET SDK (v6.0 or later)

## Debugging Information

When debugging this project, keep the following points in mind:

1. **Backend API**: The frontend expects the backend API to be running on `https://localhost:5001`. Make sure your backend is running and accessible at this address.

2. **CORS**: If you encounter CORS issues, ensure that the backend is properly configured to allow requests from the frontend origin ( `http://localhost:3000`).

3. **Rectangle Dimensions**: The initial rectangle dimensions are loaded from a JSON file on the backend. If you're not seeing the correct initial dimensions, check the `data/rectangle.json` file in the backend project.

4. **Resizing Validation**: The backend implements a 10-second delay and validates that the width doesn't exceed the height.

5. **Cancellation of Updates**: The frontend uses the `AbortController` API to cancel ongoing update requests when a new resize operation starts.
