
import React, { useEffect } from 'react';
import { Property } from '../types';
import { Icons } from '../constants';

interface PropertyDetailProps {
  property: Property;
  onBack: () => void;
  onInquire?: () => void;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({ property, onBack, onInquire }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Back to Listings
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="rounded-3xl overflow-hidden aspect-video shadow-lg">
              <img src={property.mainImage} alt={property.title} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {property.images.map((img, idx) => (
                <div key={idx} className="rounded-2xl overflow-hidden aspect-video shadow-sm">
                  <img src={img} alt={`${property.title} ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <span className="text-red-600 font-bold uppercase tracking-widest text-xs">{property.type}</span>
              <h2 className="text-5xl font-bold text-slate-900 mt-2 mb-4">{property.title}</h2>
              <p className="text-2xl font-bold text-slate-700">{property.price}</p>
            </div>

            <p className="text-slate-600 text-lg leading-relaxed">
              {property.description}
            </p>

            <div className="grid grid-cols-3 gap-6 py-8 border-y">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1 uppercase tracking-tight">Bedrooms</p>
                <p className="text-2xl font-bold text-slate-900">{property.beds}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1 uppercase tracking-tight">Bathrooms</p>
                <p className="text-2xl font-bold text-slate-900">{property.baths}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1 uppercase tracking-tight">Total Area</p>
                <p className="text-2xl font-bold text-slate-900">{property.sqft} <span className="text-sm font-normal">sqft</span></p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6">Available Spaces</h3>
              <div className="space-y-4">
                {property.rooms.map((room) => (
                  <div key={room.id} className="p-6 bg-slate-100 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg">{room.name}</h4>
                      <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-600">{room.size}</span>
                    </div>
                    <p className="text-slate-600 text-sm mb-4">{room.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {room.features.map((feature, fidx) => (
                        <span key={fidx} className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-medium">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={onInquire}
              className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-600/20"
            >
              Inquire About This Property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;