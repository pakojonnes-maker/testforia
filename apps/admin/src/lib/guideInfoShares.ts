// Bloques de la guía compartidos entre pisos de la misma agencia (migración 0112).
//
// Un bloque es de su piso de origen y sale, además, en los pisos con los que se
// comparte: es el MISMO bloque, no una copia, así que editarlo desde cualquiera
// lo cambia en todos. Las rutas del bloque (.../info/:infoId/...) van siempre con
// el piso de origen; estas solo deciden en qué pisos sale.
import { apiClient } from './apiClient';

export interface InfoShareApartment {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_owner: boolean;
  included: boolean;
}

export interface InfoLibraryBlock {
  id: string;
  info_key: string;
  category_key: string | null;
  owner_apartment_id: string;
  owner_apartment_name: string;
  share_count: number;
  resolved_title: string | null;
  category_icon_name: string | null;
  category_color: string | null;
  excerpt: string | null;
}

const base = (ownerAptId: string, infoId: string) =>
  `/guide/admin/apartments/${encodeURIComponent(ownerAptId)}/info/${encodeURIComponent(infoId)}/shares`;

export const fetchInfoShares = async (ownerAptId: string, infoId: string): Promise<InfoShareApartment[]> => {
  const res = await apiClient.request(base(ownerAptId, infoId));
  return res.apartments || [];
};

/** Lista completa de pisos donde sale el bloque. Devuelve su piso de origen (cambia si se quita del actual). */
export const saveInfoShares = async (ownerAptId: string, infoId: string, apartmentIds: string[]): Promise<string> => {
  const res = await apiClient.request(base(ownerAptId, infoId), {
    method: 'PUT',
    body: JSON.stringify({ apartment_ids: apartmentIds }),
  });
  return res.owner_apartment_id;
};

/** Añade (o quita) un piso a la lista que ya tiene el bloque. */
export const toggleInfoInApartment = async (ownerAptId: string, infoId: string, aptId: string, include: boolean) => {
  const current = (await fetchInfoShares(ownerAptId, infoId)).filter(a => a.included).map(a => a.id);
  const next = include ? [...new Set([...current, aptId])] : current.filter(id => id !== aptId);
  return saveInfoShares(ownerAptId, infoId, next);
};

export const fetchInfoLibrary = async (aptId: string): Promise<InfoLibraryBlock[]> => {
  const res = await apiClient.request(`/guide/admin/apartments/${encodeURIComponent(aptId)}/info-library`);
  return res.blocks || [];
};
