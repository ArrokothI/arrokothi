export interface EstatePropertyRecord extends Record<string, unknown> {
  id: string;
  title: string;
  type: "Villa" | "Apartment" | "Penthouse" | "Mansion";
  location: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  highlights: string[];
}

/** The six reference listings, represented as domain records rather than prompt-formatted JSON. */
export const P02_PROPERTIES: EstatePropertyRecord[] = [
  {
    id: "2",
    title: "Skyline Penthouse",
    type: "Penthouse",
    location: "Upper West Side, NY",
    price: 18_900_000,
    beds: 4,
    baths: 5,
    sqft: 5200,
    description: "Breathtaking 360-degree views of Central Park and the Manhattan skyline.",
    highlights: ["Grand Salon", "Private Library", "Central Park views"],
  },
  {
    id: "4",
    title: "The TriBeCa Loft",
    type: "Apartment",
    location: "TriBeCa, NY",
    price: 7_250_000,
    beds: 3,
    baths: 3,
    sqft: 3400,
    description: "A classic industrial loft reimagined for modern luxury with original brickwork and automation.",
    highlights: ["Open Concept Kitchen", "Gaggenau appliances", "Walk-in pantry"],
  },
  {
    id: "5",
    title: "Greenwich Townhouse",
    type: "Mansion",
    location: "West Village, NY",
    price: 24_500_000,
    beds: 6,
    baths: 7,
    sqft: 8400,
    description: "An impeccably restored 25-foot-wide Greek Revival townhouse with a private elevator and rooftop garden.",
    highlights: ["Owner's Suite", "Private elevator", "Rooftop garden"],
  },
  {
    id: "6",
    title: "Park Avenue Estate",
    type: "Penthouse",
    location: "Upper East Side, NY",
    price: 32_000_000,
    beds: 5,
    baths: 6.5,
    sqft: 7200,
    description: "A white-glove Park Avenue duplex with grand proportions, a gallery, formal dining room, and staff quarters.",
    highlights: ["Formal Gallery", "Marble-clad entry", "Staff quarters"],
  },
  {
    id: "1",
    title: "The Azure Vista",
    type: "Villa",
    location: "Malibu, California",
    price: 12_500_000,
    beds: 5,
    baths: 6,
    sqft: 6200,
    description: "A contemporary villa with panoramic ocean views and seamless indoor-outdoor living.",
    highlights: ["Ocean-view primary suite", "Gourmet Kitchen", "Wine cellar"],
  },
  {
    id: "3",
    title: "Emerald Estate",
    type: "Mansion",
    location: "Greenwich, Connecticut",
    price: 15_750_000,
    beds: 8,
    baths: 10,
    sqft: 12_500,
    description: "Classic Georgian architecture meets modern luxury on ten acres of manicured grounds.",
    highlights: ["Grand Ballroom", "Ten-acre grounds", "Oak floors"],
  },
];
