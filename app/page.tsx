"use client";
import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-background antialiased" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      
      {/* TopNavBar */}
      <nav className="navbar">
        <Link href="/" className="navbar-logo" style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display-lg-mobile)' }}>
          ArthAI
        </Link>
        <div className="navbar-center hidden md:flex">
          <Link href="/" className="nav-link">Product</Link>
          <Link href="/" className="nav-link">Solutions</Link>
          <Link href="/" className="nav-link">Philosophy</Link>
          <Link href="/" className="nav-link">Pricing</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost hidden md:inline-flex">Login</button>
          <Link href="/form" className="btn btn-saffron">Book a Demo</Link>
        </div>
      </nav>

      <main style={{ paddingTop: '100px', flex: 1 }}>
        {/* Hero Section */}
        <section className="section container" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '6rem' }}>
          <div className="pill" style={{ marginBottom: '2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--saffron)' }}></span>
            Quiet Intelligence
          </div>
          
          <h1 className="h1" style={{ maxWidth: '800px', marginBottom: '1.5rem', fontFamily: 'var(--font-display-lg-mobile)', lineHeight: '1.1' }}>
            Your website should understand visitors before humans do.
          </h1>
          
          <p className="lead" style={{ maxWidth: '600px', marginBottom: '3rem' }}>
            ArthAI helps you understand what your visitors need the moment they arrive, so you can give them a hand without being pushy.
          </p>
          
          {/* Interactive Demo Form */}
          <div className="card" style={{ maxWidth: '700px', width: '100%', padding: '2.5rem', marginTop: '2rem' }}>
            <h3 className="h3" style={{ marginBottom: '1rem' }}>Try the dynamic personalization engine right now</h3>
            <p className="lead" style={{ fontSize: '0.95rem', marginBottom: '2rem' }}>
              Type any company name below (e.g. Netflix, Apple, Airbnb) to see how ArthAI instantly generates a personalized page for them.
            </p>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const val = (e.currentTarget.elements.namedItem('company') as HTMLInputElement).value;
                if(val) window.location.href = '/' + encodeURIComponent(val.toLowerCase().replace(/\s+/g, ''));
              }}
              style={{ display: 'flex', gap: '1rem', maxWidth: '500px', margin: '0 auto', flexWrap: 'wrap' }}
            >
              <input 
                name="company"
                type="text" 
                placeholder="Enter a company name..." 
                className="input-field"
                style={{ flex: '1 1 250px' }}
                required
              />
              <button type="submit" className="btn btn-saffron" style={{ flexShrink: 0 }}>
                Generate Page
              </button>
            </form>
          </div>

          {/* Trust Signals */}
          <div style={{ marginTop: '5rem', width: '100%' }}>
            <p className="label" style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>Built for modern SaaS teams. Privacy-first by design.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3rem', opacity: 0.6, filter: 'grayscale(100%)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>Acme Corp</span>
              <span style={{ fontSize: '1.5rem', fontStyle: 'italic', fontFamily: 'serif' }}>Globex</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Soylent</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 500 }}>Initech</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Umbrella</span>
            </div>
          </div>
        </section>

        {/* Quiet Intelligence in Motion */}
        <section className="section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 className="h2" style={{ marginBottom: '1rem', fontFamily: 'var(--font-display-lg-mobile)' }}>Quiet Intelligence in Motion</h2>
            <p className="lead" style={{ maxWidth: '600px', margin: '0 auto 3rem auto' }}>
              Experience how subtle contextual shifts create a tailored journey for different personas.
            </p>
            
            <div style={{ display: 'inline-flex', background: 'var(--bg)', borderRadius: '99px', padding: '4px', marginBottom: '3rem', border: '1px solid var(--border)' }}>
              <button className="btn btn-outline" style={{ border: 'none', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>Founder</button>
              <button className="btn btn-ghost">CTO</button>
              <button className="btn btn-ghost">Marketer</button>
            </div>
            
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, var(--saffron), transparent)' }}></div>
              <span className="badge badge-saffron" style={{ marginBottom: '1rem' }}>Detected: Startup Founder</span>
              <h3 className="h2" style={{ fontSize: '2rem', marginBottom: '1rem', fontFamily: 'var(--font-display-lg-mobile)' }}>Ship faster, learn quicker.</h3>
              <p className="lead" style={{ marginBottom: '2rem' }}>
                We know you're moving fast. Here's how our API integrates in under 5 minutes to help you find product-market fit without slowing down.
              </p>
              <button className="btn btn-text" style={{ color: 'var(--saffron)' }}>Read the Founder Guide &rarr;</button>
            </div>
          </div>
        </section>

        {/* Contextual Adaptation */}
        <section className="section container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="h2" style={{ marginBottom: '1rem', fontFamily: 'var(--font-display-lg-mobile)' }}>Contextual Adaptation</h2>
            <p className="lead" style={{ maxWidth: '600px', margin: '0 auto' }}>
              Watch how the interface subtly shifts to meet the distinct needs of every visitor, without disrupting your core brand identity.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {/* Card 1 */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-wrap icon-saffron"><span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>rocket_launch</span></div>
                <h3 className="h4">If you're building software</h3>
              </div>
              <p className="lead" style={{ fontSize: '0.95rem', flex: 1 }}>A SaaS Founder enters and immediately sees startup-focused messaging, highlighting rapid integration and scalability.</p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span className="label" style={{ color: 'var(--text-secondary)' }}>Intent: High</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--saffron)' }}>See how it looks &rarr;</span>
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-wrap icon-saffron"><span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>domain</span></div>
                <h3 className="h4">If you're a big company</h3>
              </div>
              <p className="lead" style={{ fontSize: '0.95rem', flex: 1 }}>An Enterprise leader arrives and the interface brings SOC2 compliance, SLA guarantees, and dedicated support to the forefront.</p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span className="label" style={{ color: 'var(--text-secondary)' }}>Intent: Research</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--saffron)' }}>See how it looks &rarr;</span>
              </div>
            </div>
            
            {/* Card 3 */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-wrap icon-saffron"><span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>shopping_cart</span></div>
                <h3 className="h4">If you're selling online</h3>
              </div>
              <p className="lead" style={{ fontSize: '0.95rem', flex: 1 }}>An E-commerce director visits and the site seamlessly shifts to showcase conversion rate lifts, cart abandonment recovery, and reliability.</p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span className="label" style={{ color: 'var(--text-secondary)' }}>Intent: Evaluation</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--saffron)' }}>See how it looks &rarr;</span>
              </div>
            </div>
            
            {/* Card 4 */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-wrap icon-saffron"><span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>person_search</span></div>
                <h3 className="h4">If you're looking for talent</h3>
              </div>
              <p className="lead" style={{ fontSize: '0.95rem', flex: 1 }}>A Talent Acquisition specialist explores and the narrative revolves around employer branding, candidate engagement, and seamless ATS syncing.</p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span className="label" style={{ color: 'var(--text-secondary)' }}>Intent: Discovery</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--saffron)' }}>See how it looks &rarr;</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '3rem 0' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
          <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display-lg-mobile)', fontWeight: 700, color: 'var(--charcoal)' }}>
            ArthAI
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <Link href="/" className="nav-link">Privacy Policy</Link>
            <Link href="/" className="nav-link">Terms of Service</Link>
            <Link href="/" className="nav-link">Security</Link>
            <Link href="/" className="nav-link">Contact</Link>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            © 2024 ArthAI. Purpose in Intelligence.
          </div>
        </div>
      </footer>
      
    </div>
  );
}
