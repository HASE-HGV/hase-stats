export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
};

export type ShameEntry = {
  id: string;
  target_user_id: string;
  reported_by: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by_deed_id: string | null;
};

export type ShameWallRow = {
  id: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  target_id: string;
  target_username: string;
  target_avatar_url: string | null;
  reporter_username: string;
};

export type GoodDeedTemplate = {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
};

export type GoodDeedStatus = "pending" | "approved" | "rejected";

export type GoodDeed = {
  id: string;
  user_id: string;
  template_id: string | null;
  description: string | null;
  photo_url: string;
  status: GoodDeedStatus;
  created_at: string;
  approved_at: string | null;
};

// Eine Zeile eines (evtl. mehrzeiligen) Zitats mit eigenem Sprecher.
export type QuoteLine = {
  author_profile_id: string | null;
  author_name: string | null;
  text: string;
};

export type Quote = {
  id: string;
  text: string | null;
  lines: QuoteLine[] | null;
  author_profile_id: string | null;
  author_name: string | null;
  added_by: string;
  created_at: string;
  said_on: string | null;
};

// Zeile aus der quotes_view (mit aufgelösten Usernamen für die Anzeige).
export type QuoteRow = {
  id: string;
  text: string | null;
  lines: QuoteLine[] | null;
  created_at: string;
  said_on: string | null;
  author_profile_id: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  author_name: string | null;
  author_display: string | null;
  added_by: string;
  added_by_username: string;
};
