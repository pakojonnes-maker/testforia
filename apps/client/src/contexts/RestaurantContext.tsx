import React, { useContext } from 'react';

export interface RestaurantData {
    restaurant: any;
    sections: any[];
    dishesBySection: any;
    languages: any[];
    reelsConfig?: any;
}

const RestaurantContext = React.createContext<RestaurantData | null>(null);

export const useRestaurant = () => {
    const context = useContext(RestaurantContext);
    if (!context) {
        throw new Error('useRestaurant debe usarse dentro de RestaurantContext.Provider');
    }
    return context;
};

export const RestaurantProvider = RestaurantContext.Provider;
export default RestaurantContext;
