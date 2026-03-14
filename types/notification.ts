export type AlertType =
  | "plan_approved"
  | "plan_rejected"
  | "bmi_critical"
  | "no_checkin_30d"
  | "medical_review"
  | "account_created";

export interface NotificationAlert {
  id: string;
  userId: string;
  type: AlertType;
  messageEn: string;
  messageKn: string;
  read: boolean;
  createdAt: Date;
}
