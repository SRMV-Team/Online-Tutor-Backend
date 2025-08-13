const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://online-tutor-backend.onrender.com' // Your Render URL
    : 'http://localhost:5000');

export default API_BASE_URL;
