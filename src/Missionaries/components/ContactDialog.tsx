import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Button, Link, Typography } from '@mui/material';
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
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#2563EB',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
                  },
                }}
              >
                <Box sx={{ color: '#2563EB', display: 'flex', alignItems: 'center' }}>
                  {getContactIcon(contact.type)}
                </Box>
                {contact.type === 'email' ? (
                  <Link
                    href={`mailto:${contact.value}`}
                    sx={{
                      color: '#2563EB',
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {contact.value}
                  </Link>
                ) : contact.type === 'phone' ? (
                  <Link
                    href={`tel:${contact.value}`}
                    sx={{
                      color: '#2563EB',
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {contact.value}
                  </Link>
                ) : (
                  <Link
                    href={contact.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: '#2563EB',
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {contact.value}
                  </Link>
                )}
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
          sx={{
            color: '#2563EB',
            fontWeight: 600,
            '&:hover': {
              background: 'rgba(37, 99, 235, 0.05)',
            },
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactDialog;
