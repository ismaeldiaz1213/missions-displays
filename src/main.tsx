// src/main.tsx
import ReactDOM from 'react-dom/client';
//import './index.css'; // If you have any global styles
import App from './App'; // Import the App component
import { BrowserRouter } from 'react-router-dom'; // Import Router for routing

// This ensures the app is rendered into the root element in the HTML
const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
