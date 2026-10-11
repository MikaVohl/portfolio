import projects from "../data/projects";

export default function Projects() {
  return (
    <section id="projects" className="scroll-mt-24 mt-0 pb-10 md:pb-14">

      <div className="flex flex-wrap justify-start gap-6">
        {projects.map((p, index) => (
          <a
            key={p.title}
            href={p.href}
            target="_blank"
            rel="noreferrer"
            className={`group w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] ${
              index >= 5 ? 'hidden sm:block' : ''
            }`}
          >
            <div className="project-card flex h-full flex-col rounded-lg border px-5 py-4 text-left shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
              <h3 className="text-2xl font-semibold leading-snug">{p.title}</h3>
              <h4 className="text-muted text-lg font-medium leading-tight">{p.stack}</h4>
              <p className="text-secondary mt-2 mb-3 text-base leading-relaxed">{p.description}</p>
              <div className="project-image hidden h-40 w-full overflow-hidden rounded-md sm:block">
                <img src={p.img} alt={p.title} className="h-full w-full object-contain" />
              </div>
              <div className="mt-auto pt-1">
                <p className="text-secondary h-6 min-h-[1.5rem] font-medium">
                  {p.href.includes("mikavohl.ca") ? "Try it at " : "View it on "}
                  <span className="project-link hover:underline">
                    {p.href.includes("mikavohl.ca") ? p.href.replace(/^https?:\/\//, "") : "Github"}
                  </span>
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
