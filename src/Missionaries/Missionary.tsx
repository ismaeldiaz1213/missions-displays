import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
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
          El painista Manny Robles con raizes Mexicanas atendio Hiles Anderson College y 
          fue el pianista numero uno en la Iglesia Bautista Libertad. Ahora esta con
          West Coast Baptist College como profesor de musica. Amen hermano!
        </Typography>
      </Box>
      {/* Middle Section with image collage and PDF letter viewer */}
      <Grid2 container spacing={2} mb={4}>
        <Grid2 size={{ xs:12, md:4 }}>
          <Paper 
            sx={{ p: 2}}>
            <Typography variant="h6">Column 2</Typography>
            <Typography variant="body2">
              Placeholder text for the second column. Possibly location info or key stats.
            </Typography>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs:12, md:4 }}>
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

      {/* Special notes and contact */}
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
    </Box>
  );
};

export default Missionary;