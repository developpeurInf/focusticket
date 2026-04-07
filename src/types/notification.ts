
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}
