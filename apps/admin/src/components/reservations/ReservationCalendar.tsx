import React, { useState, useEffect } from 'react';
import { Box, Paper, IconButton, Typography, Grid, CircularProgress } from '@mui/material';
import { ChevronLeft, ChevronRight, People } from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';

interface Props {
    restaurantId: string;
    onDateSelect: (date: string) => void;
    selectedDate: string;
}

export const ReservationCalendar: React.FC<Props> = ({ restaurantId, onDateSelect, selectedDate }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [stats, setStats] = useState<Record<string, { count: number, covers: number }>>({});
    const [loading, setLoading] = useState(false);

    const getMonthString = (date: Date) => date.toISOString().slice(0, 7);

    useEffect(() => {
        if (!restaurantId) return;
        const loadStats = async () => {
            setLoading(true);
            try {
                const monthStr = getMonthString(currentMonth);
                console.log(`[Calendar] Fetching stats for ${monthStr}...`);
                const data = await apiClient.getReservationStats(restaurantId, monthStr);

                if (data.success) {
                    console.log(`[Calendar] Stats received:`, data.stats);
                    const statsMap: Record<string, { count: number, covers: number }> = {};
                    data.stats.forEach((item: any) => {
                        statsMap[item.reservation_date] = { count: item.count, covers: item.covers };
                    });
                    setStats(statsMap);
                } else {
                    console.warn(`[Calendar] Fetch failed:`, data.message);
                }
            } catch (error) {
                console.error('[Calendar] Error:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [restaurantId, currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        const adjustedStartDay = (firstDay.getDay() + 6) % 7; // Mon=0

        for (let i = 0; i < adjustedStartDay; i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));

        return days;
    };

    const days = generateCalendarDays();
    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Determine color based on COVERS (Pax)
    // Adjust thresholds as needed: <10 Green, <30 Orange, >30 Red
    const getDensityColor = (covers: number) => {
        if (covers >= 40) return '#d32f2f'; // High
        if (covers >= 20) return '#ed6c02'; // Medium
        if (covers > 0) return '#2e7d32';   // Low
        return 'transparent';
    };

    return (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', mb: 3, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <IconButton onClick={handlePrevMonth}><ChevronLeft /></IconButton>
                <Typography variant="h5" fontWeight="600" sx={{ textTransform: 'capitalize' }}>
                    {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                    {loading && <CircularProgress size={20} disableShrink />}
                    <IconButton onClick={handleNextMonth}><ChevronRight /></IconButton>
                </Box>
            </Box>

            <Grid container spacing={1} sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                {weekDays.map(d => (
                    <Grid item xs={12 / 7} key={d} textAlign="center" sx={{ mb: 1 }}>
                        <Typography variant="caption" fontWeight="bold" color="textSecondary" sx={{ textTransform: 'uppercase' }}>
                            {d.substr(0, 3)}
                        </Typography>
                    </Grid>
                ))}

                {days.map((date, i) => {
                    if (!date) return <Grid item xs={12 / 7} key={`empty-${i}`} />;

                    const dateStr = date.toISOString().split('T')[0];
                    const stat = stats[dateStr];
                    const isSelected = selectedDate === dateStr;
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const color = stat ? getDensityColor(stat.covers) : 'transparent';
                    const hasData = stat && stat.covers > 0;

                    return (
                        <Grid item xs={12 / 7} key={dateStr}>
                            <Box
                                onClick={() => onDateSelect(dateStr)}
                                sx={{
                                    height: 80,
                                    p: 1,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                                    borderRadius: 3,
                                    border: isSelected ? `2px solid #1976d2` : isToday ? '1px dashed #1976d2' : '1px solid',
                                    borderColor: isSelected ? '#1976d2' : isToday ? '#1976d2' : 'divider',
                                    cursor: 'pointer',
                                    bgcolor: isSelected ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)', boxShadow: 1 },
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <Typography variant="body1" fontWeight={isToday ? 'bold' : 500} color={isToday ? 'primary' : 'textPrimary'}>
                                    {date.getDate()}
                                </Typography>

                                {hasData ? (
                                    <Box width="100%" display="flex" flexDirection="column" alignItems="center">
                                        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                            <People sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.7 }} />
                                            <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>
                                                {stat.covers}
                                            </Typography>
                                        </Box>
                                        {/* Density Bar */}
                                        <Box sx={{ width: '60%', height: 4, borderRadius: 2, bgcolor: color, opacity: 0.8 }} />
                                    </Box>
                                ) : (
                                    <Box sx={{ height: 20 }} /> // Spacer
                                )}
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        </Paper>
    );
};
