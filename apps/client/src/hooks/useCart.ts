import { useState, useCallback, useRef } from 'react';

export interface CartItem {
    dishId: string;
    name: string;
    price: number;
    quantity: number;
    portion: 'full' | 'half';
    image?: string;
    videoUrl?: string;
    addedAt: string;
}

interface TrackFn {
    (ev: { type: string; entityId?: string; entityType?: string; value?: any }): void;
}

interface UseCartParams {
    /** Generic tracker queue (batched + sendBeacon-on-close), from useDishTracking(). */
    track: TrackFn;
    currentLanguage: string;
    /** Looks up a translation string, e.g. from reelConfig.translations */
    t: (key: string, defaultText: string) => string;
    /** Fallback dish name when no translation is available */
    defaultDishName?: string;
}

/**
 * Cart state + server-side tracking (created/item added/removed/quantity/opened).
 *
 * Tracking events go through the shared `track()` queue (batched, flushed every
 * few seconds or via sendBeacon on page close) instead of firing an individual
 * POST per cart action — an "add to cart" spree no longer means a burst of
 * one-off network requests.
 *
 * Cart actions read/write via refs (not the `cart` state directly) so their
 * function identity stays stable across cart mutations. Dish cards render in
 * a loop (swiper slides / list rows) and receive these as props — a stable
 * reference lets callers wrap them in React.memo without every cart change
 * invalidating every card's memo.
 */
