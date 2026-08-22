
import React from 'react';
import { Property } from '../types';
import { Icons } from '../constants';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
  return (
    <div 
      className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={property.mainImage} 
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-red-600 uppercase tracking-wider">
            {property.type}
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-2xl font-bold text-slate-900">{property.title}</h3>
          <span className="text-red-600 font-bold">{property.price}</span>
        </div>
        <p className="text-slate-500 text-sm mb-6 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {property.location}
        </p>
        <div className="flex items-center gap-6 text-slate-600 border-t pt-6">
          <div className="flex items-center gap-2">
            <Icons.Bed />
            <span className="text-sm font-medium">{property.beds} Beds</span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.Bath />
            <span className="text-sm font-medium">{property.baths} Baths</span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.Sqft />
            <span className="text-sm font-medium">{property.sqft} sqft</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;