import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { SiDevpost } from 'react-icons/si'

const socials = [
  { href: 'https://www.linkedin.com/in/mikavohl/', icon: <FaLinkedin /> },
  { href: 'https://github.com/MikaVohl', icon: <FaGithub /> },
  { href: 'https://devpost.com/mikavohl', icon: <SiDevpost /> },
  { href: 'https://x.com/AmateurMika', icon: <FaXTwitter /> },
  { href: 'mailto:mikavohl@gmail.com', icon: <FaEnvelope /> },
]

export default function SocialLinks({ className = '', linkClassName = '' }) {
  const container = `social-links flex items-center gap-4 ${className}`.trim()
  const link = `opacity-60 transition hover:opacity-100 hover:scale-110 ${linkClassName}`.trim()

  return (
    <div className={container}>
      {socials.map(({ href, icon }) => (
        <a key={href} href={href} target="_blank" rel="noreferrer" className={link}>
          {icon}
        </a>
      ))}
    </div>
  )
}
