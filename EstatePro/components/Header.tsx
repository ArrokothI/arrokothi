
import React from 'react';

interface HeaderProps {
  onNavClick?: (sectionId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavClick }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    if (onNavClick) {
      onNavClick(sectionId);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    window.history.pushState(null, '', `#${sectionId}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a href="#home" onClick={(e) => handleLinkClick(e, 'home')} className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-red-700 transition-colors">E</div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">EstatePro</span>
          </a>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#home" onClick={(e) => handleLinkClick(e, 'home')} className="hover:text-red-600 transition-colors">Home</a>
          <a href="#listings" onClick={(e) => handleLinkClick(e, 'listings')} className="hover:text-red-600 transition-colors">Listings</a>
          <a href="#neighborhoods" onClick={(e) => handleLinkClick(e, 'neighborhoods')} className="hover:text-red-600 transition-colors">Neighborhoods</a>
          <a href="#about" onClick={(e) => handleLinkClick(e, 'about')} className="hover:text-red-600 transition-colors">About</a>
          <a href="#contact" onClick={(e) => handleLinkClick(e, 'contact')} className="hover:text-red-600 transition-colors">Contact</a>
        </nav>
        <a 
          href="#contact" 
          onClick={(e) => handleLinkClick(e, 'contact')}
          className="bg-red-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
        >
          Book Viewings
        </a>
      </div>
    </header>
  );
};

export default Header;