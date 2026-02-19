import { Box } from '@mui/material';
import React from 'react';
// @ts-ignore
import { Chrono } from 'react-chrono';

const Timeline: React.FC = () => { 
    const items = [
    {
      title: 'Febrero 8, 1950',
      cardTitle: 'Nace el Pastor',
      cardDetailedText:
        'Rogelio Carrizales nacio el 8 de frebrero de 1950 en San Antonio, Texas.',
      media: {
        type: 'IMAGE',
        source: {
          url: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e',
        },
      },
    },
     {
      title: 'Junio 1966',
      cardTitle: 'Es Salvo',
      cardDetailedText:
        'El joven Roy Carrizales hizo una de las mas grandes decisiones de su vida, que ha impactado la vida de muchas personas; rindio su vida de tiempo completo al servicio de nuestro Gran Dios y Salvador Jesucristo.',
      media: {
        type: 'IMAGE',
        source: {
          url: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e',
        },
      },
    },
    {
      title: '1975',
      cardTitle: 'Graduado!',
      cardDetailedText:
        'Siendo miembro de la Iglesia Bautista Puerta la Hermosa, pastoreada por su hermano el pastor Jose Carrizales, viajo a la ciudad de Chattanooga, TN para estudiar Teologia Pastora.',
      media: {
        type: 'IMAGE',
        source: {
          url: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e',
        },
      },
    },
  ];
    return (
        <>
            <Box sx={{ flexGrow: 1, justifyContent: "center"}}>              
                <h1>Historia de Nuestra Iglesia</h1>
            </Box>
            <div>
                <Chrono items={items} mode="VERTICAL_ALTERNATING" />
            </div>
        </>
    );
};

export default Timeline;