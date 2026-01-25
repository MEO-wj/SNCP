export type Reminder = {
  id: number;
  reminder_type: string;
  time_of_day: string;
  repeat_days: number[];
  enabled: boolean;
  note?: string | null;
};
