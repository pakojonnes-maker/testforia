import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
  Avatar,
  Rating,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Tooltip,
  IconButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Star as StarIcon,
  StarOutline as StarOutlineIcon,
  Reply as ReplyIcon,
  CheckCircle as CheckCircleIcon,
  Flag as FlagIcon,
  SentimentSatisfied as SatisfiedIcon,
  SentimentDissatisfied as DissatisfiedIcon,
  SentimentVeryDissatisfied as VeryDissatisfiedIcon,
  ThumbUp as ThumbUpIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// Interfaces para tipado
interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_photo?: string;
  dish_id?: string;
  dish_name?: string;
  restaurant_id: string;
  rating: number;
  comment: string;
  created_at: string;
  response?: string;
  response_date?: string;
}

interface ReviewStats {
  avg_rating: number;
  total_reviews: number;
  positive_percentage: number; // porcentaje de reseñas con 4+ estrellas
  response_rate: number; // porcentaje de reseñas respondidas
  rating_distribution: {
    [key: number]: number; // clave: rating (1-5), valor: cantidad
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reviews-tabpanel-${index}`}
      aria-labelledby={`reviews-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.currentRestaurant?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedRating, setSelectedRating] = useState<Review | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [responseText, setResponseText] = useState<string>('');

  // Consulta de reseñas
  const {
    data: reviews,
    isLoading: isLoadingReviews
  } = useQuery<Review[]>({
    queryKey: ['reviews', restaurantId, filterStatus],
    queryFn: () => apiClient.getReviews(restaurantId as string, filterStatus),
    enabled: !!restaurantId,
  });

  // Consulta de estadísticas de reseñas
  const {
    data: reviewStats,
    isLoading: isLoadingStats
  } = useQuery<ReviewStats>({
    queryKey: ['review-stats', restaurantId],
    queryFn: () => apiClient.getReviewStats(restaurantId as string),
    enabled: !!restaurantId,
  });

