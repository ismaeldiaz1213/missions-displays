import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Mobile devices skip the video splash and go straight to region selection
    if (window.innerWidth < 768) {
      navigate('/region-selection', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="video">
      <video
        src="/FinalMissionsVideo.mp4"
        autoPlay
        loop
        muted
        playsInline
        onClick={() => navigate('/region-selection')}
      />
    </div>
  );
};

export default Home;
