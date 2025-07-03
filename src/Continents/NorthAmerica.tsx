import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ActionAreaCard from './components/MissionaryPreviewCard';
import Grid2 from '@mui/material/Grid2';
import { blueGrey } from '@mui/material/colors';
import './na_style.css';

//TODO: Make sure that this is a usable component by everyone
const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

const NorthAmerica: React.FC = () => {
  return (
    <>
      <Box sx={{ flexGrow: 1}}>
        {/* Title */}
        <Grid2 container spacing={2} sx={{ backgroundColor: blueGrey[100], padding: 2 }}>
          {/* 2/3 width section */}
            <Grid2 size={{xs:12}}> {/* Make this Grid2 take up full width */}
              <h1 className='north-america-title'>Norte America</h1>
            </Grid2>
          <Grid2 size={{xs:12, md:8}}>
            <Grid2 container spacing={2}>
              {/* Render 9 cards in a 3x3 pattern */}
              {Array.from({ length: 9 }).map((_, index) => (
                <Grid2 size={{xs:4}} key={index}>
                  <ActionAreaCard />
                </Grid2>
              ))}
            </Grid2>
          </Grid2>

          {/* 1/3 width section */}
          <Grid2 size={{xs:12, md:4}}>
              <Item>Potentially a map or something goes here idk</Item>
          </Grid2>
        </Grid2>
      </Box>
      {/* Buttons for interaction need to go here */}
    </>
  );
};

export default NorthAmerica;
