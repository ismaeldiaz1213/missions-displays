import React from 'react';
import mapImage from '../assets/BlankMap-World_gray.svg';
import { useNavigate } from 'react-router-dom';
import mapTitle from '../assets/MapSelectionBanner.png';

const RegionSelection: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = (continent: string) => {
        navigate(`/${continent}`);
    };

    // Coordinates for the areas (as arrays of numbers)
    const africaCoords = [800, 235, 1120, 650]; // [x1, y1, x2, y2]
    const asiaCoords = [980, 10, 1500, 650]; // [x1, y1, x2, y2]
    const northAmericaCoords = [220, 10, 400, 200]; // [x1, y1, x2, y2]

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh', // Full screen height
            width: '100vw',  // Full screen width
            overflow: 'hidden', // Prevent scrollbars
            padding: 0,
            margin: 0
        }}>
            <img
                src={mapTitle}
                alt="Map Banner"
                style={{
                    width: '100%',
                    maxWidth: '100%',  // Prevent it from overflowing
                    maxHeight: '20vh',
                    height: 'auto',
                    marginBottom: '20px',
                    objectFit: 'contain',  // Ensure the title image fits correctly
                }}
            />
            <img
                src={mapImage}
                alt="World Map"
                useMap="#world-map" // Link the image to the map
                style={{
                    width: '100%',
                    maxHeight: '80vh',
                    height: '100%',
                    objectFit: 'contain',  // Maintain aspect ratio of the map image
                    outlineColor: 'black',
                    outline: 'solid',
                }}
            />
            <map name="world-map">
                {/* Define clickable areas for each continent */}
                <area
                    shape="rect"
                    coords={africaCoords.join(',')}  // Convert the array to a comma-separated string
                    alt="Africa"
                    title="Africa"
                    onClick={() => handleClick('africa')}
                    className="area africa"
                />
                <area
                    shape="rect"
                    coords={asiaCoords.join(',')}  // Convert the array to a comma-separated string
                    alt="Asia"
                    title="Asia"
                    onClick={() => handleClick('asia')}
                    className="area asia"
                />
                <area
                    shape="rect"
                    coords={northAmericaCoords.join(',')}  // Convert the array to a comma-separated string
                    alt="Norte America"
                    title="Norte America"
                    onClick={() => handleClick('norte-america')}
                    className="area asia"
                />
            </map>
        </div>
    );
};

export default RegionSelection;