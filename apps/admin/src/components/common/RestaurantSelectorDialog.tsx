import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Typography,
    InputAdornment,
    Box,
    Avatar
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface Restaurant {
    id: string;
    name: string;
    slug: string;
    role?: string;
    logo_url?: string;
}

interface RestaurantSelectorDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (restaurantId: string) => void;
    restaurants: Restaurant[];
    currentRestaurantId?: string;
}

export const RestaurantSelectorDialog: React.FC<RestaurantSelectorDialogProps> = ({
    open,
    onClose,
    onSelect,
    restaurants,
    currentRestaurantId
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.slug.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [restaurants, searchTerm]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Cambiar Restaurante</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, mt: 1 }}>
                    <TextField
                        fullWidth
                        placeholder="Buscar restaurante..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                        variant="outlined"
                        size="small"
                        autoFocus
                    />
                </Box>

                {filteredRestaurants.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography>No se encontraron restaurantes</Typography>
                    </Box>
                ) : (
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {filteredRestaurants.map((restaurant) => (
                            <ListItem key={restaurant.id} disablePadding>
                                <ListItemButton
                                    selected={restaurant.id === currentRestaurantId}
                                    onClick={() => onSelect(restaurant.id)}
                                >
                                    {restaurant.logo_url && (
                                        <Avatar
                                            src={restaurant.logo_url}
                                            alt={restaurant.name}
                                            sx={{ width: 32, height: 32, mr: 2 }}
                                        />
                                    )}
                                    <ListItemText
                                        primary={restaurant.name}
                                        secondary={restaurant.slug}
                                    />
                                    {restaurant.id === currentRestaurantId && (
                                        <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                                            ACTUAL
                                        </Typography>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
            </DialogActions>
        </Dialog>
    );
};
