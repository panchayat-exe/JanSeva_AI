import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { AshokaStambhaIcon } from '../components/Icons';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="landing-page">
      <div className="hero-bg"></div>
      
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <Header />
      </div>

      <div className="glass-card animate-fade-in" style={{ maxWidth: '500px', width: '100%', zIndex: 1, padding: '40px' }}>
        <div className="flex-col" style={{ alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ marginBottom: '16px' }}>
              <AshokaStambhaIcon width={54} height={54} />
            </div>
            <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>{t('app.title')}</h1>
            <p className="subtitle" style={{ textAlign: 'center', marginTop: '8px' }}>{t('app.subtitle')}</p>
        </div>

        <p style={{ textAlign: 'center', marginBottom: '40px', color: 'var(--text-secondary)' }}>
          {t('landing.description')}
        </p>

        <div className="flex-col gap-4">
          <Link to="/citizen" className="btn btn-primary" style={{ padding: '16px', fontSize: '1.1rem' }}>
            {t('landing.citizen_btn')}
          </Link>
          <Link to="/admin" className="btn btn-secondary" style={{ padding: '16px', fontSize: '1.1rem' }}>
            {t('landing.admin_btn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