export function useCart({ track, currentLanguage, t, defaultDishName = 'Plato' }: UseCartParams) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartId, setCartId] = useState<string | null>(null);
    const [openCartDrawer, setOpenCartDrawer] = useState(false);

    const cartRef = useRef<CartItem[]>(cart);
    const cartIdRef = useRef<string | null>(cartId);

    const applyCart = useCallback((updated: CartItem[]) => {
        cartRef.current = updated;
        setCart(updated);
    }, []);

    const generateCartId = useCallback(() => {
        return 'cart_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }, []);

    const trackCartCreated = useCallback((newCartId: string) => {
        track({ type: 'cart_created', entityId: newCartId, entityType: 'cart' });
    }, [track]);

    const trackItemAdded = useCallback((dishId: string, quantity: number, price: number, sequence: number, updatedCart: CartItem[]) => {
        if (!cartIdRef.current) return;
        const totalItems = updatedCart.reduce((acc, item) => acc + item.quantity, 0);
        const totalValue = updatedCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const uniqueDishes = updatedCart.length;
        const itemsSnapshot = updatedCart.map(item => ({ dishId: item.dishId, name: item.name, quantity: item.quantity, price: item.price }));

        track({
            type: 'cart_item_added',
            entityId: dishId,
            entityType: 'dish',
            value: JSON.stringify({ cartId: cartIdRef.current, quantity, price, sequence, totalItems, totalValue, uniqueDishes, items: itemsSnapshot })
        });
    }, [track]);

    const trackItemRemoved = useCallback((dishId: string, updatedCart: CartItem[]) => {
        if (!cartIdRef.current) return;
        const totalItems = updatedCart.reduce((acc, item) => acc + item.quantity, 0);
        const totalValue = updatedCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const uniqueDishes = updatedCart.length;
        const itemsSnapshot = updatedCart.map(item => ({ dishId: item.dishId, name: item.name, quantity: item.quantity, price: item.price }));

        track({
            type: 'cart_item_removed',
            entityId: dishId,
            entityType: 'dish',
            value: JSON.stringify({ cartId: cartIdRef.current, totalItems, totalValue, uniqueDishes, items: itemsSnapshot })
        });
    }, [track]);

    const trackItemQuantityUpdated = useCallback((dishId: string, newQuantity: number, oldQuantity: number, updatedCart: CartItem[]) => {
        if (!cartIdRef.current) return;
        const totalItems = updatedCart.reduce((acc, item) => acc + item.quantity, 0);
        const totalValue = updatedCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const uniqueDishes = updatedCart.length;
        const itemsSnapshot = updatedCart.map(item => ({ dishId: item.dishId, name: item.name, quantity: item.quantity, price: item.price }));

        track({
            type: 'cart_item_quantity',
            entityId: dishId,
            entityType: 'dish',
            value: JSON.stringify({ cartId: cartIdRef.current, newQuantity, oldQuantity, totalItems, totalValue, uniqueDishes, items: itemsSnapshot })
        });
    }, [track]);

    const trackCartOpened = useCallback(() => {
        if (!cartIdRef.current) return;
        const currentCart = cartRef.current;
        track({
            type: 'cart_opened',
            entityId: cartIdRef.current,
            entityType: 'cart',
            value: JSON.stringify({
                totalItems: currentCart.reduce((acc, item) => acc + item.quantity, 0),
                totalValue: currentCart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
            })
        });
    }, [track]);

    const addToCart = useCallback(async (dish: any, quantity: number, portion: 'full' | 'half' = 'full', price?: number) => {
        const currentCart = cartRef.current;
        const existingItem = currentCart.find(item => item.dishId === dish.id && item.portion === portion);
        let currentCartId = cartIdRef.current;

        if (!currentCartId) {
            currentCartId = generateCartId();
            cartIdRef.current = currentCartId;
            setCartId(currentCartId);
            trackCartCreated(currentCartId);
        }

        let dishName = dish?.translations?.name?.[currentLanguage] || dish?.name || defaultDishName;
        if (portion === 'half') {
            const suffix = t('half_portion_suffix', ' (½)');
            dishName = `${dishName}${suffix}`;
        }

        const media = dish?.media?.[0];
        const isVideoMedia = media?.media_type === 'video' || media?.type === 'video' || media?.url?.endsWith('.mp4');
        const image = media?.thumbnail_url || (!isVideoMedia ? media?.url : undefined);
        const videoUrl = isVideoMedia ? media?.url : undefined;
        const itemPrice = price !== undefined ? price : (portion === 'half' ? (dish.half_price || 0) : (dish.price || 0));

        let updatedCart: CartItem[];

        if (existingItem) {
            const oldQuantity = existingItem.quantity;
            updatedCart = currentCart.map(item =>
                (item.dishId === dish.id && item.portion === portion) ? { ...item, quantity: item.quantity + quantity } : item
            );
            applyCart(updatedCart);
            trackItemQuantityUpdated(dish.id, existingItem.quantity + quantity, oldQuantity, updatedCart);
        } else {
            const newItem: CartItem = {
                dishId: dish.id,
                name: dishName,
                price: itemPrice,
                quantity,
                portion,
                image,
                videoUrl,
                addedAt: new Date().toISOString()
            };
            updatedCart = [...currentCart, newItem];
            applyCart(updatedCart);
            trackItemAdded(dish.id, quantity, itemPrice, currentCart.length + 1, updatedCart);
        }
    }, [applyCart, currentLanguage, generateCartId, trackCartCreated, trackItemAdded, trackItemQuantityUpdated, t, defaultDishName]);

    const removeFromCart = useCallback(async (dishId: string, portion: 'full' | 'half') => {
        const updatedCart = cartRef.current.filter(item => !(item.dishId === dishId && item.portion === portion));
        applyCart(updatedCart);
        trackItemRemoved(dishId, updatedCart);
    }, [applyCart, trackItemRemoved]);

    const updateCartItemQuantity = useCallback(async (dishId: string, newQuantity: number, portion: 'full' | 'half') => {
        const item = cartRef.current.find(i => i.dishId === dishId && i.portion === portion);
        if (!item) return;

        if (newQuantity <= 0) {
            await removeFromCart(dishId, portion);
        } else {
            const updatedCart = cartRef.current.map(i => (i.dishId === dishId && i.portion === portion) ? { ...i, quantity: newQuantity } : i);
            applyCart(updatedCart);
            trackItemQuantityUpdated(dishId, newQuantity, item.quantity, updatedCart);
        }
    }, [applyCart, removeFromCart, trackItemQuantityUpdated]);

    const getTotalPrice = useCallback(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
    const getTotalItems = useCallback(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

    const handleOpenCartDrawer = useCallback(async () => {
        setOpenCartDrawer(true);
        trackCartOpened();
    }, [trackCartOpened]);

    return {
        cart,
        cartId,
        openCartDrawer,
        setOpenCartDrawer,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        getTotalPrice,
        getTotalItems,
        handleOpenCartDrawer
    };
}
