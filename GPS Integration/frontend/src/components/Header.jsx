import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AshokaStambhaIcon } from './Icons';

export default function Header() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="header glass-panel">
      <Link to="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <AshokaStambhaIcon width={32} height={32} />
        <div className="brand-text">
          <span>JANSEVA</span>
          <span>GeoVision</span>
        </div>
      </Link>
      
      <button 
        className="btn btn-secondary btn-icon" 
        onClick={toggleLanguage}
        title="Toggle Language"
      >
        {i18n.language === 'en' ? 'हिंदी' : 'EN'}
      </button>
    </header>
  );
}
