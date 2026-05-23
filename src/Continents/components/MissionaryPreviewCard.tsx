import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router-dom';
import { Missionary } from '../../types';

interface MissionaryPreviewCardProps {
  missionary: Missionary;
  isSelected?: boolean;
}

export default function ActionAreaCard({ missionary, isSelected = false }: MissionaryPreviewCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: isSelected
          ? '0 0 0 4px #F59E0B, 0 6px 20px rgba(217,119,6,0.4)'
          : '0 4px 12px rgba(30,58,138,0.2)',
        border: isSelected ? '2px solid #F59E0B' : 'none',
        transition: 'all 0.25s ease',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        '&:hover': {
          transform: isSelected ? 'scale(1.02)' : 'scale(1.02)',
          boxShadow: isSelected
            ? '0 0 0 4px #F59E0B, 0 10px 24px rgba(217,119,6,0.5)'
            : '0 8px 24px rgba(30,58,138,0.3)',
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/misionero/${missionary.id}`)}
        sx={{ height: '100%', display: 'block' }}
      >
        {/* Photo fills the entire card */}
        <Box
          component="img"
          src={missionary.profileImage}
          alt={`${missionary.name} ${missionary.lastName}`}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Text overlaid at the bottom with gradient */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: isSelected
              ? 'linear-gradient(transparent 0%, rgba(180,100,0,0.92) 100%)'
              : 'linear-gradient(transparent 0%, rgba(15,30,86,0.92) 100%)',
            px: 1.5,
            pt: 4,
            pb: 1.25,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1.2,
              mb: 0.3,
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {missionary.name} {missionary.lastName}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.85rem',
              display: 'block',
              lineHeight: 1.3,
            }}
          >
            📍 {missionary.location.city}, {missionary.location.country}
          </Typography>
          {missionary.missionType && (
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: '0.82rem',
                display: 'block',
                mt: 0.2,
              }}
            >
              {missionary.missionType}
            </Typography>
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
}
