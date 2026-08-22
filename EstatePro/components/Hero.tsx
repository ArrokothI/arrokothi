
import React from 'react';

interface HeroProps {
  onNavigate?: (id: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(id);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    window.history.pushState(null, '', `#${id}`);
  };

  return (
    <section className="relative h-screen flex items-center justify-center text-white overflow-hidden">
      <img 
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=2000" 
        alt="Luxury Home" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 text-center max-w-4xl px-4">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
          Where Luxury <br /> Finds Its Home
        </h1>
        <p className="text-xl md:text-2xl text-slate-200 mb-10 max-w-2xl mx-auto font-light">
          Experience the pinnacle of real estate with our exclusive collection of world-class properties.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="#listings" 
            onClick={(e) => handleClick(e, 'listings')}
            className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-red-50 transition-all text-center min-w-[200px]"
          >
            Explore Properties
          </a>
          <a 
            href="#contact" 
            onClick={(e) => handleClick(e, 'contact')}
            className="backdrop-blur-md bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-all text-center min-w-[200px]"
          >
            Contact Specialist
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;