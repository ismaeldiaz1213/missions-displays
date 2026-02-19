import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import { useNavigate } from 'react-router-dom';
import { Missionary } from '../../types';

interface MissionaryPreviewCardProps {
  missionary: Missionary;
  isSelected?: boolean;
}

export default function ActionAreaCard({ missionary, isSelected = false }: MissionaryPreviewCardProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/misionero/${missionary.id}`);
  };

  return (
    <Card
      sx={{
        maxWidth: 345,
        background: isSelected
          ? 'linear-gradient(135deg, #FCD34D 0%, #FDE68A 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        boxShadow: isSelected
          ? '0 0 0 3px #F59E0B, 0 8px 16px rgba(217, 119, 6, 0.3)'
          : '0 4px 6px rgba(30, 58, 138, 0.1)',
        border: isSelected ? '3px solid #F59E0B' : '1px solid #E5E7EB',
        transition: 'all 0.3s ease',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        '&:hover': {
          transform: isSelected ? 'scale(1.02)' : 'translateY(-4px)',
          boxShadow: isSelected
            ? '0 0 0 3px #F59E0B, 0 12px 20px rgba(217, 119, 6, 0.4)'
            : '0 10px 15px rgba(30, 58, 138, 0.15)',
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