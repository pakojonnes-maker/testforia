// apps/client/src/pages/ReelsView.tsx - INTEGRACIÓN FINAL
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../App';
import ReelsContainer from '../components/reels/ReelsContainer';
import { Box, Typography, CircularProgress } from '@mui/material';

function ReelsView() {
  const restaurantData = useRestaurant();
  const params = useParams();
  const navigate = useNavigate();

  const { initialSectionIndex, initialDishIndex } = useMemo(() => {
    if (!restaurantData?.sections) {
      return { initialSectionIndex: 0, initialDishIndex: 0 };
    }

    let sectionIndex = 0;
    let dishIndex = 0;

    if (params.sectionId) {
      const foundSectionIndex = restaurantData.sections.findIndex(
        s => s.id === params.sectionId
      );
      if (foundSectionIndex !== -1) {
        sectionIndex = foundSectionIndex;

        if (params.dishId && restaurantData.dishesBySection[foundSectionIndex]) {
          const dishes = restaurantData.dishesBySection[foundSectionIndex].dishes;
          const foundDishIndex = dishes.findIndex((d: any) => d.id === params.dishId);
          if (foundDishIndex !== -1) {
            dishIndex = foundDishIndex;
          }
        }
      }
    }

    return { initialSectionIndex: sectionIndex, initialDishIndex: dishIndex };
  }, [restaurantData, params.sectionId, params.dishId]);

  const handleClose = () => {
    const restaurant = restaurantData?.restaurant;
    if (!restaurant?.slug) {
      navigate('/');
      return;
    }

    if (params.sectionId || params.dishId) {
      navigate(`/${restaurant.slug}/r`);
    } else {
      navigate(`/${restaurant.slug}`);
    }
  };

  if (!restaurantData) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#000'
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!restaurantData.sections?.length) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#000',
          color: 'white',
          p: 4,
          textAlign: 'center'
        }}
      >
        <Typography variant="h5">
          No hay menú disponible en este momento
        </Typography>
      </Box>
    );
  }

  return (
    <ReelsContainer
      restaurantData={restaurantData}
      initialSectionIndex={initialSectionIndex}
      initialDishIndex={initialDishIndex}
      onClose={handleClose}
    />
  );
}

export default ReelsView;
