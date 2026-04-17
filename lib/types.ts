export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
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
