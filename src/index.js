
import React from 'react';
import ReactDOM from 'react-dom/client';
 // Optional: You can include your CSS styles here
import App from './App.js'; // Import the main App component


// Create a root for the React application
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component into the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
