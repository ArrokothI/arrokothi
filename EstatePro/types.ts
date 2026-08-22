
export interface Room {
  id: string;
  name: string;
  size: string;
  description: string;
  features: string[];
}

export interface Property {
  id: string;
  title: string;
  type: 'Villa' | 'Apartment' | 'Penthouse' | 'Mansion';
  location: string;
  price: string;
  beds: number;
  baths: number;
  sqft: number;
  mainImage: string;
  images: string[];
  description: string;
  rooms: Room[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
