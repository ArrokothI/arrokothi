
import React from 'react';
import { Property } from './types';

export const PROPERTIES: Property[] = [
  {
    id: '2',
    title: 'Skyline Penthouse',
    type: 'Penthouse',
    location: 'Upper West Side, NY',
    price: '$18,900,000',
    beds: 4,
    baths: 5,
    sqft: 5200,
    mainImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1600607687940-4e7a6a3b687f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Breathtaking 360-degree views of Central Park and the Manhattan skyline from this ultra-luxurious penthouse. Managed by the city\'s premier estate experts.',
    rooms: [
      { id: 'r3', name: 'Grand Salon', size: '1400 sqft', description: 'Double-height ceilings with floor-to-ceiling windows overlooking the reservoir.', features: ['Smart Lighting', 'Automated Blinds', 'Custom Millwork'] },
      { id: 'r4', name: 'Private Library', size: '400 sqft', description: 'Quiet wood-paneled office space with bespoke shelving.', features: ['Built-in Humidor', 'Park Views'] }
    ]
  },
  {
    id: '4',
    title: 'The TriBeCa Loft',
    type: 'Apartment',
    location: 'TriBeCa, NY',
    price: '$7,250,000',
    beds: 3,
    baths: 3,
    sqft: 3400,
    mainImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'A classic industrial loft reimagined for modern luxury, featuring original brickwork and state-of-the-art automation.',
    rooms: [
      { id: 'r10', name: 'Open Concept Kitchen', size: '600 sqft', description: 'Professional grade kitchen with Gaggenau appliances.', features: ['Waterfall Island', 'Walk-in Pantry'] }
    ]
  },
  {
    id: '5',
    title: 'Greenwich Townhouse',
    type: 'Mansion',
    location: 'West Village, NY',
    price: '$24,500,000',
    beds: 6,
    baths: 7,
    sqft: 8400,
    mainImage: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1605146764387-0d9b0f6b5608?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'An impeccably restored 25-foot wide Greek Revival townhouse featuring a private elevator and a rooftop garden with an outdoor kitchen.',
    rooms: [
      { id: 'r11', name: 'Owner\'s Suite', size: '1200 sqft', description: 'Occupies the entire third floor with a private wet bar.', features: ['Steam Shower', 'Custom Dressing Room'] }
    ]
  },
  {
    id: '6',
    title: 'Park Avenue Estate',
    type: 'Penthouse',
    location: 'Upper East Side, NY',
    price: '$32,000,000',
    beds: 5,
    baths: 6.5,
    sqft: 7200,
    mainImage: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'A white-glove Park Avenue duplex with grand proportions, offering a gallery, formal dining room, and staff quarters.',
    rooms: [
      { id: 'r12', name: 'Formal Gallery', size: '400 sqft', description: 'Marble-clad entry gallery perfect for art collectors.', features: ['Coved Ceilings', 'Recessed Lighting'] }
    ]
  },
  {
    id: '1',
    title: 'The Azure Vista',
    type: 'Villa',
    location: 'Malibu, California',
    price: '$12,500,000',
    beds: 5,
    baths: 6,
    sqft: 6200,
    mainImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'A masterpiece of contemporary architecture, Azure Vista offers panoramic ocean views and seamless indoor-outdoor living.',
    rooms: [
      { id: 'r1', name: 'Master Suite', size: '800 sqft', description: 'Featuring a private terrace and spa-like bathroom.', features: ['Ocean View', 'Walk-in Closet', 'Fireplace'] },
      { id: 'r2', name: 'Gourmet Kitchen', size: '450 sqft', description: 'State-of-the-art appliances with a massive marble island.', features: ['Sub-Zero Fridge', 'Wine Cellar'] }
    ]
  },
  {
    id: '3',
    title: 'Emerald Estate',
    type: 'Mansion',
    location: 'Greenwich, Connecticut',
    price: '$15,750,000',
    beds: 8,
    baths: 10,
    sqft: 12500,
    mainImage: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1576013551538-34440026e632?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Classic Georgian architecture meets modern luxury on 10 acres of pristine manicured grounds.',
    rooms: [
      { id: 'r5', name: 'Grand Ballroom', size: '2000 sqft', description: 'Perfect for high-profile entertaining and galas.', features: ['Crystal Chandeliers', 'Oak Floors'] }
    ]
  }
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Alexandra Von Furstenberg',
    title: 'International Investor',
    quote: "EstatePro redefined my expectations for luxury real estate. They secured a piece of the city's history with absolute discretion.",
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 2,
    name: 'Jonathan Sterling-Hurst',
    title: 'Venture Capitalist',
    quote: "The level of data-driven insight provided by the EstatePro team is unmatched. They understood my portfolio needs instantly.",
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 3,
    name: 'Elena Rossi',
    title: 'Interior Design Director',
    quote: "As someone who works with space for a living, I appreciate EstatePro's focus on architectural integrity.",
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
  }
];

export const NEIGHBORHOODS = [
  { 
    name: 'TriBeCa', 
    count: 12, 
    image: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    name: 'Upper East Side', 
    count: 8, 
    image: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    name: 'Chelsea', 
    count: 15, 
    image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=800' 
  },
  { 
    name: 'West Village', 
    count: 6, 
    image: 'https://images.unsplash.com/photo-1541336032412-2048a678540d?auto=format&fit=crop&q=80&w=800' 
  }
];

export const Icons = {
  Bed: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
  ),
  Bath: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  ),
  Sqft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
  ),
  Chat: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
  ),
  Mic: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
  ),
  X: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
  )
};