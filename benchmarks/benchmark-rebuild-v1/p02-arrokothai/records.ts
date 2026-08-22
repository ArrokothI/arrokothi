export const ESTATE_PROPERTIES: Record<string, unknown>[] = [
  {
    id: "2", title: "Skyline Penthouse", type: "Penthouse", location: "Upper West Side, NY",
    price: 18_900_000, beds: 4, baths: 5, sqft: 5200,
    main_image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200",
    images: [
      "https://images.unsplash.com/photo-1600607687940-4e7a6a3b687f?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=800",
    ],
    description: "Breathtaking 360-degree views of Central Park and the Manhattan skyline from this ultra-luxurious penthouse. Managed by the city's premier estate experts.",
  },
  {
    id: "4", title: "The TriBeCa Loft", type: "Apartment", location: "TriBeCa, NY",
    price: 7_250_000, beds: 3, baths: 3, sqft: 3400,
    main_image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1200",
    images: ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800"],
    description: "A classic industrial loft reimagined for modern luxury, featuring original brickwork and state-of-the-art automation.",
  },
  {
    id: "5", title: "Greenwich Townhouse", type: "Mansion", location: "West Village, NY",
    price: 24_500_000, beds: 6, baths: 7, sqft: 8400,
    main_image: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&q=80&w=1200",
    images: ["https://images.unsplash.com/photo-1605146764387-0d9b0f6b5608?auto=format&fit=crop&q=80&w=800"],
    description: "An impeccably restored 25-foot wide Greek Revival townhouse featuring a private elevator and a rooftop garden with an outdoor kitchen.",
  },
  {
    id: "6", title: "Park Avenue Estate", type: "Penthouse", location: "Upper East Side, NY",
    price: 32_000_000, beds: 5, baths: 6.5, sqft: 7200,
    main_image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=1200",
    images: ["https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800"],
    description: "A white-glove Park Avenue duplex with grand proportions, offering a gallery, formal dining room, and staff quarters.",
  },
  {
    id: "1", title: "The Azure Vista", type: "Villa", location: "Malibu, California",
    price: 12_500_000, beds: 5, baths: 6, sqft: 6200,
    main_image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=1200",
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?auto=format&fit=crop&q=80&w=800",
    ],
    description: "A masterpiece of contemporary architecture, Azure Vista offers panoramic ocean views and seamless indoor-outdoor living.",
  },
  {
    id: "3", title: "Emerald Estate", type: "Mansion", location: "Greenwich, Connecticut",
    price: 15_750_000, beds: 8, baths: 10, sqft: 12500,
    main_image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=1200",
    images: ["https://images.unsplash.com/photo-1576013551538-34440026e632?auto=format&fit=crop&q=80&w=800"],
    description: "Classic Georgian architecture meets modern luxury on 10 acres of pristine manicured grounds.",
  },
];

export const ESTATE_ROOMS: Record<string, unknown>[] = [
  { property_id: "2", property: "Skyline Penthouse", id: "r3", name: "Grand Salon", size: "1400 sqft", description: "Double-height ceilings with floor-to-ceiling windows overlooking the reservoir.", features: ["Smart Lighting", "Automated Blinds", "Custom Millwork"] },
  { property_id: "2", property: "Skyline Penthouse", id: "r4", name: "Private Library", size: "400 sqft", description: "Quiet wood-paneled office space with bespoke shelving.", features: ["Built-in Humidor", "Park Views"] },
  { property_id: "4", property: "The TriBeCa Loft", id: "r10", name: "Open Concept Kitchen", size: "600 sqft", description: "Professional grade kitchen with Gaggenau appliances.", features: ["Waterfall Island", "Walk-in Pantry"] },
  { property_id: "5", property: "Greenwich Townhouse", id: "r11", name: "Owner's Suite", size: "1200 sqft", description: "Occupies the entire third floor with a private wet bar.", features: ["Steam Shower", "Custom Dressing Room"] },
  { property_id: "6", property: "Park Avenue Estate", id: "r12", name: "Formal Gallery", size: "400 sqft", description: "Marble-clad entry gallery perfect for art collectors.", features: ["Coved Ceilings", "Recessed Lighting"] },
  { property_id: "1", property: "The Azure Vista", id: "r1", name: "Master Suite", size: "800 sqft", description: "Featuring a private terrace and spa-like bathroom.", features: ["Ocean View", "Walk-in Closet", "Fireplace"] },
  { property_id: "1", property: "The Azure Vista", id: "r2", name: "Gourmet Kitchen", size: "450 sqft", description: "State-of-the-art appliances with a massive marble island.", features: ["Sub-Zero Fridge", "Wine Cellar"] },
  { property_id: "3", property: "Emerald Estate", id: "r5", name: "Grand Ballroom", size: "2000 sqft", description: "Perfect for high-profile entertaining and galas.", features: ["Crystal Chandeliers", "Oak Floors"] },
];

