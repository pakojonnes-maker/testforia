import React, { useState } from 'react';

/**
 * ClaimPrize Component
 * Form to input contact info and claim the reward.
 * Redirects to Google Reviews on success.
 */

interface ClaimPrizeProps {
    sessionId: string;
    rewardId: string;
    campaignId: string;
    restaurantId: string;
    onClaimSuccess: (data: any) => void;
    apiBaseUrl?: string; // Pass from env if needed
}

export const ClaimPrize: React.FC<ClaimPrizeProps> = ({
    sessionId,
    rewardId,
    campaignId,
    restaurantId,
    onClaimSuccess,
    // apiBaseUrl = '/loyalty' // Removed unused prop
}) => {
    const [contact, setContact] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Using worker endpoint path from our plan: /loyalty/claim
            // Assuming the app has a way to call the worker URL. 
            // If running frontend dev server, we need the full URL or proxy.
            // For now assuming full URL or configured proxy.
            const WORKER_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

            const response = await fetch(`${WORKER_URL}/api/loyalty/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    reward_id: rewardId,
                    campaign_id: campaignId,
                    contact: contact,
                    restaurant_id: restaurantId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error claiming prize');
            }

            onClaimSuccess(data);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md max-w-sm w-full">
            <h3 className="text-xl font-bold mb-2 text-center text-gray-800">¡Ganaste!</h3>
            <p className="text-gray-600 mb-4 text-center">
                Ingresa tu email o WhatsApp para guardar tu premio.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="text"
                        placeholder="Email o Teléfono"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                        required
                    />
                </div>

                <div className="text-xs text-gray-500 text-center">
                    Al reclamar, aceptas recibir un enlace mágico para acceder a tu premio.
                </div>

                {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-full hover:bg-green-700 transition duration-300 disabled:opacity-50"
                >
                    {isLoading ? 'Guardando...' : 'Reclamar y Guardar'}
                </button>
            </form>
        </div>
    );
};
