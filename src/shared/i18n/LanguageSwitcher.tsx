import { useTranslation } from 'react-i18next'
import styles from './LanguageSwitcher.module.css'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'עב' },
]

function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className={styles.switcher}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`${styles.button} ${i18n.resolvedLanguage === lang.code ? styles.active : ''}`}
          onClick={() => i18n.changeLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitcher
