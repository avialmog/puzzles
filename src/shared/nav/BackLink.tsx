import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './BackLink.module.css'

interface BackLinkProps {
  to: string
  label: string
}

function BackLink({ to, label }: BackLinkProps) {
  const { i18n } = useTranslation()
  const arrow = i18n.dir() === 'rtl' ? '→' : '←'

  return (
    <Link to={to} className={styles.back}>
      {arrow} {label}
    </Link>
  )
}

export default BackLink
