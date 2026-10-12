import React from 'react';
import { usePageTitle } from './usePageTitle';

const NotFound: React.FC = () => {
  usePageTitle('Página no encontrada');
  return (
    <div>
      <h1>Error 404 Page Not Found</h1>
      <p>Please return to home</p>
      <button>Back</button>
    </div>
  );
};

export default NotFound;