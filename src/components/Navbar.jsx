import SocialLinks from './SocialLinks'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  return (
    <nav className="site-nav fixed top-0 z-20 w-full py-2 font-semibold text-base backdrop-blur-lg shadow-sm sm:text-xl">
      <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-3 sm:flex-nowrap sm:px-4 lg:gap-6">
        <SocialLinks className="text-2xl sm:justify-start sm:gap-3 sm:text-xl lg:gap-4 lg:text-3xl" />

        <ul className="hidden flex-1 items-center justify-center gap-1 text-sm sm:flex md:text-base lg:gap-6 lg:text-xl">
          {[
            { id: 'intro', label: 'Home' },
            { id: 'projects', label: 'Projects' },
            { id: 'about', label: 'About' },
          ].map(({ id, label }) => (
            <li key={id}>
              <a href={`#${id}`} className="nav-link">
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-2 sm:ml-0 lg:gap-3">
          <ThemeToggle />
          <a
            href="/MikaVohlResume.pdf"
            target="_blank"
            rel="noreferrer"
            className="resume-link whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium transition lg:px-4 lg:text-base"
          >
            My Resume
          </a>
        </div>
      </div>
    </nav>
  )
}
