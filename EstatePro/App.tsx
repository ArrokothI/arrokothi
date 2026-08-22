
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import PropertyCard from './components/PropertyCard';
import PropertyDetail from './components/PropertyDetail';
import AIConcierge from './components/AIConcierge';
import { PROPERTIES, NEIGHBORHOODS, TESTIMONIALS } from './constants';
import { Property } from './types';

const App: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const navigateToSection = useCallback((sectionId: string) => {
    if (selectedProperty) {
      setSelectedProperty(null);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [selectedProperty]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }
  }, []);

  const handleInquiry = () => {
    navigateToSection('contact');
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header onNavClick={navigateToSection} />
      
      <main className="flex-grow">
        {!selectedProperty ? (
          <>
            <section id="home">
              <Hero onNavigate={navigateToSection} />
            </section>

            <div className="bg-white py-12 border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale">
                <span className="text-xl font-serif font-bold italic tracking-tighter">FORBES</span>
                <span className="text-xl font-serif font-bold tracking-tighter">THE WALL STREET JOURNAL</span>
                <span className="text-xl font-serif font-bold tracking-tighter">VOGUE</span>
                <span className="text-xl font-serif font-bold tracking-tighter">ARCHITECTURAL DIGEST</span>
                <span className="text-xl font-serif font-bold tracking-tighter">MANSION GLOBAL</span>
              </div>
            </div>

            <section id="listings" className="py-24 max-w-7xl mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                <div>
                  <h2 className="text-4xl font-bold text-slate-900 mb-4">Curated Portfolio</h2>
                  <p className="text-slate-500 max-w-2xl text-lg">Exemplary residences hand-picked from New York City's most iconic ZIP codes and beyond.</p>
                </div>
                <div className="mt-6 md:mt-0 flex gap-4">
                  <button className="px-6 py-2 bg-slate-100 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Filter By Price</button>
                  <button className="px-6 py-2 bg-slate-100 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Sort: Featured</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {PROPERTIES.map((property) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    onClick={() => setSelectedProperty(property)} 
                  />
                ))}
              </div>
            </section>

            <section id="testimonials" className="py-24 bg-red-950 text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                 <div className="absolute top-0 left-10 w-96 h-96 bg-white rounded-full blur-3xl -mt-48 -ml-48" />
                 <div className="absolute bottom-0 right-10 w-96 h-96 bg-red-500 rounded-full blur-3xl -mb-48 -mr-48" />
               </div>
               <div className="max-w-7xl mx-auto px-4 relative z-10">
                 <div className="text-center mb-16">
                   <h2 className="text-4xl md:text-5xl font-bold mb-4">Client Voices</h2>
                   <p className="text-red-200 max-w-2xl mx-auto text-lg">The Sterling Standard as told by our global clientele of discerning homeowners and investors.</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {TESTIMONIALS.map((t) => (
                     <div key={t.id} className="bg-white/10 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/10 hover:bg-white/20 transition-all duration-500">
                       <div className="flex items-center gap-4 mb-6">
                         <img src={t.image} alt={t.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-red-400/30" />
                         <div>
                           <h4 className="font-bold text-lg leading-tight">{t.name}</h4>
                           <p className="text-xs text-red-300 uppercase tracking-widest font-bold mt-1">{t.title}</p>
                         </div>
                       </div>
                       <p className="text-red-50 text-lg italic leading-relaxed font-serif">
                         "{t.quote}"
                       </p>
                       <div className="mt-6 flex gap-1 text-red-400">
                         {[...Array(5)].map((_, i) => (
                           <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            </section>

            <section id="neighborhoods" className="py-24 bg-slate-100">
              <div className="max-w-7xl mx-auto px-4">
                <div className="mb-12 text-center">
                  <h2 className="text-4xl font-bold text-slate-900 mb-4">The New York Experience</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto">From the cobblestone streets of West Village to the glass spires of Billionaires' Row.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {NEIGHBORHOODS.map((nh) => (
                    <div key={nh.name} className="group relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all">
                      <img src={nh.image} alt={nh.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 text-white">
                        <h4 className="text-xl font-bold">{nh.name}</h4>
                        <p className="text-sm text-white/70">{nh.count} Properties</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="about" className="py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800" 
                    alt="EstatePro Founder" 
                    className="rounded-3xl shadow-2xl relative z-10 w-full aspect-[4/5] object-cover"
                  />
                  <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-red-600 rounded-3xl -z-0 hidden md:block" />
                  <div className="absolute top-12 -left-12 bg-white p-6 rounded-2xl shadow-xl z-20 hidden lg:block max-w-[200px]">
                    <p className="text-sm font-bold text-slate-900 mb-1">"We don't sell homes. We curate legacies."</p>
                    <p className="text-xs text-red-600 uppercase font-bold">- Marcus Sterling</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-red-600 font-bold uppercase tracking-widest text-sm">Founded in Manhattan</span>
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">Elite Representation <br /> for Discerning Portfolios</h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    EstatePro was founded on the principle that high-end real estate requires a blend of data-driven intelligence and high-touch concierge service.
                  </p>
                  <p className="text-slate-500">
                    With over $4B in transaction volume in New York City alone, Marcus Sterling and his team bring unparalleled local expertise to international investors and local families alike.
                  </p>
                  <div className="grid grid-cols-2 gap-8 pt-6">
                    <div>
                      <h4 className="text-3xl font-bold text-red-600">$4.2B+</h4>
                      <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Total Sales Volume</p>
                    </div>
                    <div>
                      <h4 className="text-3xl font-bold text-red-600">98%</h4>
                      <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Client Retention</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="contact" className="py-24 bg-slate-50">
              <div className="max-w-7xl mx-auto px-4">
                <div className="bg-red-950 rounded-[3rem] p-12 lg:p-20 text-white overflow-hidden relative shadow-2xl shadow-red-900/30">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/20 rounded-full blur-3xl -mr-48 -mt-48" />
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-bold mb-6">Experience the <br /> Sterling Standard</h2>
                      <p className="text-red-200 text-lg mb-8">Schedule a private showing or request a portfolio valuation with our expert team.</p>
                      
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </div>
                          <div>
                            <p className="text-sm text-red-300">Office Contact</p>
                            <p className="text-xl font-bold">+1 (212) 555-0198</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-sm text-red-300">Global HQ</p>
                            <p className="text-xl font-bold">750 5th Avenue, New York, NY</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <form className="bg-white rounded-3xl p-8 space-y-4 shadow-xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">First Name</label>
                          <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-red-600/20" placeholder="John" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Name</label>
                          <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-red-600/20" placeholder="Doe" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                        <input type="email" className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-red-600/20" placeholder="john@example.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portfolio Interest</label>
                        <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-red-600/20">
                          <option>Select a property type</option>
                          <option>Manhattan Penthouse</option>
                          <option>TriBeCa Loft</option>
                          <option>Luxury Rental</option>
                          <option>Investment Property</option>
                        </select>
                      </div>
                      <button className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
                        Inquire Privately
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <h3 className="text-3xl font-bold mb-4">The Sterling Report</h3>
                <p className="text-slate-500 mb-8 max-w-xl mx-auto text-lg">Weekly insights on the luxury market, off-market listings, and international design trends.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                  <input type="email" className="flex-grow bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-red-600/20" placeholder="Enter your email" />
                  <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-red-600 transition-colors">Join Club</button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <PropertyDetail 
            property={selectedProperty} 
            onBack={() => setSelectedProperty(null)}
            onInquire={handleInquiry}
          />
        )}
      </main>

      <footer className="bg-slate-900 text-white py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold">E</div>
                <span className="text-xl font-bold tracking-tight">EstatePro</span>
              </div>
              <p className="text-slate-400 max-w-sm mb-6">EstatePro is a boutique luxury real estate firm specializing in high-net-worth portfolio management and architectural representation.</p>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-red-400">Navigation</h5>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#listings" onClick={(e) => { e.preventDefault(); navigateToSection('listings'); }} className="hover:text-white transition-colors">Listings</a></li>
                <li><a href="#neighborhoods" onClick={(e) => { e.preventDefault(); navigateToSection('neighborhoods'); }} className="hover:text-white transition-colors">Neighborhoods</a></li>
                <li><a href="#about" onClick={(e) => { e.preventDefault(); navigateToSection('about'); }} className="hover:text-white transition-colors">Our Team</a></li>
                <li><a href="#contact" onClick={(e) => { e.preventDefault(); navigateToSection('contact'); }} className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-red-400">Connect</h5>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Private Portal</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
            <p>&copy; 2024 EstatePro Luxury Real Estate LLC. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Equal Housing</a>
              <a href="#" className="hover:text-white">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>

      <AIConcierge />
    </div>
  );
};

export default App;