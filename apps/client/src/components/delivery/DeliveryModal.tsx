// apps/client/src/components/delivery/DeliveryModal.tsx
// Sistema de Delivery v4 - Modal con formulario de cliente

import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Button,
    Divider,
    IconButton,
    Chip,
    alpha,
    Alert,
    CircularProgress,
    TextField,
    InputAdornment
} from '@mui/material';
import {
    Close,
    TwoWheeler,
    WhatsApp,
    Phone,
    LocalShipping,
    CreditCard,
    Money,
    LocationOn,
    Warning,
    Person,
    Home,
    Notes
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTracking } from '../../providers/TrackingAndPushProvider';
import { useTranslation } from '../../contexts/TranslationContext';

interface CartItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
}

interface DeliveryConfig {
    is_enabled: boolean;
    show_whatsapp: boolean;
    show_phone: boolean;
    whatsapp_number: string;
    phone_number: string;
    payment_methods: { cash: boolean; card: boolean };
    shipping_cost: number;
    free_shipping_threshold: number;
    minimum_order: number;
    translations: {
        delivery_zones: string;
        custom_message: string;
    };
    ui_strings: Record<string, string>;
}

interface DeliveryModalProps {
    open: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    cartTotal: number;
    deliveryConfig: DeliveryConfig | null;
    restaurantName: string;
    restaurantId?: string;
    currentLanguage?: string;
    isAvailable?: boolean;
    unavailableReason?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

const DeliveryModal: React.FC<DeliveryModalProps> = ({
    open,
    onClose,
    cartItems,
    cartTotal,
    deliveryConfig,
    restaurantName,
    restaurantId,
    currentLanguage: _currentLanguage = 'es',
    isAvailable = true,
    unavailableReason
}) => {
    const { tracker, sessionId } = useTracking();
    const { t } = useTranslation();

    // Get visitor_id from localStorage as fallback
    const visitorId = typeof window !== 'undefined' ? localStorage.getItem('visitor_id') : null;

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<'cash' | 'card' | null>(null);
    const [sending, setSending] = useState(false);
    const [formErrors, setFormErrors] = useState<{ phone?: string; address?: string; payment?: string }>({});

    // Helper para obtener strings de UI
    const ui = (key: string, fallback: string) => {
        return deliveryConfig?.ui_strings?.[key] || t(`delivery.${key}`, fallback);
    };

    // Debug: log payment methods
    console.log('[Delivery] Payment methods config:', deliveryConfig?.payment_methods);

    // Calcular costes
    const { shippingCost, finalTotal, isFreeShipping, meetsMinimum } = useMemo(() => {
        if (!deliveryConfig) return { shippingCost: 0, finalTotal: cartTotal, isFreeShipping: true, meetsMinimum: true };

        const threshold = deliveryConfig.free_shipping_threshold || 0;
        const cost = deliveryConfig.shipping_cost || 0;
        const minimum = deliveryConfig.minimum_order || 0;

        const isFree = threshold > 0 ? cartTotal >= threshold : cost === 0;
        const shipping = isFree ? 0 : cost;

        return {
            shippingCost: shipping,
            finalTotal: cartTotal + shipping,
            isFreeShipping: isFree,
            meetsMinimum: cartTotal >= minimum
        };
    }, [cartTotal, deliveryConfig]);

    // Validar formulario
    const validateForm = (): boolean => {
        const errors: { phone?: string; address?: string; payment?: string } = {};

        if (!customerPhone.trim()) {
            errors.phone = 'El teléfono es obligatorio';
        } else if (customerPhone.trim().length < 9) {
            errors.phone = 'Teléfono inválido';
        }

        if (!customerAddress.trim()) {
            errors.address = 'La dirección es obligatoria';
        }

        // Validar método de pago si hay múltiples opciones
        const hasCash = deliveryConfig?.payment_methods?.cash;
        const hasCard = deliveryConfig?.payment_methods?.card;
        if (hasCash && hasCard && !selectedPayment) {
            errors.payment = 'Selecciona un método de pago';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Guardar pedido en BD
    const saveOrder = async (orderSource: 'whatsapp' | 'phone'): Promise<string | null> => {
        const orderData = {
            restaurant_id: restaurantId,
            customer_name: customerName.trim() || null,
            customer_phone: customerPhone.trim(),
            customer_address: customerAddress.trim(),
            customer_notes: customerNotes.trim() || null,
            items: cartItems.map(item => ({
                dish_id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            subtotal: cartTotal,
            shipping_cost: shippingCost,
            total: finalTotal,
            payment_method: selectedPayment || (deliveryConfig?.payment_methods?.cash && !deliveryConfig?.payment_methods?.card ? 'cash' : deliveryConfig?.payment_methods?.card && !deliveryConfig?.payment_methods?.cash ? 'card' : null),
            session_id: sessionId,
            visitor_id: visitorId,
            order_source: orderSource
        };

        console.log('[Delivery] Saving order:', orderData);
        console.log('[Delivery] API URL:', `${API_URL}/delivery/orders`);

        try {
            const response = await fetch(`${API_URL}/delivery/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            console.log('[Delivery] Response status:', response.status);
            const data = await response.json();
            console.log('[Delivery] Response data:', data);

            if (data.success) {
                return data.order_id;
            }
            console.error('[Delivery] Failed to save order:', data.message);
            return null;
        } catch (error) {
            console.error('[Delivery] Error saving order:', error);
            return null;
        }
    };

    // Generar mensaje de WhatsApp
    const generateWhatsAppMessage = () => {
        const waNew = ui('wa_new_order', 'Nuevo Pedido');
        const shippingLabel = ui('shipping', 'Envío');
        const totalLabel = ui('total', 'Total');
        const freeLabel = ui('shipping_free', 'Gratis');

        let message = `🛵 *${waNew}* - ${restaurantName}\n\n`;

        // Datos del cliente
        if (customerName.trim()) {
            message += `👤 *${customerName.trim()}*\n`;
        }
        message += `📞 ${customerPhone.trim()}\n`;
        message += `📍 ${customerAddress.trim()}\n`;
        if (customerNotes.trim()) {
            message += `📝 ${customerNotes.trim()}\n`;
        }
        message += `\n`;

        // Pedido
        message += `📋 *${ui('order_summary', 'Tu pedido')}:*\n`;
        for (const item of cartItems) {
            message += `• ${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}€\n`;
        }

        message += `\n💰 Subtotal: ${cartTotal.toFixed(2)}€\n`;
        message += `🚚 ${shippingLabel}: ${isFreeShipping ? freeLabel : `${shippingCost.toFixed(2)}€`}\n`;
        message += `📦 *${totalLabel}: ${finalTotal.toFixed(2)}€*`;

        // Añadir método de pago seleccionado
        const paymentMethod = selectedPayment || (deliveryConfig?.payment_methods?.cash && !deliveryConfig?.payment_methods?.card ? 'cash' : null);
        if (paymentMethod) {
            const paymentLabel = paymentMethod === 'cash' ? ui('payment_cash', 'Efectivo') : ui('payment_card', 'Tarjeta');
            message += `\n\n💳 *${ui('payment_method', 'Método de pago')}:* ${paymentLabel}`;
        }

        return encodeURIComponent(message);
    };

    const handleWhatsAppClick = async () => {
        if (!deliveryConfig?.whatsapp_number) return;
        if (!validateForm()) return;

        setSending(true);

        // Guardar pedido en BD
        const orderId = await saveOrder('whatsapp');
        console.log('[Delivery] Order saved:', orderId);

        // Track event
        tracker?.track({
            type: 'delivery_order_initiated',
            entityType: 'delivery',
            value: finalTotal,
            props: {
                total: finalTotal,
                items: cartItems.length,
                method: 'whatsapp',
                order_id: orderId
            }
        });

        const cleanPhone = deliveryConfig.whatsapp_number.replace(/\D/g, '');
        const message = generateWhatsAppMessage();
        const url = `https://wa.me/${cleanPhone}?text=${message}`;

        window.open(url, '_blank');
        setSending(false);
        onClose();
    };

    const handlePhoneClick = async () => {
        if (!deliveryConfig?.phone_number) return;
        if (!validateForm()) return;

        // Guardar pedido en BD
        const orderId = await saveOrder('phone');
        console.log('[Delivery] Order saved:', orderId);

        // Track event
        tracker?.track({
            type: 'delivery_call_clicked',
            entityType: 'delivery',
            value: finalTotal,
            props: {
                total: finalTotal,
                items: cartItems.length,
                order_id: orderId
            }
        });

        window.location.href = `tel:${deliveryConfig.phone_number}`;
    };

    // Check if form is valid for button state
    const isFormFilled = customerPhone.trim().length >= 9 && customerAddress.trim().length >= 10;

    if (!deliveryConfig) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'rgba(15, 15, 20, 0.98)',
                    backgroundImage: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxHeight: '90vh'
                }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: alpha('#6366f1', 0.15),
                        display: 'flex'
                    }}>
                        <TwoWheeler sx={{ color: '#6366f1', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>
                        {ui('modal_title', 'Pedir a Domicilio')}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <AnimatePresence mode="wait">
                    {/* Alerts */}
                    {!isAvailable && (
                        <Alert
                            key="alert-unavailable"
                            severity="warning"
                            icon={<Warning />}
                            sx={{ mb: 2, bgcolor: alpha('#f59e0b', 0.15), border: `1px solid ${alpha('#f59e0b', 0.3)}` }}
                        >
                            {unavailableReason === 'closed_today' && ui('closed_today', 'Hoy no hay servicio de reparto')}
                            {unavailableReason === 'outside_hours' && ui('outside_hours', 'Fuera de horario de reparto')}
                            {(!unavailableReason || unavailableReason === 'disabled') && ui('closed_today', 'Servicio no disponible')}
                        </Alert>
                    )}

                    {cartItems.length === 0 && (
                        <Alert key="alert-empty" severity="info" sx={{ mb: 2 }}>
                            {ui('empty_cart', 'Tu carrito está vacío')}
                        </Alert>
                    )}

                    {cartItems.length > 0 && !meetsMinimum && (
                        <Alert key="alert-minimum" severity="warning" sx={{ mb: 2, bgcolor: alpha('#f59e0b', 0.1), border: `1px solid ${alpha('#f59e0b', 0.2)}` }}>
                            {ui('minimum_not_reached', 'No alcanzas el pedido mínimo')}: {deliveryConfig.minimum_order}€
                        </Alert>
                    )}

                    {/* ===== CUSTOMER FORM ===== */}
                    {cartItems.length > 0 && meetsMinimum && isAvailable && (
                        <motion.div
                            key="form-section"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Box sx={{
                                mb: 3,
                                p: 2,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                    📋 Datos de entrega
                                </Typography>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Nombre (opcional)"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Person sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                            },
                                            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                                            '& .MuiInputBase-input': { color: 'white' },
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Teléfono *"
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => {
                                            setCustomerPhone(e.target.value);
                                            if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: undefined }));
                                        }}
                                        error={!!formErrors.phone}
                                        helperText={formErrors.phone}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Phone sx={{ color: formErrors.phone ? '#ef4444' : 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                '& fieldset': { borderColor: formErrors.phone ? '#ef4444' : 'rgba(255,255,255,0.1)' },
                                                '&:hover fieldset': { borderColor: formErrors.phone ? '#ef4444' : 'rgba(255,255,255,0.2)' },
                                            },
                                            '& .MuiInputLabel-root': { color: formErrors.phone ? '#ef4444' : 'rgba(255,255,255,0.5)' },
                                            '& .MuiInputBase-input': { color: 'white' },
                                            '& .MuiFormHelperText-root': { color: '#ef4444' },
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Dirección completa *"
                                        multiline
                                        rows={2}
                                        value={customerAddress}
                                        onChange={(e) => {
                                            setCustomerAddress(e.target.value);
                                            if (formErrors.address) setFormErrors(prev => ({ ...prev, address: undefined }));
                                        }}
                                        error={!!formErrors.address}
                                        helperText={formErrors.address}
                                        placeholder="Calle, número, piso, código postal..."
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                                                    <Home sx={{ color: formErrors.address ? '#ef4444' : 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                alignItems: 'flex-start',
                                                '& fieldset': { borderColor: formErrors.address ? '#ef4444' : 'rgba(255,255,255,0.1)' },
                                                '&:hover fieldset': { borderColor: formErrors.address ? '#ef4444' : 'rgba(255,255,255,0.2)' },
                                            },
                                            '& .MuiInputLabel-root': { color: formErrors.address ? '#ef4444' : 'rgba(255,255,255,0.5)' },
                                            '& .MuiInputBase-input': { color: 'white' },
                                            '& .MuiFormHelperText-root': { color: '#ef4444' },
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Notas (opcional)"
                                        value={customerNotes}
                                        onChange={(e) => setCustomerNotes(e.target.value)}
                                        placeholder="Instrucciones de entrega, alergias..."
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Notes sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                            },
                                            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                                            '& .MuiInputBase-input': { color: 'white' },
                                        }}
                                    />

                                    {/* Payment Method Selection */}
                                    {(deliveryConfig?.payment_methods?.cash || deliveryConfig?.payment_methods?.card) && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                💳 Método de pago *
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Chip
                                                    icon={<Money sx={{ fontSize: 18 }} />}
                                                    label={ui('payment_cash', 'Efectivo')}
                                                    onClick={() => {
                                                        setSelectedPayment('cash');
                                                        if (formErrors.payment) setFormErrors(prev => ({ ...prev, payment: undefined }));
                                                    }}
                                                    sx={{
                                                        flex: 1,
                                                        py: 2,
                                                        bgcolor: selectedPayment === 'cash' ? alpha('#22c55e', 0.2) : 'rgba(255,255,255,0.03)',
                                                        color: selectedPayment === 'cash' ? '#22c55e' : 'rgba(255,255,255,0.7)',
                                                        border: `2px solid ${selectedPayment === 'cash' ? '#22c55e' : formErrors.payment ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                                        cursor: 'pointer',
                                                        fontWeight: selectedPayment === 'cash' ? 700 : 500,
                                                        '&:hover': {
                                                            bgcolor: alpha('#22c55e', 0.1),
                                                        }
                                                    }}
                                                />
                                                <Chip
                                                    icon={<CreditCard sx={{ fontSize: 18 }} />}
                                                    label={ui('payment_card', 'Tarjeta')}
                                                    onClick={() => {
                                                        setSelectedPayment('card');
                                                        if (formErrors.payment) setFormErrors(prev => ({ ...prev, payment: undefined }));
                                                    }}
                                                    sx={{
                                                        flex: 1,
                                                        py: 2,
                                                        bgcolor: selectedPayment === 'card' ? alpha('#3b82f6', 0.2) : 'rgba(255,255,255,0.03)',
                                                        color: selectedPayment === 'card' ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                                                        border: `2px solid ${selectedPayment === 'card' ? '#3b82f6' : formErrors.payment ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                                        cursor: 'pointer',
                                                        fontWeight: selectedPayment === 'card' ? 700 : 500,
                                                        '&:hover': {
                                                            bgcolor: alpha('#3b82f6', 0.1),
                                                        }
                                                    }}
                                                />
                                            </Box>
                                            {formErrors.payment && (
                                                <Typography variant="caption" sx={{ color: '#ef4444', mt: 0.5, display: 'block' }}>
                                                    {formErrors.payment}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </motion.div>
                    )}

                    {/* Delivery Zone Info */}
                    {deliveryConfig.translations?.delivery_zones && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha('#22c55e', 0.1),
                            border: `1px solid ${alpha('#22c55e', 0.2)}`
                        }}>
                            <LocationOn sx={{ color: '#22c55e', fontSize: 20 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {ui('delivery_area', 'Zona de reparto')}
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {deliveryConfig.translations.delivery_zones}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Order Summary */}
                    {cartItems.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                {ui('order_summary', 'Tu pedido')}
                            </Typography>
                            <Box sx={{
                                bgcolor: 'rgba(255,255,255,0.03)',
                                borderRadius: 2,
                                p: 2,
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {cartItems.map((item, i) => (
                                    <Box
                                        key={`${item.id}-${i}`}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            py: 0.75,
                                            borderBottom: i < cartItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                        }}
                                    >
                                        <Typography variant="body2">
                                            {item.name} x{item.quantity}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {(item.price * item.quantity).toFixed(2)}€
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Shipping Info */}
                    <Box sx={{ mb: 2 }}>

                        {/* Shipping Info */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha('#6366f1', 0.1),
                            border: `1px solid ${alpha('#6366f1', 0.2)}`
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocalShipping sx={{ color: '#6366f1', fontSize: 20 }} />
                                <Typography variant="body2">{ui('shipping', 'Envío')}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                {isFreeShipping ? (
                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#22c55e' }}>
                                        {ui('shipping_free', 'Gratis')} 🎉
                                    </Typography>
                                ) : (
                                    <>
                                        <Typography variant="body2" fontWeight={600}>{shippingCost.toFixed(2)}€</Typography>
                                        {deliveryConfig.free_shipping_threshold > 0 && (
                                            <Typography variant="caption" color="text.secondary">
                                                {ui('shipping_free_from', 'Gratis a partir de')} {deliveryConfig.free_shipping_threshold}€
                                            </Typography>
                                        )}
                                    </>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                    {/* Total */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" fontWeight={700}>{ui('total', 'Total')}</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
                            {finalTotal.toFixed(2)}€
                        </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {deliveryConfig.show_whatsapp && deliveryConfig.whatsapp_number && (
                            <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <WhatsApp />}
                                onClick={handleWhatsAppClick}
                                disabled={!isAvailable || cartItems.length === 0 || !meetsMinimum || sending || !isFormFilled}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    background: isFormFilled ? 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' : 'rgba(255,255,255,0.1)',
                                    boxShadow: isFormFilled ? `0 4px 20px ${alpha('#25D366', 0.4)}` : 'none',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                        boxShadow: `0 6px 24px ${alpha('#25D366', 0.5)}`,
                                    },
                                    '&:disabled': {
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.3)'
                                    }
                                }}
                            >
                                {ui('send_whatsapp', 'Enviar pedido por WhatsApp')}
                            </Button>
                        )}

                        {deliveryConfig.show_phone && deliveryConfig.phone_number && (
                            <Button
                                variant="outlined"
                                size="large"
                                fullWidth
                                startIcon={<Phone />}
                                onClick={handlePhoneClick}
                                disabled={!isFormFilled}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    fontWeight: 600,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    '&:hover': {
                                        borderColor: 'rgba(255,255,255,0.4)',
                                        bgcolor: 'rgba(255,255,255,0.05)'
                                    },
                                    '&:disabled': {
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.3)'
                                    }
                                }}
                            >
                                {ui('call_restaurant', 'Llamar al restaurante')} ({deliveryConfig.phone_number})
                            </Button>
                        )}
                    </Box>
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};

export default DeliveryModal;
