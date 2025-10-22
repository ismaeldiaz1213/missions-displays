import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import missionaryImage from '../../assets/MissionariesTest/mannyFacebook.jpg';
import { useNavigate } from 'react-router-dom';

export default function ActionAreaCard() {
    const navigate = useNavigate();
    const handleClick = (missionary: string) => {
        navigate(`/misionero/${missionary}`);
    };
  
    return (
    <>
    <Card sx={{ maxWidth: 345 }}>
      <CardActionArea onClick={() =>handleClick('Robles')}>
        <CardMedia
          component="img"
          height="140"
          image={missionaryImage}
          alt="Painista robles"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            El Pianista Robles
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Pianista en West Coast Baptist College
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  </>
  );
};