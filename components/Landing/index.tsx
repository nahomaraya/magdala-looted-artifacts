import TopNav from './TopNav';
import Hero from './Hero';
import Story from './Story';
import Timeline from './Timeline';
import ExploreMenu from './ExploreMenu';
import Footer from './Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-navy">
      <TopNav />
      <main>
        <Hero />
        <Story />
        <Timeline />
        <ExploreMenu />
      </main>
      <Footer />
    </div>
  );
}
