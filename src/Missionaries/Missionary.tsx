import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Grid2 from '@mui/material/Grid2';
import { pdfjs, Document, Page } from 'react-pdf';
import samplePdf from '../assets/2025_Junio_Carta_de_Oracion.pdf';
//import testPDF from '../assets/testingPDF.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Missionary: React.FC = () => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1); // reset to page 1 on load
  }

  function goToPrevPage() {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }
  
  return (
    <Box p={4}>
      {/* Missionary information */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom>
          Familia Robles - Lancaster, California, USA
        </Typography>
        <Typography variant="body1">
          Amen hermano!
        </Typography>
      </Box>
      {/* Middle Section with image collage and PDF letter viewer */}
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs:12, md:7 }}>
          <Paper 
            sx={{ p: 2}}>
            <Typography variant="h6">Fotos y informacion</Typography>
            <ImageList sx={{ width: 800, height: 600 }} cols={4} rowHeight={164}>
              {itemData.map((item) => (
                <ImageListItem key={item.img}>
                  <img
                    srcSet={`${item.img}?w=164&h=164&fit=crop&auto=format&dpr=2 2x`}
                    src={`${item.img}?w=164&h=164&fit=crop&auto=format`}
                    alt={item.title}
                    loading="lazy"
                  />
                </ImageListItem>
              ))}
            </ImageList>
            {/* Special Notes */}
            <Box mb={4}>
              <Typography variant="h5" gutterBottom>
                Notas Especiales
              </Typography>
              <Typography variant="body1">
                This area can include links, follow-up actions, or a further description of the mission's impact.
              </Typography>
            </Box>

            {/* Buttons */}
            <Box display="flex" gap={2}>
              <Button variant="outlined">Regresar</Button>
              <Button variant="contained">Contactar al Misionero</Button>
            </Box>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs:12, md:5 }}>
          <Paper sx=
            {{ p: 2 }}
          >
            <Typography variant="h6">Letras del Misionero</Typography>
            <Document file={samplePdf} onLoadSuccess={onDocumentLoadSuccess}>
              <Page 
                pageNumber={pageNumber} 
                renderAnnotationLayer={false}
                renderTextLayer={false} 
                scale={1.0}
              />
            </Document>

            <Box mt={2} display="flex" justifyContent="center" gap={2}>
              <Button
                variant="outlined"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
              >
                Atras
              </Button>

              <Typography variant="body1" alignSelf="center">
                Pagina {pageNumber} de {numPages}
              </Typography>

              <Button
                variant="outlined"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
              >
                Siguente
              </Button>
            </Box>
          </Paper>
        </Grid2>
      </Grid2>
    </Box>
  );
};

const itemData = [
  {
    img: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e',
    title: 'Breakfast',
  },
  {
    img: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d',
    title: 'Burger',
  },
  {
    img: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45',
    title: 'Camera',
  },
  {
    img: 'https://images.unsplash.com/photo-1444418776041-9c7e33cc5a9c',
    title: 'Coffee',
  },
  {
    img: 'https://images.unsplash.com/photo-1533827432537-70133748f5c8',
    title: 'Hats',
  },
  {
    img: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62',
    title: 'Honey',
  },
  {
    img: 'https://images.unsplash.com/photo-1516802273409-68526ee1bdd6',
    title: 'Basketball',
  },
  {
    img: 'https://images.unsplash.com/photo-1518756131217-31eb79b20e8f',
    title: 'Fern',
  },
  {
    img: 'https://images.unsplash.com/photo-1597645587822-e99fa5d45d25',
    title: 'Mushrooms',
  },
  {
    img: 'https://images.unsplash.com/photo-1567306301408-9b74779a11af',
    title: 'Tomato basil',
  },
  {
    img: 'https://images.unsplash.com/photo-1471357674240-e1a485acb3e1',
    title: 'Sea star',
  },
  {
    img: 'https://images.unsplash.com/photo-1589118949245-7d38baf380d6',
    title: 'Bike',
  },
];

export default Missionary;