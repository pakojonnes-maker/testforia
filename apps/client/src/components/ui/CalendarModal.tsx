import React, { useState, useMemo } from 'react';
import { Box, Typography, IconButton, Grid, Modal, Fade, Button } from '@mui/material';
import { Close, ChevronLeft, ChevronRight } from '@mui/icons-material';

interface CalendarModalProps {
    open: boolean;
    onClose: () => void;
    onDateSelect: (date: Date) => void;
    selectedDate: Date | null;
    minDate?: Date;
    brandColor?: string;
    textColor?: string;
    fontFamily?: string;
}

const CalendarModal: React.FC<CalendarModalProps> = ({
    open, onClose, onDateSelect, selectedDate,
    brandColor = '#FF6B6B', textColor = '#fff', fontFamily
}) => {
    const [viewDate, setViewDate] = useState(selectedDate || new Date());

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        return new Date(year, month + 1, 0).getDate();
    }, [viewDate]);

    const firstDayOfMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        // Adjust for Monday start (0 = Sunday, 1 = Monday...) to (0 = Monday, ... 6 = Sunday)
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    }, [viewDate]);

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const isSameDate = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today; // Example: disable past dates
    };

    const renderCalendar = () => {
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<Grid item xs={1.7} key={`empty-${i}`} />);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
            const disabled = isDateDisabled(date);
            const selected = selectedDate && isSameDate(date, selectedDate);
            const isToday = isSameDate(date, new Date());

            days.push(
                <Grid item xs={1.7} key={i} sx={{ textAlign: 'center', mb: 1 }}>
                    <Box
                        onClick={() => !disabled && onDateSelect(date)}
                        sx={{
                            width: 36,
                            height: 36,
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            cursor: disabled ? 'default' : 'pointer',
                            bgcolor: selected ? brandColor : (isToday ? 'rgba(255,255,255,0.1)' : 'transparent'),
                            color: disabled ? 'rgba(255,255,255,0.2)' : (selected ? '#fff' : textColor),
                            border: isToday && !selected ? `1px solid ${brandColor}` : 'none',
                            '&:hover': !disabled && !selected ? {
                                bgcolor: 'rgba(255,255,255,0.1)'
                            } : {}
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 400, fontFamily }}>
                            {i}
                        </Typography>
                    </Box>
                </Grid>
            );
        }
        return days;
    };

    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    return (
        <Modal
            open={open}
            onClose={onClose}
            closeAfterTransition
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                backdropFilter: 'blur(5px)'
            }}
        >
            <Fade in={open}>
                <Box
                    sx={{
                        bgcolor: '#1a1a1a',
                        color: textColor,
                        borderRadius: 4,
                        p: 3,
                        maxWidth: 360,
                        width: '100%',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        position: 'relative'
                    }}
                >
                    <IconButton
                        onClick={onClose}
                        sx={{ position: 'absolute', right: 8, top: 8, color: 'rgba(255,255,255,0.5)' }}
                    >
                        <Close />
                    </IconButton>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, mt: 1 }}>
                        <IconButton onClick={handlePrevMonth} sx={{ color: textColor }}>
                            <ChevronLeft />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontFamily, fontWeight: 600, textTransform: 'capitalize' }}>
                            {viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </Typography>
                        <IconButton onClick={handleNextMonth} sx={{ color: textColor }}>
                            <ChevronRight />
                        </IconButton>
                    </Box>

                    <Grid container sx={{ mb: 2 }}>
                        {weekDays.map((day) => (
                            <Grid item xs={1.7} key={day} sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                    {day}
                                </Typography>
                            </Grid>
                        ))}
                    </Grid>

                    <Grid container>
                        {renderCalendar()}
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                        <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none' }}>
                            Cancelar
                        </Button>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default CalendarModal;
