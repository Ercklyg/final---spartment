export default function WelcomeBanner({ name }) {
  return <section className="tenant-hero"><p className="tenant-eyebrow">My home</p><h1>Hello, {name?.trim().split(/\s+/)[0] || "there"} <span aria-hidden="true">👋</span></h1><p>Here&apos;s a snapshot of your apartment.</p></section>;
}
