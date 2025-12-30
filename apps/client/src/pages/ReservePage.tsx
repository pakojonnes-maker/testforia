import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, TextField, IconButton, Grid,
    Chip, CircularProgress, Alert, Checkbox, FormControlLabel,
    Fade, InputAdornment, useMediaQuery
} from '@mui/material';
import {
    ArrowBack, AccessTime, Person, CalendarMonth,
    CheckCircle, WbSunny, Nightlight, Phone, Email,
    Comment, RestaurantMenu
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useReelsConfig } from '../hooks/useReelsConfig';
import apiClient from '../lib/apiClient';
import { useRestaurant } from '../contexts/RestaurantContext';
import LanguageSwitcher from '../components/reels/LanguageSwitcher';
import CalendarModal from '../components/ui/CalendarModal';
import { useCallback } from 'react';

// --- Types ---
type TimeSlot = string | {
    time: string;
    available: boolean;
    remaining_capacity?: number;
};

type Step = 'party' | 'date' | 'time' | 'details' | 'confirmation' | 'waitlist';

type DayStatus = 'open' | 'closed' | 'limited';

interface CalendarDay {
    date: Date;
    status: DayStatus;
    reason?: string;
}

const ReservePage: React.FC = () => {
    const params = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { restaurant } = useRestaurant();
    const isMobile = useMediaQuery('(max-width:600px)');

    const slug = params.slug || restaurant?.slug;

    // Config & Branding
    const [currentLanguage, setCurrentLanguage] = useState('es');
    const { config: reelConfig, loading: configLoading } = useReelsConfig(slug, currentLanguage);
    const [calendarOpen, setCalendarOpen] = useState(false);

    // Translations Helper
    const t = useCallback((key: string, defaultText: string) => {
        return reelConfig?.translations?.[key] || defaultText;
    }, [reelConfig?.translations]);
    const brandColors = useMemo(() => ({
        primary: reelConfig?.restaurant?.branding?.primaryColor || '#FF6B6B',
        secondary: reelConfig?.restaurant?.branding?.secondaryColor || '#4ECDC4',
        accent: reelConfig?.restaurant?.branding?.accent_color || '#FF8C42',
        background: reelConfig?.restaurant?.branding?.backgroundColor || '#121212',
        text: reelConfig?.restaurant?.branding?.textColor || '#ffffff',
        fontFamily: reelConfig?.restaurant?.branding?.fontFamily || '"Fraunces", serif',
    }), [reelConfig]);

    // State
    const [step, setStep] = useState<Step>('party');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [partySize, setPartySize] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientDetails, setClientDetails] = useState({
        name: '',
        email: '',
        phone: '',
        comments: '',
        gdpr_policy: false,
        gdpr_marketing: false
    });

    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

    // Calendar Data
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

    // START DYNAMIC SETTINGS INTEGRATION
    const [reservationSettings, setReservationSettings] = useState<any>(null);

    // Fetch Settings
    useEffect(() => {
        if (reelConfig?.restaurant?.id) {
            const fetchSettings = async () => {
                try {
                    const settings = await apiClient.reservations.getConfig(reelConfig.restaurant.id);
                    setReservationSettings(settings);
                } catch (err) {
                    console.error("Error fetching reservation settings:", err);
                    // Fallback defaults could be set here if needed
                }
            };
            fetchSettings();
        }
    }, [reelConfig?.restaurant?.id]);

    // Initialize Calendar with Backend Data
    useEffect(() => {
        if (!reelConfig?.restaurant?.id) return;

        const loadCalendar = async () => {
            try {
                const today = new Date();
                const startDate = today.toISOString().split('T')[0];
                const endDate = new Date(today);
                endDate.setDate(today.getDate() + 30);
                const endDateStr = endDate.toISOString().split('T')[0];

                const data = await apiClient.reservations.getCalendar(reelConfig.restaurant.id, startDate, endDateStr);

                if (data.success && data.calendar) {
                    const days: CalendarDay[] = data.calendar.map((day: any) => ({
                        date: new Date(day.date),
                        status: day.status as DayStatus,
                        reason: day.reason
                    }));
                    setCalendarDays(days);
                }
            } catch (error) {
                console.error("Error loading calendar:", error);
                // Fallback to basic open
                const days: CalendarDay[] = [];
                const today = new Date();
                for (let i = 0; i < 30; i++) {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i);
                    days.push({ date: d, status: 'open' });
                }
                setCalendarDays(days);
            }
        };
        loadCalendar();
    }, [reelConfig?.restaurant?.id]);

    useEffect(() => {
        if (selectedDate && partySize && reelConfig?.restaurant?.id) {
            fetchAvailability();
        }
    }, [selectedDate, partySize, reelConfig?.restaurant?.id]);

    const fetchAvailability = async () => {
        if (!selectedDate || !partySize || !reelConfig?.restaurant?.id) return;
        setLoading(true);
        setError(null);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const response = await apiClient.reservations.checkAvailability(
                reelConfig.restaurant.id,
                dateStr,
                partySize
            );
            if (response.success && response.slots) {
                // Client-side filtering for Same Day logic
                // If backend isn't updated yet, we filter here too for safety
                const now = new Date();
                const isToday = dateStr === now.toISOString().split('T')[0];
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                let validSlots = response.slots;

                if (isToday) {
                    validSlots = response.slots.filter((slot: TimeSlot) => {
                        const timeStr = typeof slot === 'string' ? slot : slot.time;
                        const [h, m] = timeStr.split(':').map(Number);
                        const slotMinutes = h * 60 + m;
                        // Allow slots at least 30 mins in future
                        return slotMinutes > currentMinutes + 30;
                    });
                }

                setAvailableSlots(validSlots);

                if (validSlots.length === 0 && isToday) {
                    setError(t('reserve_no_tables_today', "No quedan mesas para hoy. Prueba otra fecha."));
                }

            } else {
                setAvailableSlots([]);
                if (response.message) setError(response.message);
            }
        } catch (err: any) {
            if (err.response && err.response.status === 403) {
                setError(t('reserve_disabled_temp', "Reservas deshabilitadas temporalmente."));
            } else {
                setError(t('reserve_error_avail', "Error al cargar disponibilidad."));
            }
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const errors: { [key: string]: string } = {};
        let isValid = true;

        if (!clientDetails.name || clientDetails.name.trim().length < 2) {
            errors.name = t('reserve_error_name_req', 'Nombre es obligatorio');
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!clientDetails.email || !emailRegex.test(clientDetails.email)) {
            errors.email = t('reserve_error_email_inv', 'Email inválido');
            isValid = false;
        }

        const phoneRegex = /^[0-9+\-\s()]{9,}$/;
        if (!clientDetails.phone || !phoneRegex.test(clientDetails.phone)) {
            errors.phone = t('reserve_error_phone_inv', 'Teléfono inválido (mín. 9 dígitos)');
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleCreateReservation = async () => {
        if (!reelConfig?.restaurant?.id || !selectedDate || !selectedTime || !partySize) return;

        if (!validateForm()) return;

        setLoading(true);
        try {
            const result = await apiClient.reservations.createReservation({
                restaurant_id: reelConfig.restaurant.id,
                client_name: clientDetails.name,
                client_email: clientDetails.email,
                client_phone: clientDetails.phone,
                reservation_date: selectedDate.toISOString().split('T')[0],
                reservation_time: selectedTime,
                party_size: partySize,
                special_requests: clientDetails.comments,
                accepted_policy: clientDetails.gdpr_policy,
                accepted_marketing: clientDetails.gdpr_marketing,
                occasion: ''
            });

            if (result.success) setStep('confirmation');
            else setError(result.message || t('reserve_error_create', 'Error al crear la reserva'));
        } catch (err: any) {
            setError(err.message || t('reserve_error_conn', 'Error de conexión'));
        } finally {
            setLoading(false);
        }
    };

    const handleJoinWaitlist = async () => {
        if (!clientDetails.gdpr_policy) {
            setError(t('reserve_error_policy', "Acepta la política de privacidad"));
            return;
        }
        if (!clientDetails.name || !clientDetails.phone) {
            setError(t('reserve_error_fields', "Rellena todos los campos"));
            return;
        }
        setLoading(true);
        try {
            const result = await apiClient.reservations.joinWaitlist({
                restaurant_id: reelConfig?.restaurant?.id,
                client_name: clientDetails.name,
                client_contact_method: clientDetails.phone ? 'whatsapp' : 'email',
                client_contact_value: clientDetails.phone || clientDetails.email,
                desired_date: selectedDate?.toISOString().split('T')[0],
                desired_time_range: 'Flexible',
                party_size: partySize,
                notes: clientDetails.comments,
                accepted_policy: clientDetails.gdpr_policy
            });
            if (result.success) setStep('confirmation');
            else setError(result.message);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers ---
    const handleReturnToReels = () => {
        // Explicit navigation to reels view
        if (slug) {
            navigate(`/r/${slug}`);
        } else {
            navigate(-1);
        }
    };

    const stepVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1 }
    };

    // --- Render Functions ---

    const renderPartyStep = () => (
        <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: brandColors.fontFamily, mb: 4, fontWeight: 300 }}>
                {t('reserve_party_size', '¿Cuántas personas?')}
            </Typography>
            <Grid container spacing={2} justifyContent="center" component={motion.div} layout>
                {Array.from({ length: (reservationSettings?.max_party_size || 8) - (reservationSettings?.min_party_size || 1) + 1 }, (_, i) => i + (reservationSettings?.min_party_size || 1)).slice(0, 8).map((num, idx) => (
                    <Grid item key={num} component={motion.div} variants={itemVariants}
                        initial="hidden" animate="visible" transition={{ delay: idx * 0.05 }}>
                        <Button
                            onClick={() => { setPartySize(num); setStep('date'); }}
                            sx={{
                                width: 64, height: 64, borderRadius: '50%',
                                fontSize: '1.5rem', fontFamily: brandColors.fontFamily,
                                color: brandColors.text,
                                border: partySize === num ? `2px solid ${brandColors.primary}` : '1px solid rgba(255,255,255,0.1)',
                                bgcolor: partySize === num ? `${brandColors.primary}20` : 'rgba(255,255,255,0.03)',
                                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                '&:hover': { bgcolor: `${brandColors.primary}40`, transform: 'scale(1.1)', borderColor: brandColors.primary },
                                backdropFilter: 'blur(5px)'
                            }}
                        >
                            {num}
                        </Button>
                    </Grid>
                ))}

                {/* Custom Party Size Input (>8) */}
                <Grid item component={motion.div} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.45 }}>
                    <Box
                        sx={{
                            width: 64, height: 64, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px dashed rgba(255,255,255,0.2)',
                            bgcolor: 'rgba(255,255,255,0.02)',
                            transition: 'all 0.3s',
                            '&:focus-within': { borderColor: brandColors.primary, bgcolor: `${brandColors.primary}10`, transform: 'scale(1.1)' }
                        }}
                    >
                        <TextField
                            variant="standard"
                            placeholder="+"
                            type="tel"
                            inputProps={{
                                style: {
                                    textAlign: 'center', color: brandColors.text,
                                    fontFamily: brandColors.fontFamily, fontSize: '1.2rem', fontWeight: 'bold'
                                },
                                maxLength: 2
                            }}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                if (val && parseInt(val) > 0) {
                                    setPartySize(parseInt(val));
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && partySize && partySize > 0) {
                                    setStep('date');
                                }
                            }}
                            sx={{ width: 40, '& .MuiInput-underline:before, & .MuiInput-underline:after': { display: 'none' } }}
                        />
                        {partySize && partySize > 8 && (
                            <IconButton
                                size="small"
                                onClick={() => setStep('date')}
                                sx={{ position: 'absolute', right: -40, color: brandColors.primary, bgcolor: 'rgba(0,0,0,0.5)' }}
                            >
                                <CheckCircle />
                            </IconButton>
                        )}
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );


    const renderDateStep = () => (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: brandColors.fontFamily, mb: 4, fontWeight: 300 }}>
                {t('reserve_date', '¿Qué día?')}
            </Typography>

            <CalendarModal
                open={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                onDateSelect={(date) => {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                    setStep('time');
                }}
                selectedDate={selectedDate}
                minDate={new Date()}
                brandColor={brandColors.primary}
                textColor={brandColors.text}
                fontFamily={brandColors.fontFamily}
            />

            <Box sx={{
                display: 'flex', gap: 2, overflowX: 'auto', pb: 4, px: 2, width: '100%',
                '::-webkit-scrollbar': { display: 'none' },
                scrollSnapType: 'x mandatory',
                justifyContent: 'flex-start'
            }}>
                <Box sx={{ minWidth: isMobile ? '35vw' : '40%' }} />
                {calendarDays.map((calDay, i) => {
                    const date = calDay.date;
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isClosed = calDay.status === 'closed';

                    return (
                        <Box
                            key={i}
                            className="snap-item"
                            onClick={() => {
                                if (!isClosed) {
                                    setSelectedDate(date);
                                    setStep('time');
                                }
                            }}
                            component={motion.div}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: isClosed ? 0.5 : 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            sx={{
                                minWidth: 80, height: 100, p: 1,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: isClosed ? 'not-allowed' : 'pointer',
                                scrollSnapAlign: 'center',
                                borderRadius: 4,
                                bgcolor: isSelected ? brandColors.primary : (isClosed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)'),
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                color: isSelected ? '#fff' : (isClosed ? 'rgba(255,255,255,0.3)' : brandColors.text),
                                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                                boxShadow: isSelected ? `0 10px 20px -5px ${brandColors.primary}60` : 'none',
                                '&:hover': {
                                    transform: isClosed ? 'none' : 'scale(1.05)',
                                    bgcolor: isSelected ? brandColors.primary : (isClosed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.1)')
                                }
                            }}
                        >
                            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
                                {new Intl.DateTimeFormat(currentLanguage, { weekday: 'short' }).format(date)}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: brandColors.fontFamily, my: 0.5 }}>
                                {date.getDate()}
                            </Typography>
                            {isClosed ? (
                                <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem' }}>{t('reserve_closed', 'CERRADO')}</Typography>
                            ) : (
                                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                    {new Intl.DateTimeFormat(currentLanguage, { month: 'short' }).format(date)}
                                </Typography>
                            )}
                        </Box>
                    );
                })}
                <Box
                    onClick={() => setCalendarOpen(true)}
                    component={motion.div}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    sx={{
                        minWidth: 80, height: 100, borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px dashed rgba(255,255,255,0.2)',
                        scrollSnapAlign: 'center', cursor: 'pointer',
                        '&:hover': { borderColor: brandColors.primary, color: brandColors.primary }
                    }}
                >
                    <CalendarMonth />
                </Box>
                <Box sx={{ minWidth: isMobile ? '35vw' : '40%' }} />
            </Box>
        </Box>
    );

    const renderTimeStep = () => {
        if (loading) return <Box display="flex" justifyContent="center"><CircularProgress size={40} sx={{ color: brandColors.primary }} /></Box>;

        const morningSlots = availableSlots.filter(s => parseInt((typeof s === 'string' ? s : s.time).split(':')[0]) < 16);
        const eveningSlots = availableSlots.filter(s => parseInt((typeof s === 'string' ? s : s.time).split(':')[0]) >= 16);

        return (
            <Box sx={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontFamily: brandColors.fontFamily, mb: 4, fontWeight: 300 }}>
                    {t('reserve_time', '¿A qué hora?')}
                </Typography>

                {availableSlots.length === 0 ? (
                    <Box textAlign="center" component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Typography color="error" variant="body1" sx={{ opacity: 0.8, mb: 2 }}>
                            {error || t('reserve_no_slots', "Lo sentimos, no hay horario disponible.")}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => setStep('waitlist')}
                            sx={{ borderColor: brandColors.text, color: brandColors.text, mt: 2 }}
                        >
                            {t('reserve_waitlist_btn', 'Unirse a Lista de Espera')}
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                            { slots: morningSlots, icon: <WbSunny />, label: t('reserve_noon', 'Mediodía') },
                            { slots: eveningSlots, icon: <Nightlight />, label: t('reserve_night', 'Noche') }
                        ].map(({ slots, icon, label }) => slots.length > 0 && (
                            <Box key={label} component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Box display="flex" alignItems="center" gap={1} mb={2} sx={{ opacity: 0.6, pl: 1 }}>
                                    {React.cloneElement(icon as any, { fontSize: 'small' })}
                                    <Typography variant="overline" letterSpacing={2}>{label}</Typography>
                                </Box>
                                <Grid container spacing={1.5}>
                                    {slots.map((slot: any) => {
                                        const timeLabel = typeof slot === 'string' ? slot : slot.time;
                                        return (
                                            <Grid item xs={4} sm={3} key={timeLabel}>
                                                <Chip
                                                    label={timeLabel}
                                                    clickable
                                                    onClick={() => { setSelectedTime(timeLabel); setStep('details'); }}
                                                    sx={{
                                                        width: '100%', py: 2.5,
                                                        bgcolor: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: brandColors.text,
                                                        fontSize: '1rem',
                                                        borderRadius: 2,
                                                        transition: 'all 0.2s',
                                                        '&:hover': { bgcolor: brandColors.primary, borderColor: brandColors.primary, color: '#fff', transform: 'translateY(-2px)' }
                                                    }}
                                                />
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        );
    };

    const renderDetailsStep = () => (
        <Box sx={{ width: '100%', maxWidth: 360 }}>
            <Typography variant="h5" align="center" sx={{ fontFamily: brandColors.fontFamily, mb: 4, fontWeight: 300 }}>
                {t('reserve_details_title', 'Tus Datos')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                    { label: t('reserve_name', 'Nombre'), icon: <Person />, val: clientDetails.name, field: 'name' },
                    { label: t('reserve_email', 'Email'), icon: <Email />, val: clientDetails.email, field: 'email' },
                    { label: t('reserve_phone', 'Teléfono'), icon: <Phone />, val: clientDetails.phone, field: 'phone' },
                ].map((input, i) => (
                    <motion.div
                        key={input.field}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ width: '100%' }}
                    >
                        <TextField
                            fullWidth variant="standard" label={input.label}
                            value={input.val}
                            onChange={e => {
                                setClientDetails({ ...clientDetails, [input.field]: e.target.value });
                                if (fieldErrors[input.field]) setFieldErrors({ ...fieldErrors, [input.field]: '' });
                            }}
                            error={!!fieldErrors[input.field]}
                            helperText={fieldErrors[input.field]}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Box sx={{ color: brandColors.text, opacity: 0.5 }}>{input.icon}</Box></InputAdornment>,
                            }}
                            sx={{
                                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.2)' },
                                '& .MuiInput-underline:after': { borderBottomColor: brandColors.primary },
                                '& .MuiInputBase-input': { color: brandColors.text, py: 1, fontSize: '1.2rem' },
                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' },
                                '& .MuiInputLabel-root.Mui-focused': { color: brandColors.primary },
                                '& .MuiFormHelperText-root': { color: '#ff6b6b' }
                            }}
                        />
                    </motion.div>
                ))}
                <TextField
                    fullWidth variant="standard" label={t('reserve_comments', 'Comentarios')}
                    multiline rows={2}
                    value={clientDetails.comments}
                    onChange={e => setClientDetails({ ...clientDetails, comments: e.target.value })}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Box sx={{ color: brandColors.text, opacity: 0.5, mt: 1 }}><Comment /></Box></InputAdornment>,
                    }}
                    sx={{ '& .MuiInputBase-input': { color: brandColors.text }, '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.2)' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' }, '& .MuiInput-underline:after': { borderBottomColor: brandColors.primary } }}
                />

                <Box mt={2}>
                    <FormControlLabel
                        control={<Checkbox sx={{ color: 'rgba(255,255,255,0.4)', '&.Mui-checked': { color: brandColors.primary } }}
                            checked={clientDetails.gdpr_policy} onChange={e => setClientDetails({ ...clientDetails, gdpr_policy: e.target.checked })} />}
                        label={<Typography variant="body2" sx={{ opacity: 0.7 }}>{t('reserve_policy_accept', 'Acepto la política de privacidad')}</Typography>}
                    />
                </Box>

                <Button
                    fullWidth
                    variant="contained"
                    disabled={!clientDetails.name || !clientDetails.email || !clientDetails.gdpr_policy || loading}
                    onClick={handleCreateReservation}
                    sx={{
                        mt: 2, py: 2, borderRadius: 8,
                        bgcolor: brandColors.primary,
                        color: '#fff', fontSize: '1.1rem', fontWeight: 600,
                        boxShadow: `0 8px 20px -5px ${brandColors.primary}80`,
                        '&:hover': { bgcolor: brandColors.primary, transform: 'scale(1.02)' }
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : t('reserve_confirm_btn', 'Confirmar Reserva')}
                </Button>
            </Box>
        </Box>
    );

    const renderWaitlistStep = () => (
        <Box sx={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: brandColors.fontFamily, mb: 1 }}>{t('reserve_waitlist_title', 'Lista de Espera')}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 4 }}>{t('reserve_waitlist_msg', 'Te avisaremos si se libera una mesa.')}</Typography>
            <TextField fullWidth variant="standard" label={t('reserve_name', 'Nombre')} value={clientDetails.name} onChange={e => setClientDetails({ ...clientDetails, name: e.target.value })} sx={{ mb: 3, input: { color: 'white' }, label: { color: 'grey' } }} />
            <TextField fullWidth variant="standard" label={t('reserve_contact', 'Contacto')} value={clientDetails.phone} onChange={e => setClientDetails({ ...clientDetails, phone: e.target.value })} sx={{ mb: 3, input: { color: 'white' }, label: { color: 'grey' } }} />
            <Button fullWidth variant="outlined" onClick={handleJoinWaitlist} sx={{ borderColor: brandColors.text, color: brandColors.text, py: 1.5, borderRadius: 8 }}>
                {loading ? <CircularProgress size={20} /> : t('reserve_join_btn', 'Unirme')}
            </Button>
        </Box>
    );

    const renderConfirmation = () => (
        <Box textAlign="center" py={10} component={motion.div} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <CheckCircle sx={{ fontSize: 80, color: brandColors.accent }} />
                </motion.div>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `0 0 30px ${brandColors.accent}60` }} />
            </Box>
            <Typography variant="h4" sx={{ fontFamily: brandColors.fontFamily, mt: 3, mb: 1 }}>{t('reserve_req_sent_title', '¡Petición Enviada!')}</Typography>
            <Typography variant="body1" sx={{ opacity: 0.6, mb: 5, maxWidth: 300, mx: 'auto' }}>
                {t('reserve_req_sent_msg', 'El restaurante se pondrá en contacto contigo brevemente para confirmar.')}
            </Typography>

            <Button
                variant="outlined"
                onClick={handleReturnToReels}
                startIcon={<RestaurantMenu />}
                sx={{
                    color: brandColors.text,
                    borderColor: 'rgba(255,255,255,0.3)',
                    py: 1.5, px: 4, borderRadius: 8,
                    '&:hover': { borderColor: brandColors.primary, color: brandColors.primary }
                }}
            >
                {t('reserve_back_menu', 'Volver al Menú')}
            </Button>
        </Box>
    );

    if (configLoading || !reelConfig) return <Box sx={{ height: '100svh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{
            height: '100svh', width: '100vw', bgcolor: brandColors.background, color: brandColors.text,
            display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
        }}>
            {/* Ambient Background Gradient */}
            <Box sx={{
                position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '140%',
                background: `radial-gradient(circle at 50% 30%, ${brandColors.primary}20 0%, transparent 60%)`,
                pointerEvents: 'none', zIndex: 0
            }} />

            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                <IconButton onClick={() => step === 'party' ? handleReturnToReels() : setStep(prev => prev === 'time' ? 'date' : prev === 'details' ? 'time' : prev === 'confirmation' ? 'party' : 'party')} sx={{ color: brandColors.text }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="button" sx={{ fontFamily: brandColors.fontFamily, letterSpacing: 2, fontWeight: 700 }}>
                    {t('reserve_title', 'RESERVA')}
                </Typography>
                <LanguageSwitcher
                    languages={reelConfig?.languages || []}
                    currentLanguage={currentLanguage}
                    onLanguageChange={(lang) => setCurrentLanguage(lang)}
                />
            </Box>

            {/* Step Progress Line */}
            <AnimatePresence>
                {step !== 'confirmation' && (
                    <Box sx={{ width: '100%', px: 4, mb: 2, zIndex: 10, display: 'flex', gap: 0.5 }}>
                        {['party', 'date', 'time', 'details'].map((s) => {
                            const isActive = step === s;
                            const isPast = ['party', 'date', 'time', 'details'].indexOf(step) > ['party', 'date', 'time', 'details'].indexOf(s);
                            return (
                                <Box key={s} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: isActive || isPast ? brandColors.primary : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                            )
                        })}
                    </Box>
                )}
            </AnimatePresence>


            {/* Summary Pills - Only show after first step */}
            <AnimatePresence>
                {step !== 'party' && step !== 'confirmation' && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', justifyContent: 'center', gap: 10, paddingBottom: 20, zIndex: 10 }}>
                        <Chip icon={<Person style={{ color: brandColors.background }} />} label={partySize}
                            sx={{ bgcolor: brandColors.text, color: brandColors.background, fontWeight: 'bold' }} />
                        {selectedDate && <Chip icon={<CalendarMonth style={{ color: brandColors.text }} />} label={selectedDate.toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short' })}
                            variant="outlined" sx={{ color: brandColors.text, borderColor: 'rgba(255,255,255,0.3)' }} />}
                        {selectedTime && <Chip icon={<AccessTime style={{ color: brandColors.text }} />} label={selectedTime}
                            variant="outlined" sx={{ color: brandColors.text, borderColor: 'rgba(255,255,255,0.3)' }} />}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 5, overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        variants={stepVariants as any}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                    >
                        {/* content wrapper with glass effect for details */}
                        <Box sx={{
                            width: '100%', display: 'flex', justifyContent: 'center',
                            ...(step === 'details' ? { p: 4, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', maxWidth: 420 } : {})
                        }}>
                            {step === 'party' && renderPartyStep()}
                            {step === 'date' && renderDateStep()}
                            {step === 'time' && renderTimeStep()}
                            {step === 'details' && renderDetailsStep()}
                            {step === 'waitlist' && renderWaitlistStep()}
                            {step === 'confirmation' && renderConfirmation()}
                        </Box>
                    </motion.div>
                </AnimatePresence>

                {error && <Fade in><Alert severity="error" sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(25,0,0,0.9)', color: '#ff6b6b' }}>{error}</Alert></Fade>}
            </Box>
        </Box>
    );
};

export default ReservePage;
