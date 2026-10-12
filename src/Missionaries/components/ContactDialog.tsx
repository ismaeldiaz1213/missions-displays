import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Button, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import PublicIcon from '@mui/icons-material/Public';
import { Missionary } from '../../types';

interface ContactDialogProps {
  open: boolean;
  missionary: Missionary;
  onClose: () => void;
}

const ContactDialog: React.FC<ContactDialogProps> = ({ open, missionary, onClose }) => {
  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <EmailIcon sx={{ mr: 1 }} />;
      case 'phone':
        return <PhoneIcon sx={{ mr: 1 }} />;
      case 'facebook':
        return <FacebookIcon sx={{ mr: 1 }} />;
      case 'instagram':
        return <InstagramIcon sx={{ mr: 1 }} />;
      case 'website':
        return <PublicIcon sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        📞 Información de Contacto
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {missionary.contactInfo.length > 0 ? (
          <Box>
            {missionary.contactInfo.map((contact, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  p: 1.5,
                  background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <Box sx={{ color: '#2563EB', display: 'flex', alignItems: 'center' }}>
                  {getContactIcon(contact.type)}
                </Box>
                {/* Plain text on purpose: a link would take people off the kiosk (mail app, phone app, Facebook…) */}
                <Typography sx={{ color: '#1F2937', fontWeight: 600, fontSize: '1.05rem', overflowWrap: 'anywhere' }}>
                  {contact.value}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ color: '#9CA3AF' }}>
            No hay información de contacto disponible.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          fullWidth
          sx={{
            textTransform: 'none', fontWeight: 800, fontSize: '1.1rem', borderRadius: '999px', py: 1.5,
            color: '#fff', bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#2563EB' },
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactDialog;
