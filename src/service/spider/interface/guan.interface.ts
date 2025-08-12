export interface GuanUserConfig {
  uid: string;
  isSelf?: number;
  startPage?: number;
  endPage?: number;
}

export interface GuanArticleItem {
  title: string;
  url: string;
  createTime: string;
  commentCount: number;
}

export interface GuanRawArticleItem {
  id: number;
  title: string;
  summary: string;
  pic: string;
  pic_n: string | null;
  user_id: number;
  is_anonymous: boolean;
  comment_count: number;
  created_at: string;
  pass_at: string;
  mix_sort_time: string;
  status: number;
  access_device: number;
  view_count: number;
  orderby_value: number;
  audio_id: string;
  audio_show: string;
  location_text: string;
  at_users: any[];
  allow_show: string;
  user_nick: string;
  user_photo: string;
  user_description: string;
  user_level: number;
  bigv_desc: string;
  is_buy_five_year_member: string;
  member_expire_date: string | null;
  post_url: string;
  post_url_night: string;
  share_url: string;
  code_type: number;
  view_count_text: string;
  show_fire: boolean;
  collection_count: string;
  has_collection: boolean;
  praise_num: string;
  has_praise: boolean;
  has_attention: boolean;
  has_vote: boolean;
  user_level_logo: string;
  show_recommend_logo: number;
  topics: any[];
  ad_data: any;
  show_member_logo_type: number;
  is_question: boolean;
  is_liaozhubian: boolean;
}
