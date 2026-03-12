import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>{/* Provides navigation space*/}
      <App />
    </Router>
      
  </React.StrictMode>,
); 