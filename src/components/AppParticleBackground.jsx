import '../AppParticleBg.css';

const particleSeeds = [
  { left: '4%', size: 20, delay: '0s', duration: '16s' },
  { left: '12%', size: 28, delay: '2s', duration: '19s' },
  { left: '21%', size: 18, delay: '5s', duration: '17s' },
  { left: '31%', size: 24, delay: '1s', duration: '21s' },
  { left: '42%', size: 30, delay: '6s', duration: '18s' },
  { left: '54%', size: 22, delay: '4s', duration: '20s' },
  { left: '66%', size: 26, delay: '8s', duration: '22s' },
  { left: '75%', size: 18, delay: '3s', duration: '15s' },
  { left: '86%', size: 32, delay: '7s', duration: '23s' },
  { left: '94%', size: 20, delay: '9s', duration: '17s' },
];

function AppParticleBackground() {
  return (
    <div className="app-particle-bg" aria-hidden="true">
      {particleSeeds.map((particle, index) => (
        <span
          key={`${particle.left}-${index}`}
          className="app-particle"
          style={{
            left: particle.left,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
}

export default AppParticleBackground;
