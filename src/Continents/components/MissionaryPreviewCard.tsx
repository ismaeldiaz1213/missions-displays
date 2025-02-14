import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import missionaryImage from '../../assets/MissionariesTest/mannyFacebook.jpg';

export default function ActionAreaCard() {
  return (
    <>
    <Card sx={{ maxWidth: 345 }}>
      <CardActionArea>
        <CardMedia
          component="img"
          height="140"
          image={missionaryImage}
          alt="Painista robles"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Emmanuel Robles
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Pianista en la Iglesia Bautista Libertad.
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
    <Card sx={{ maxWidth: 345 }}>
    <CardActionArea>
      <CardMedia
        component="img"
        height="140"
        image={missionaryImage}
        alt="Painista robles"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Emmanuel Robles
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Pianista en la Iglesia Bautista Libertad.
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
  <Card sx={{ maxWidth: 345 }}>
    <CardActionArea>
      <CardMedia
        component="img"
        height="140"
        image={missionaryImage}
        alt="Painista robles"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Emmanuel Robles
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Pianista en la Iglesia Bautista Libertad.
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
  </>
  );
};