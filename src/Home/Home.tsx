import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

export const MISSIONARY_REQUEST_PATH = '/misioneros/solicitud';

const Home: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Mobile devices skip the video splash and go straight to region selection
    if (window.innerWidth < 768) {
      navigate('/region-selection', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="video" onClick={() => navigate('/region-selection')}>
      <video
        src="/FinalMissionsVideo.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <p className="tap-hint" aria-hidden="true">
        <span className="tap-hint-icon">👆</span>
        Toque la pantalla para continuar
      </p>
    </div>
  );
};

export default Home;
