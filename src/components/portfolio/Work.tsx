import { LuArrowUpRight, LuLockKeyhole, LuLayers } from 'react-icons/lu';
import { FaGithub } from 'react-icons/fa';
import { publicProjects } from '@/data/work';
import { dictionaries, Locale, localTag } from '@/lib/locale';

export default function Work({ locale = 'en' }: { locale?: Locale }) {
  const t = dictionaries[locale];
  return (
    <section id="work" className="section work-section shell">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t.workLabel}</span>
          <h2>{t.workTitle[0]}<br />{t.workTitle[1]} <em>{t.workTitle[2]}</em></h2>
        </div>
        <a href="https://github.com/HeaDLuCK" target="_blank" rel="noopener noreferrer" className="text-link">{t.github} <LuArrowUpRight /></a>
      </div>

      <article className="private-work">
        <div className="private-work-summary">
          <span className="work-status"><LuLockKeyhole /> {t.private}</span>
          <h3>{t.privateTitle[0]}<br />{t.privateTitle[1]} <em>JunivTech.</em></h3>
          <span className="private-role">{t.role}</span>
          <div className="tags"><span>Java</span><span>{t.web}</span><span>SaaS</span><span>{t.collaboration}</span></div>
        </div>
        <div className="private-work-detail">
          <LuLayers className="private-work-icon" aria-hidden="true" />
          <p>{t.privateDescription}</p>
          <ul>
            {t.contributions.map(contribution => <li key={contribution}>{contribution}</li>)}
          </ul>
          <p className="confidential-note"><LuLockKeyhole aria-hidden="true" /> {t.confidential}</p>
        </div>
      </article>

      <div className="public-work-heading"><h3>{t.publicTitle}</h3><span>{t.publicSubtitle}</span></div>
      <div className="repository-grid">
        {publicProjects.map((project, index) => (
          <article className="repository-card" key={project.url}>
            <div className={`repository-art ${project.visual}`} aria-hidden="true">
              <span className="repo-art-index">0{index + 1} / {t.sourceExploration.toUpperCase()}</span>
              <span className="repo-art-symbol">{project.symbol}</span>
              <span className="repo-art-caption">{t.projects[index].caption}</span>
            </div>
            <div className="repository-copy">
              <span className="eyebrow">{t.projects[index].category}</span>
              <h4>{project.name}</h4>
              <p>{t.projects[index].description}</p>
              <div className="tags">{project.technologies.map(technology => <span key={technology}>{localTag(locale, technology)}</span>)}</div>
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="repository-link" aria-label={t.sourceLabel.replace('{name}', project.name)}><span><FaGithub /> {t.source}</span><LuArrowUpRight /></a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
