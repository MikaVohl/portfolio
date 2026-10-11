export default function About() {
  return (
    <section
      id="about"
      className="scroll-mt-[calc(9vh+35px)] py-12 text-left md:py-16"
    >
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="text-body text-left text-xl md:flex-1">
          <p className="mb-6">
            I love building, solving hard problems, and learning.
            <br/>
            I'm constantly exploring Machine Learning, Robotics, Programming, and Physics.
          </p>
          <p className="mb-2">
            I'm currently:
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-6">
            <li>Optimizing matrix multiplication for AI inference @ AMD</li>
            <li>A developer for McHacks, McGill's largest hackathon</li>
            <li>Part of the weekly ML reading group @ McGill</li>
          </ul>
          <p className="mb-6">
            Feel free to reach out and connect!
          </p>
        </div>
        <img
          src="/images/MikaVohl2.jpg"
          alt="Mika second portrait"
          width={900}
          height={675}
          className="mx-auto h-80 rounded-[10%] object-cover md:mx-0 md:ml-auto md:w-[400px] md:flex-none"
        />
      </div>
    </section>
  )
}
