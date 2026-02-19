import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import { useNavigate } from 'react-router-dom';
import { Missionary } from '../../types';

interface MissionaryPreviewCardProps {
  missionary: Missionary;
}

export default function ActionAreaCard({ missionary }: MissionaryPreviewCardProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/misionero/${missionary.id}`);
  };

  return (
    <Card
      sx={{
        maxWidth: 345,
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        boxShadow: '0 4px 6px rgba(30, 58, 138, 0.1)',
        border: '1px solid #E5E7EB',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 10px 15px rgba(30, 58, 138, 0.15)',
        },
      }}
    >
      <CardActionArea onClick={handleClick}>
        <CardMedia
          component="img"
          height="200"
          image={missionary.profileImage}
          alt={`${missionary.name} ${missionary.lastName}`}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent>
          <Typography
            gutterBottom
            variant="h6"
            component="div"
            sx={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
            }}
          >
            {missionary.name} {missionary.lastName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
            {missionary.missionType}
          </Typography>
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            📍 {missionary.location.city}, {missionary.location.country}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#4B5563',
              mt: 1,
              fontSize: '0.875rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {missionary.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}