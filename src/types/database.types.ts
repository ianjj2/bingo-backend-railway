export type UserRole = 'ouro' | 'diamante' | 'admin';
export type UserStatus = 'active' | 'blocked';
export type MatchStatus = 'scheduled' | 'live' | 'paused' | 'finished';
export type WinPattern = 'full_card' | 'four_corners' | 'horizontal' | 'vertical' | 'diagonal';

export interface User {
  id: string;
  cpf: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  failed_login_attempts: number;
  locked_until: string | null;
  refresh_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  name: string;
  status: MatchStatus;
  num_min: number;
  num_max: number;
  numbers_per_card: number;
  win_pattern: WinPattern;
  commit_hash: string;
  seed_public: string | null;
  auto_draw: boolean;
  auto_draw_interval: number;
  max_winners: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  match_id: string;
  user_id: string;
  card_index: number;
  numbers: number[];
  marked: number[];
  is_winner: boolean;
  bingo_draw_index: number | null;
  bingo_claimed_at: string | null;
  created_at: string;
}

export interface Draw {
  id: string;
  match_id: string;
  draw_index: number;
  number: number;
  server_signature: string;
  drawn_by: string;
  created_at: string;
}

export interface EventLog {
  id: string;
  match_id: string | null;
  user_id: string | null;
  type: string;
  payload: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface RateLimit {
  id: string;
  identifier: string;
  endpoint: string;
  attempts: number;
  reset_at: string;
  created_at: string;
}

// DTOs de resposta
export interface UserResponse {
  id: string;
  cpf: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  email_verified_at: string | null;
  created_at: string;
}

export interface MatchResponse {
  id: string;
  name: string;
  status: MatchStatus;
  num_min: number;
  num_max: number;
  numbers_per_card: number;
  win_pattern: WinPattern;
  auto_draw: boolean;
  auto_draw_interval: number;
  max_winners: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  youtube_url: string | null;
}

export interface CardResponse {
  id: string;
  card_index: number;
  numbers: number[];
  marked: number[];
  is_winner: boolean;
  bingo_draw_index: number | null;
}

export interface DrawResponse {
  draw_index: number;
  number: number;
  created_at: string;
}

// WebSocket Events
export interface MatchStateEvent {
  match_id: string;
  status: MatchStatus;
  draws: DrawResponse[];
  winners: {
    user_id: string;
    card_id: string;
    draw_index: number;
  }[];
  total_cards: number;
}

export interface DrawNewEvent {
  match_id: string;
  draw_index: number;
  number: number;
}

export interface CardUpdateEvent {
  card_id: string;
  marked: number[];
  is_winner: boolean;
}

export interface NearWinEvent {
  user_id: string;
  card_id: string;
  missing: number;
}

export interface BingoValidatedEvent {
  user_id: string;
  card_id: string;
  draw_index: number;
}
