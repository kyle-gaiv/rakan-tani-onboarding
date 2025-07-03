export interface MQTTMessage {
  topic: string;
  message: string;
}

export interface RakanTaniMessage {
  address: string;
  client_name: string;
  client_phone: string;
  command: string;
  context_id: string;
  farmer_id: number;
  farmer_name: string;
  history: any[];
  m: string;
  message: string;
  message_type: string;
  phone_number_id: string;
  query_id: number;
  timestamp: string;
}

export interface ClientMessage {
  message_type: string;
  phone_number_id: string;
  context_id: string;
  client_phone: string;
  timestamp: string;
  client_name: string;
  m: string;
}

export interface WhatsAppMessage {
  query: string;
  answer: string;
  modified: string;
}

export interface UserScheduleDay {
  hlt: number;
  activities: string[];
  activityIds: number[];
  currentDayHlt: number;
  activityDate: string;
}
