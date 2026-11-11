import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import EditCalendarOutlinedIcon from '@mui/icons-material/EditCalendarOutlined';
import type { QuarterStatus } from '../../data/reports';
import { Tag } from '../adminUi';

export const STATUS_TEXT: Record<QuarterStatus, { es: string; en: string }> = {
  future: { es: 'Aún no empieza', en: 'Not started' },
  open: { es: 'En curso', en: 'In progress' },
  pending: { es: 'Pendiente', en: 'Pending' },
  late: { es: 'Atrasado', en: 'Late' },
  received: { es: 'Recibido', en: 'Received' },
  reviewed: { es: 'Revisado', en: 'Reviewed' },
  noUpdates: { es: 'Sin novedades', en: 'No updates' },
};

const TONE: Record<QuarterStatus, 'grey' | 'blue' | 'amber' | 'red' | 'green'> = {
  future: 'grey', open: 'grey', pending: 'amber', late: 'red', received: 'blue', reviewed: 'green', noUpdates: 'green',
};

const ICON: Record<QuarterStatus, React.ReactNode> = {
  future: <RemoveCircleOutlineIcon />, open: <EditCalendarOutlinedIcon />, pending: <ScheduleIcon />, late: <ErrorOutlineIcon />,
  received: <CheckCircleIcon />, reviewed: <DoneAllIcon />, noUpdates: <CheckCircleIcon />,
};

export const ReportStatusTag: React.FC<{ status: QuarterStatus; lang: 'es' | 'en' }> = ({ status, lang }) => (
  <Tag tone={TONE[status]} icon={ICON[status]}>{STATUS_TEXT[status][lang]}</Tag>
);

/** Excel fill colors for the same statuses. */
export const STATUS_FILL: Record<QuarterStatus, string> = {
  future: 'FFF1F5F9', open: 'FFF1F5F9', pending: 'FFFEF3C7', late: 'FFFEE2E2',
  received: 'FFDBEAFE', reviewed: 'FFDCFCE7', noUpdates: 'FFDCFCE7',
};