  // Mutación para responder a reseñas
  const respondReviewMutation = useMutation({
    mutationFn: (data: { reviewId: string, response: string }) => 
      apiClient.respondToReview(restaurantId as string, data.reviewId, data.response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['review-stats', restaurantId] });
      setReplyDialogOpen(false);
      setResponseText('');
    },
  });

  // Mutación para reportar reseña
  const reportReviewMutation = useMutation({
    mutationFn: (reviewId: string) => 
      apiClient.reportReview(restaurantId as string, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', restaurantId] });
    },
  });

  // Función para renderizar el emoji según la calificación
  const renderRatingEmoji = (rating: number): JSX.Element => {
    if (rating >= 4) return <SatisfiedIcon color="success" />;
    if (rating >= 2) return <DissatisfiedIcon color="warning" />;
    return <VeryDissatisfiedIcon color="error" />;
  };

  // Manejadores de eventos
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (event: SelectChangeEvent): void => {
    setFilterStatus(event.target.value);
  };

  const handleOpenReplyDialog = (review: Review): void => {
    setSelectedRating(review);
    setReplyDialogOpen(true);
    setResponseText(review.response || '');
  };

  const handleSendResponse = (): void => {
    if (!selectedRating || !responseText.trim()) return;
    
    respondReviewMutation.mutate({
      reviewId: selectedRating.id,
      response: responseText.trim()
    });
  };

  const handleReportReview = (reviewId: string): void => {
    reportReviewMutation.mutate(reviewId);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom component="h1">
        Reseñas y Feedback
      </Typography>

      {isLoadingReviews || isLoadingStats ? (
        <LinearProgress sx={{ mb: 4 }} />
      ) : (
        <>
          {/* Tarjetas de estadísticas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {reviewStats?.avg_rating?.toFixed(1) || "0.0"}
                  </Typography>
                  <Rating 
                    value={reviewStats?.avg_rating || 0} 
                    precision={0.1} 
                    readOnly 
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Calificación media
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" gutterBottom>
                    {reviewStats?.total_reviews || 0}
                  </Typography>
                  <Typography variant="body2">
                    Reseñas totales
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" gutterBottom>
                    {reviewStats?.positive_percentage || 0}%
                  </Typography>
                  <Typography variant="body2">
                    Reseñas positivas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" gutterBottom>
                    {reviewStats?.response_rate || 0}%
                  </Typography>
                  <Typography variant="body2">
                    Tasa de respuesta
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Distribución de calificaciones */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Distribución de calificaciones
            </Typography>
            <Grid container spacing={2} alignItems="center">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviewStats?.rating_distribution?.[rating] || 0;
                const percentage = reviewStats?.total_reviews 
                  ? Math.round((count / reviewStats.total_reviews) * 100) 
                  : 0;
                
                return (
                  <Grid item xs={12} key={rating}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ minWidth: 50, display: 'flex', alignItems: 'center' }}>
                        <Typography>{rating}</Typography>
                        <StarIcon fontSize="small" sx={{ ml: 0.5, color: 'gold' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, mr: 2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={percentage} 
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: 
                                rating >= 4 ? 'success.main' : 
                                rating >= 3 ? 'warning.main' : 'error.main',
                              borderRadius: 5,
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ minWidth: 70 }}>
                        <Typography variant="body2">{count} ({percentage}%)</Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* Lista de reseñas */}
          <Paper sx={{ mb: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Todas las reseñas" />
                <Tab label="Positivas" />
                <Tab label="Neutras" />
                <Tab label="Negativas" />
                <Tab label="Sin responder" />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="sort-review-label">Ordenar por</InputLabel>
                  <Select
                    labelId="sort-review-label"
                    value={filterStatus}
                    label="Ordenar por"
                    onChange={handleFilterChange}
                    defaultValue="recent"
                  >
                    <MenuItem value="recent">Más recientes</MenuItem>
                    <MenuItem value="rating_high">Mayor puntuación</MenuItem>
                    <MenuItem value="rating_low">Menor puntuación</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Grid container spacing={3}>
                {reviews && reviews.length > 0 ? (
                  reviews.map((review) => (
                    <Grid item xs={12} key={review.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar src={review.user_photo} alt={review.user_name}>
                                {review.user_name?.charAt(0) || '?'}
                              </Avatar>
                              <Box sx={{ ml: 2 }}>
                                <Typography variant="subtitle1">{review.user_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                            <Box>
                              <Rating value={review.rating} readOnly />
                              {review.dish_name && (
                                <Chip 
                                  label={review.dish_name} 
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" paragraph>
                            {review.comment}
                          </Typography>
                          
                          {review.response && (
                            <Box sx={{ mt: 2, pl: 2, borderLeft: 1, borderColor: 'primary.main' }}>
                              <Typography variant="subtitle2">
                                Respuesta del restaurante:
                              </Typography>
                              <Typography variant="body2">
                                {review.response}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {review.response_date ? new Date(review.response_date).toLocaleDateString() : ''}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                          <Button 
                            startIcon={<ReplyIcon />}
                            onClick={() => handleOpenReplyDialog(review)}
                          >
                            {review.response ? 'Editar respuesta' : 'Responder'}
                          </Button>
                          <Tooltip title="Reportar reseña inapropiada">
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => handleReportReview(review.id)}
                            >
                              <FlagIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography>
                        No hay reseñas en esta categoría
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Paper>
          
          {/* Diálogo para responder reseñas */}
          <Dialog 
            open={replyDialogOpen} 
            onClose={() => setReplyDialogOpen(false)}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle>
              Responder a la reseña
            </DialogTitle>
            <DialogContent>
              {selectedRating && (
                <>
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar src={selectedRating.user_photo} alt={selectedRating.user_name}>
                        {selectedRating.user_name?.charAt(0) || '?'}
                      </Avatar>
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="subtitle1">{selectedRating.user_name}</Typography>
                        <Rating value={selectedRating.rating} readOnly size="small" />
                      </Box>
                    </Box>
                    <Typography variant="body2">
                      {selectedRating.comment}
                    </Typography>
                  </Box>
                  
                  <TextField
                    autoFocus
                    label="Tu respuesta"
                    multiline
                    rows={4}
                    fullWidth
                    placeholder="Escribe aquí tu respuesta a esta reseña..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Consejos para responder:
                    </Typography>
                    <Typography variant="body2">
                      • Agradece al cliente por su feedback, incluso si es negativo.<br />
                      • Mantén un tono profesional y cortés.<br />
                      • Si es una queja, explica cómo planeas resolver el problema.<br />
                      • Personaliza tu respuesta, evita respuestas genéricas.
                    </Typography>
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReplyDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSendResponse}
                disabled={!responseText.trim() || respondReviewMutation.isPending}
              >
                {respondReviewMutation.isPending ? 'Enviando...' : 'Publicar respuesta'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Container>
  );
};

export default ReviewsPage;