// src/pages/admin/landing/SectionCard.tsx
import { Paper, Box, Typography, Chip, IconButton, alpha } from '@mui/material';
import {
  DragIndicator,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Home,
  Info,
  RestaurantMenu,
  PhotoLibrary,
  LocationOn,
  ContactMail,
  Settings,
} from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SECTION_ICONS: { [key: string]: JSX.Element } = {
  hero: <Home />,
  about: <Info />,
  menu: <RestaurantMenu />,
  gallery: <PhotoLibrary />,
  location: <LocationOn />,
  contact: <ContactMail />,
};

interface Props {
  section: any;
  onEdit: (section: any) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export default function SectionCard({ section, onEdit, onDelete, onToggle }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 8 : 1}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        border: section.is_active ? '2px solid transparent' : `2px dashed ${alpha('#999', 0.3)}`,
        opacity: section.is_active ? 1 : 0.6,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: isDragging ? undefined : '0 8px 24px rgba(0,0,0,0.12)',
          borderColor: section.is_active ? alpha('#667eea', 0.3) : undefined,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Drag Handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: 'grab',
            color: '#999',
            '&:active': { cursor: 'grabbing' },
            display: { xs: 'none', sm: 'flex' },
            touchAction: 'none',
          }}
        >
          <DragIndicator />
        </Box>

        {/* Icon */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: alpha('#667eea', 0.1),
            color: '#667eea',
            display: 'flex',
          }}
        >
          {SECTION_ICONS[section.section_key] || <Settings />}
        </Box>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              {section.section_name}
            </Typography>
            <Chip
              label={section.variant}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: 24,
                backgroundColor: alpha('#667eea', 0.1),
                color: '#667eea',
                fontWeight: 600,
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#666', display: { xs: 'none', sm: 'block' } }}>
            {section.description}
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={() => onToggle(section.id)}
            sx={{
              color: section.is_active ? '#4caf50' : '#999',
              '&:hover': { backgroundColor: alpha(section.is_active ? '#4caf50' : '#999', 0.1) },
            }}
          >
            {section.is_active ? <Visibility /> : <VisibilityOff />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onEdit(section)}
            sx={{
              color: '#667eea',
              '&:hover': { backgroundColor: alpha('#667eea', 0.1) },
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDelete(section.id)}
            sx={{
              color: '#f44336',
              '&:hover': { backgroundColor: alpha('#f44336', 0.1) },
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
