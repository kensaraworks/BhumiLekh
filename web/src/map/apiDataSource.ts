import axios from 'axios';
import { api } from '../api';
import type { Dossier, MapDataSource } from './mapDataSource';

// e.g. http://localhost:8000/api/tiles — leave unset until the backend serves tiles.
const tilesBase: string | undefined = import.meta.env.VITE_TILES_BASE_URL;

export const apiDataSource: MapDataSource = {
  getLayerSource(layer) {
    if (!tilesBase) return null;
    return { type: 'vector', tiles: [`${tilesBase}/${layer.tilePath}/{z}/{x}/{y}.pbf`] };
  },

  async getParcelDossier(parcelId) {
    try {
      const response = await api.get<Dossier>(`/parcel/${encodeURIComponent(parcelId)}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },

  transformRequest(url) {
    const token = localStorage.getItem('token');
    if (tilesBase && token && url.startsWith(tilesBase)) {
      return { url, headers: { Authorization: `Bearer ${token}` } };
    }
  },
};
