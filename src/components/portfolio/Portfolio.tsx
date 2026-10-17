import Image from 'next/image';
import Link from 'next/link';
import { LuArrowDown, LuArrowUpRight, LuCodeXml, LuLayers, LuMoveUpRight, LuTerminal, LuMapPin, LuMail } from 'react-icons/lu';
import { FaGithub, FaLinkedin, FaInstagram } from 'react-icons/fa';
import portrait from '@/assets/meinDevox.jpg';
import data from '@/data/portfolio.json';
import { dictionaries, Locale, localPath } from '@/lib/locale';
import Header from './Header';
import ContactForm from './ContactForm';
import Work from './Work';

const socialIcons = [FaGithub, FaLinkedin, FaInstagram];
const translated = <T extends { lang: string }>(items: T[], locale: Locale) => items.find(item => item.lang === locale) || items.find(item => item.lang === 'en') || items[0];
const year = (date: string) => date.slice(0, 4);

function About({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  return <section id="about" className="section about-section shell">
    <div className="section-intro"><span className="eyebrow">{t.aboutLabel}</span><h2>{t.aboutTitle[0]}<br />{t.aboutTitle[1]} <em>{t.aboutTitle[2]}</em></h2></div>
    <div className="about-copy"><p className="lead">{t.aboutLead[0]}<br />{t.aboutLead[1]}</p><p>{t.aboutDescription}</p><div className="about-details"><span><LuMapPin /> {t.based}</span><span><LuTerminal /> {t.coffee}</span></div></div>
    <div className="services">{t.services.map(([title, description], index) => {
      const Icon = [LuCodeXml, LuTerminal, LuLayers, LuMoveUpRight][index];
      return <article key={title}><Icon /><span className="service-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>;
    })}</div>
  </section>;
}

function Journey({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  return <section className="section shell journey"><div><span className="eyebrow">{t.journeyLabel}</span><h2>{t.journeyTitle[0]}<br /><em>{t.journeyTitle[1]}</em></h2><p className="muted">{t.journeyDescription}</p><div className="skill-cloud">{data.skills.map(skill => <span key={translated(skill.translations, locale).title}>{translated(skill.translations, locale).title}</span>)}</div></div>
    <div className="timeline"><h3 className="timeline-label">{t.experience}</h3>{data.experience.map(item => {
      const text = translated(item.translations, locale);
      return <article key={item.company_name}><span className="timeline-dot" /><span className="eyebrow">{t.since} {year(item.date_start)}</span><h3>{text.position}</h3><span className="organization">{item.company_name}</span><p>{text.description}</p></article>;
    })}<h3 className="timeline-label education-label">{t.education}</h3>{data.education.map(item => {
      const text = translated(item.translations, locale);
      return <article key={text.institution}><span className="timeline-dot" /><span className="eyebrow">{year(item.date_start)}{item.date_end ? ` — ${year(item.date_end)}` : ` ${t.onwards}`}</span><h3>{text.field_of_study || text.institution}</h3>{text.field_of_study && <span className="organization">{text.institution}</span>}<p>{text.description}</p></article>;
    })}</div>
  </section>;
}

function Contact({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  return <section id="contact" className="section shell contact-section"><div className="contact-intro"><span className="eyebrow">{t.contactLabel}</span><h2>{t.contactTitle[0]}<br /><em>{t.contactTitle[1]}</em><span className="lime">↗</span></h2><p>{t.contactDescription}</p><a className="email-link" href="mailto:missouzakaria03@gmail.com"><LuMail />missouzakaria03@gmail.com</a><div className="socials">{data.websites.map((site, index) => {
    const Icon = socialIcons[index % socialIcons.length];
    return <a key={site.platform} href={site.link} target="_blank" rel="noopener noreferrer" aria-label={site.platform}><Icon /></a>;
  })}</div></div><ContactForm locale={locale} direct={!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL} /></section>;
}

export default function Portfolio({ page = 'home', locale = 'en' }: { page?: 'home' | 'about' | 'projects' | 'contact'; locale?: Locale }) {
  const t = dictionaries[locale];
  return <div className="portfolio" lang={locale}><a href="#main" className="skip-link">{t.skip}</a><Header locale={locale} /><main id="main">
    {page === 'home' && <><section className="hero shell"><div className="hero-copy"><span className="eyebrow hero-eyebrow"><span className="status-dot" /> {t.heroLabel}</span><h1>{t.heroTitle[0]}<br />{t.heroTitle[1]} <em>{t.heroTitle[2]}</em><br /><span className="outlined">{t.heroTitle[3]}</span></h1><p>{t.heroDescription}</p><div className="hero-actions"><Link className="button primary" href="#work">{t.explore} <LuArrowUpRight /></Link><Link className="button secondary" href={localPath(locale, '/contact')}>{t.connect}</Link></div><div className="hero-socials"><span>{t.findMe}</span><a href="https://github.com/HeaDLuCK" aria-label="GitHub" target="_blank" rel="noopener noreferrer"><FaGithub /></a><a href="https://linkedin.com/in/zakaria-missou" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><FaLinkedin /></a><span className="social-rule" /></div></div>
      <div className="portrait-composition"><span className="portrait-top-label">{t.behindCode}</span><div className="portrait-frame"><Image src={portrait} alt={t.portraitAlt} priority sizes="(max-width: 720px) 90vw, 45vw" /><div className="portrait-gradient" /><div className="portrait-caption"><span>{t.hello}</span><span>{t.personal}</span></div></div><div className="floating-code"><LuCodeXml /><span>{t.designed}<br /><strong>{t.developed}</strong></span></div><span className="portrait-coordinate">{t.location}</span></div><a href="#about" className="scroll-cue"><LuArrowDown /> {t.scroll}</a></section><div className="tech-strip"><div className="shell"><span>{t.stack}</span><b>React</b><i>✳</i><b>Java</b><i>✳</i><b>Spring Boot</b><i>✳</i><b>Next.js</b><i>✳</i><b>Laravel</b></div></div></>}
    {(page === 'home' || page === 'about') && <About locale={locale} />}
    {(page === 'home' || page === 'projects') && <Work locale={locale} />}
    {(page === 'home' || page === 'about') && <Journey locale={locale} />}
    {(page === 'home' || page === 'contact') && <Contact locale={locale} />}
    {(page === 'about' || page === 'projects') && <div className="shell closing-cta"><p>{t.closing}</p><Link href={localPath(locale, '/contact')}>{t.closingLink} <LuArrowUpRight /></Link></div>}
  </main><footer className="site-footer shell"><Link className="wordmark" href={localPath(locale)}>zm<span>.</span></Link><span>© {new Date().getFullYear()} Zakaria Missou</span><span>{t.footer}</span><a href="#main" className="back-top">{t.top} ↑</a></footer></div>;
}
