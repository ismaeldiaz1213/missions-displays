
import React from 'react';
import missionsVideo from '../assets/FinalMissionsVideo.mp4';
import './style.css';
import { useNavigate } from 'react-router-dom'; // If you're using React Router

const Home: React.FC = () => {
    const navigate = useNavigate(); // Hook to navigate programmatically

    const handleClick = () => {
        navigate('/region-selection'); // Navigate to the desired page
    };

    return (
    <>
        <div className='video'>
                <video
                    src={missionsVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={handleClick}
                    style={{ pointerEvents: 'auto' }} // Prevent user interaction
                />
        </div>
    </>
  );
};

export default Home;