// src/components/guide/GuideCatalogCard.tsx
// Tarjeta del catálogo de zona. Sirve para lugares y experiencias: lo que cambia
// es el chip de tipo y qué datos tiene sentido enseñar (un lugar trae trayecto y
// rating, una experiencia precio tachado y badge).
//
// Se usa también en la vista de solo lectura de agencia (readOnly), donde no hay
// acciones ni datos de negocio.
import {
  Box, Card, CardContent, Typography, Chip, IconButton, Button, Tooltip, Switch,
} from '@mui/material';
import {
  Edit as EditIcon,
  DeleteForever as DeleteForeverIcon,
  LocationOn as LocationOnIcon,
  Star as StarIcon,
  DirectionsWalk as WalkIcon,
  DirectionsCar as DriveIcon,
  DirectionsBike as BikeIcon,
  LocalActivity as LocalActivityIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import {
  CatalogItem, BADGE_LABELS, getCategoryGradient, isExperience, isTrue, priceLabel, displayName,
} from './catalogTypes';

interface Props {
  item: CatalogItem;
  readOnly?: boolean;
  onEdit?: (item: CatalogItem) => void;
  onDelete?: (item: CatalogItem) => void;
  onToggleActive?: (item: CatalogItem) => void;
}

const travelIcon = (mode?: string | null) => {
  if (mode === 'drive') return <DriveIcon sx={{ fontSize: 16 }} />;
  if (mode === 'bike') return <BikeIcon sx={{ fontSize: 16 }} />;
  return <WalkIcon sx={{ fontSize: 16 }} />;
};

export default function GuideCatalogCard({ item, readOnly, onEdit, onDelete, onToggleActive }: Props) {
  const experience = isExperience(item);
  const active = isTrue(item.is_active);
  const badge = item.badge_type && item.badge_type !== 'none' ? item.badge_type : null;
  const isFree = (item.access_type || 'free') === 'free' && !item.price_display;

  const cover = item.cover_image_url
    ? 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,.45) 100%), url(' +
      item.cover_image_url + ') center/cover'
    : getCategoryGradient(item.category);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        opacity: active ? 1 : 0.55,
        borderRadius: 2,
        transition: 'box-shadow .2s, transform .2s',
        '&:hover': { boxShadow: 6, transform: readOnly ? 'none' : 'translateY(-2px)' },
      }}
    >
      {!readOnly && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.92)', '&:hover': { bgcolor: 'white' } }}
              onClick={() => onEdit?.(item)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              color="error"
              sx={{ bgcolor: 'rgba(255,255,255,0.92)', '&:hover': { bgcolor: 'white' } }}
              onClick={() => onDelete?.(item)}
            >
              <DeleteForeverIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Portada real si la hay; si no, el degradado de la categoría */}
      <Box
        sx={{
          height: 150,
          background: cover,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', pr: readOnly ? 0 : 9 }}>
          <Chip
            icon={experience ? <LocalActivityIcon sx={{ fontSize: 14 }} /> : <PlaceIcon sx={{ fontSize: 14 }} />}
            label={experience ? 'Experiencia' : 'Lugar'}
            size="small"
            sx={{
              bgcolor: experience ? 'rgba(124,58,237,0.92)' : 'rgba(255,255,255,0.9)',
              color: experience ? '#fff' : 'text.primary',
              fontWeight: 600,
              fontSize: '0.7rem',
              '& .MuiChip-icon': { color: experience ? '#fff' : 'inherit' },
            }}
          />
          {isTrue(item.is_featured) && (
            <Chip
              icon={<StarIcon sx={{ fontSize: 14 }} />}
              label="Destacado"
              size="small"
              color="warning"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
          {!active && (
            <Chip
              label="Archivado"
              size="small"
              sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={item.category}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.88)', fontWeight: 600, fontSize: '0.7rem' }}
          />
          <Chip
            label={priceLabel(item)}
            size="small"
            sx={{
              bgcolor: isFree ? 'rgba(220,252,231,0.92)' : 'rgba(30,64,175,0.92)',
              color: isFree ? '#166534' : '#fff',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
          {badge && (
            <Chip
              label={BADGE_LABELS[badge] || badge}
              size="small"
              sx={{ bgcolor: 'rgba(236,72,153,0.92)', color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </Box>

      <CardContent sx={{ flexGrow: 1, pt: 2, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap title={displayName(item)}>
          {displayName(item)}
        </Typography>
        {item.name_en && item.name_en !== item.name_es && (
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {item.name_en}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
          {!!item.rating && item.rating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#f59e0b' }}>
              <StarIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" fontWeight={600}>{item.rating}</Typography>
            </Box>
          )}
          {item.travel_time_text && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'text.secondary' }}>
              {travelIcon(item.travel_mode)}
              <Typography variant="caption">{item.travel_time_text}</Typography>
            </Box>
          )}
          {item.original_price_display && (
            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
              {item.original_price_display}
            </Typography>
          )}
          {experience && item.action_type && !readOnly && (
            <Chip size="small" variant="outlined" label={item.action_type} sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
        </Box>
      </CardContent>

      {!readOnly && (
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tooltip title={active ? 'Visible para los huéspedes' : 'Archivado: no se muestra en el guidebook'}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Switch size="small" checked={active} onChange={() => onToggleActive?.(item)} />
              <Typography variant="caption" color="text.secondary">
                {active ? 'Activo' : 'Archivado'}
              </Typography>
            </Box>
          </Tooltip>
          {item.google_maps_url && (
            <Button
              size="small"
              href={item.google_maps_url}
              target="_blank"
              rel="noopener"
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              startIcon={<LocationOnIcon sx={{ fontSize: 14 }} />}
            >
              Maps
            </Button>
          )}
        </Box>
      )}
    </Card>
  );
}
