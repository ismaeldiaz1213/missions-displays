import React from 'react';
import mapImage from '../assets/BlankMap-World_gray.svg';
import { useNavigate } from 'react-router-dom'; // If you're using React Router
import mapTitle from '../assets/MapSelectionBanner.png';


const RegionSelection: React.FC = () => {
    const navigate = useNavigate(); // Hook to navigate programmatically

    const handleClick = (continent: string) => {
        navigate(`/${continent}`); // Navigate to the desired page
    };

    return (
    <div>
       <img
            src={mapTitle}
            alt="Map Banner"
            useMap="#world-map" // Link the image to the map
            style={{ width: '100%', height: '100%', marginBottom: '10px' }}
       />
       <img
            src={mapImage}
            alt="World Map"
            useMap="#world-map" // Link the image to the map
            style={{ width: '100%', height: 'auto' }}
        />
        <map name="world-map">
            {/* Define clickable areas for each continent */}
            <area
                shape="rect"
                coords="10,10,200,200" // The coordinates of the area (adjust these)
                alt="Africa"
                title="Africa"
                onClick={() => handleClick('africa')}
            />
            <area
                shape="rect"
                coords="220,10,400,200" // Adjust for each continent
                alt="Asia"
                title="Asia"
                onClick={() => handleClick('asia')}
            />
            {/* Add more areas for other continents */}
        </map>
    </div>
  );
};

export default RegionSelection;