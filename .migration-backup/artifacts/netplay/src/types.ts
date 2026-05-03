export interface Episode {
  id: string;
  title: string;
  season: number;
  episode: number;
  videoUrl: string;
  videoUrl2?: string;
  overview?: string;
  still_path?: string;
  release_date?: string;
  rating?: number;
  runtime?: number;
  credits_time?: number; // Segundos antes do fim para o Próximo Episódio
}

export interface Movie {
  id: number;
  title?: string;
  name?: string;
  original_name?: string;
  backdrop_path: string;
  poster_path: string;
  logo_path?: string;
  overview: string;
  first_air_date?: string;
  release_date?: string;
  vote_average: number;
  videoUrl?: string; // URL customizada para o vídeo
  videoUrl2?: string; // Segunda URL customizada (ex: Drive/Terabox)
  file_name?: string; // Nome real do arquivo
  genres?: string;
  created_at?: string;
  type?: 'movie' | 'series';
  episodes?: Episode[];
  last_position?: number;
  runtime?: number;
  actors?: string; // Lista de atores separada por vírgula
  rating?: number; // Nota detalhada
  release_year?: number;
  watch_providers?: string; // JSON string ou string separada por vírgula
  last_rescanned_at?: string;
  is_hidden?: boolean;
  collection_id?: number;
  collection_name?: string;
  collection_poster_path?: string;
  collection_logo_path?: string;
  collection_backdrop_path?: string;
}

export interface StreamingProvider {
  id: string;
  name: string;
  logo_url: string;
  priority: number;
  created_at?: string;
}

export interface ScannerState {
  isScanning: boolean;
  isPaused?: boolean;
  current: number;
  total: number;
  status: string;
  added: number;
  skipped: number;
  folderUrl?: string;
  pendingFiles?: any[];
}

export interface ReScannerState {
  isScanning: boolean;
  isPaused?: boolean;
  current: number;
  total: number;
  status: string;
  updated: number;
  skipped: number;
  pendingMovies?: Movie[];
}

export interface CollectionScannerState {
  isScanning: boolean;
  isPaused?: boolean;
  current: number;
  total: number;
  status: string;
  updated: number;
  skipped: number;
  pendingMovies?: Movie[];
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string;
  created_at: string;
}

export interface MyList {
  id: number;
  profile_id: string;
  movie_id: number;
  created_at: string;
  movie?: Movie;
}

export interface WeeklyPick {
  day: string;
  title: string;
  reason: string;
  type: 'movie' | 'series';
}

export interface GoogleDriveAccount {
  email: string;
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface DownloadedMovie extends Movie {
  downloadedAt: number;
  expiresAt: number;
  videoBlob?: Blob;
  quality?: '480p' | '720p' | '1080p';
  sizeInBytes?: number;
}

export interface AppSettings {
  id: string;
  user_id: string;
  theme: 'dark' | 'light' | 'neon';
  language: string;
  autoplay_next: boolean;
  show_logos: boolean;
  subscription_plan?: 'hub' | 'plus' | 'max';
  subscription_status?: 'active' | 'expired' | 'pending';
  subscription_expires_at?: string;
  google_drive_token?: string;
  google_drive_accounts?: GoogleDriveAccount[];
  category_backdrops?: Record<number, string>; // ID do gênero -> Backdrop URL
  updated_at: string;
}

export interface WatchHistory {
  id: number;
  profile_id: string;
  movie_id: number;
  last_position: number;
  updated_at: string;
  movie?: Movie;
}

export interface Room {
  id: string;
  host_id: string;
  movie_id: number;
  current_time: number;
  is_playing: boolean;
  created_at: string;
  movie?: Movie;
}

export interface RoomEvent {
  type: 'play' | 'pause' | 'seek' | 'emote' | 'change_movie';
  payload?: any;
  sender_id: string;
}
