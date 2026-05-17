"use client";
import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-background font-body-md antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      
{/* TopNavBar */}
<nav className="bg-surface/80  backdrop-blur-md text-primary  font-body-md text-body-md fixed top-0 w-full z-50 border-b border-outline-variant/30 ">
<div className="flex justify-between items-center h-20 px-5 md:px-16 max-w-7xl mx-auto">
<div className="font-headline-sm text-headline-sm font-bold text-on-surface ">
                ArthAI
            </div>
<div className="hidden md:flex items-center gap-8">
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed transition-colors" href="/">Product</a>
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed transition-colors" href="/">Solutions</a>
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed transition-colors" href="/">Philosophy</a>
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed transition-colors" href="/">Pricing</a>
</div>
<div className="hidden md:flex items-center gap-4">
<button className="text-on-surface-variant  hover:text-primary :text-primary-fixed transition-colors font-body-md">Login</button>
<Link href="/form"  className="bg-primary text-on-primary px-6 py-3 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all duration-300 font-body-md">Book a Demo</Link>
</div>
<button className="md:hidden text-on-surface">
<span className="material-symbols-outlined text-[24px]">menu</span>
</button>
</div>
</nav>
<main className="pt-24 md:pt-32">
{/* Hero Section */}
<section className="px-5 md:px-16 max-w-7xl mx-auto py-20 md:py-[120px] text-center flex flex-col items-center">
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/50 mb-8 reveal">
<span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse"></span>
<span className="font-label-caps text-label-caps text-on-surface-variant">Quiet Intelligence</span>
</div>
<h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface max-w-[800px] mb-8 leading-tight reveal delay-100">Your website should understand visitors before humans do.</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px] mb-8 reveal delay-200">ArthAI helps you understand what your visitors need the moment they arrive, so you can give them a hand without being pushy.</p>
<div className="mt-20 w-full max-w-[800px] mx-auto rounded-xl border border-outline-variant/30 bg-surface-container-low p-8 text-center reveal delay-300">
  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Try the dynamic personalization engine right now</h3>
  <p className="font-body-md text-on-surface-variant mb-6">Type any company name below (e.g. Netflix, Apple, Airbnb) to see how ArthAI instantly generates a personalized page for them.</p>
  
  <form 
    onSubmit={(e) => {
      e.preventDefault();
      const val = (e.currentTarget.elements.namedItem('company') as HTMLInputElement).value;
      if(val) window.location.href = '/' + encodeURIComponent(val.toLowerCase().replace(/\s+/g, ''));
    }}
    className="flex flex-col sm:flex-row gap-4 max-w-[500px] mx-auto"
  >
    <input 
      name="company"
      type="text" 
      placeholder="Enter a company name..." 
      className="flex-1 px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary transition-colors"
      required
    />
    <button type="submit" className="bg-primary text-on-primary px-6 py-3 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all font-bold">
      Generate Page
    </button>
  </form>
</div>
{/* Trust Signals */}
<div className="mt-20 w-full text-center reveal">
<p className="font-body-md text-body-md text-on-surface-variant mb-8">Built for modern SaaS teams. Privacy-first by design.</p>
<div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-60 grayscale">
<span className="font-headline-sm text-headline-sm font-bold tracking-tighter text-on-surface">Acme Corp</span>
<span className="font-headline-sm text-headline-sm font-serif italic text-on-surface">Globex</span>
<span className="font-headline-sm text-headline-sm font-bold uppercase tracking-widest text-on-surface">Soylent</span>
<span className="font-headline-sm text-headline-sm font-medium text-on-surface">Initech</span>
<span className="font-headline-sm text-headline-sm font-bold text-on-surface">Umbrella</span>
</div>
</div>
</section>
{/* Quiet Intelligence in Motion */}
<section className="bg-surface py-20 border-t border-outline-variant/30">
<div className="px-5 md:px-16 max-w-7xl mx-auto text-center reveal">
<h2 className="font-headline-md text-headline-md text-on-surface mb-4">Quiet Intelligence in Motion</h2>
<p className="font-body-md text-body-md text-on-surface-variant max-w-[600px] mx-auto mb-8">Experience how subtle contextual shifts create a tailored journey for different personas.</p>
<div className="inline-flex bg-surface-container rounded-full p-1 mb-20">
<button className="px-6 py-2 rounded-full bg-surface text-on-surface shadow-sm font-body-md transition-all">Founder</button>
<button className="px-6 py-2 rounded-full text-on-surface-variant hover:text-on-surface font-body-md transition-all">CTO</button>
<button className="px-6 py-2 rounded-full text-on-surface-variant hover:text-on-surface font-body-md transition-all">Marketer</button>
</div>
<div className="max-w-[800px] mx-auto bg-surface-container-low border border-outline-variant/50 rounded-2xl p-20 text-left relative overflow-hidden group hover:shadow-md transition-shadow">
<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-fixed-dim to-transparent"></div>
<span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-label-caps font-label-caps mb-4">Detected: Startup Founder</span>
<h3 className="font-headline-md text-headline-md text-on-surface mb-2">Ship faster, learn quicker.</h3>
<p className="font-body-lg text-body-lg text-on-surface-variant mb-8">We know you're moving fast. Here's how our API integrates in under 5 minutes to help you find product-market fit without slowing down.</p>
<button className="text-primary font-body-md hover:underline underline-offset-4">Read the Founder Guide -&gt;</button>
</div>
</div>
</section>
{/* The Transformation */}
<section className="bg-surface-container-low py-20 border-t border-outline-variant/30">
<div className="px-5 md:px-16 max-w-7xl mx-auto text-center reveal">
<h2 className="font-headline-md text-headline-md text-on-surface mb-2">The Transformation</h2>
<p className="font-body-md text-body-md text-on-surface-variant max-w-[600px] mx-auto mb-20">Move from static, one-size-fits-all pages to dynamic, breathing experiences.</p>
<div className="rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm max-w-[1000px] mx-auto bg-surface">
<img alt="Before vs After transformation" className="w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOW_xn3NG6qXrsUE4gCGw6lyAT9s7n_FzCZfeXrBsIVWvQb62hNqGCqMyQ7wgUU61bwE-0pleCjxiwtvKgYk4dHRQUtRvb6psKfxOs0sNpQP-4VK91jfDYmSREhk-EMQQzB2qh7MIOTCNOQDNfrfCZ2-uTHCCZTjoHN_mUPcs-wvuUg8nuxty2mwaDUTSETEqht4pwgCMVWsD-1C8tJa3yhSsnBqMtA35ffzBxUrE5F4QHA6XSbpO8Gbov9jFG6pm8tPNB5coahcPx"/>
</div>
</div>
</section>
{/* Dynamic Personalization Demo */}
<section className="bg-background py-20 border-t border-outline-variant/30">
<div className="px-5 md:px-16 max-w-7xl mx-auto reveal">
<div className="text-center mb-20">
<h2 className="font-headline-md text-headline-md text-on-surface mb-2">Contextual Adaptation</h2>
<p className="font-body-md text-body-md text-on-surface-variant max-w-[500px] mx-auto">
                        Watch how the interface subtly shifts to meet the distinct needs of every visitor, without disrupting your core brand identity.
                    </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
{/* SaaS Founder Card */}
<div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-8 flex flex-col gap-4 hover:border-primary-fixed-dim hover:shadow-sm transition-all duration-300">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary-fixed-dim">rocket_launch</span>
<h3 className="font-headline-sm text-headline-sm text-on-surface">If you're building software</h3>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">A SaaS Founder enters and immediately sees startup-focused messaging, highlighting rapid integration and scalability.</p>
<div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant">
<span className="">Intent: High</span>
<span className="text-primary">See how it looks -&gt;</span>
</div>
</div>
{/* Enterprise Card */}
<div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-8 flex flex-col gap-4 hover:border-primary-fixed-dim hover:shadow-sm transition-all duration-300">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary-fixed-dim">domain</span>
<h3 className="font-headline-sm text-headline-sm text-on-surface">If you're a big company</h3>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">An Enterprise leader arrives and the interface brings SOC2 compliance, SLA guarantees, and dedicated support to the forefront.</p>
<div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant">
<span className="">Intent: Research</span>
<span className="text-primary">See how it looks -&gt;</span>
</div>
</div>
{/* E-commerce Card */}
<div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-8 flex flex-col gap-4 hover:border-primary-fixed-dim hover:shadow-sm transition-all duration-300">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary-fixed-dim">shopping_cart</span>
<h3 className="font-headline-sm text-headline-sm text-on-surface">If you're selling online</h3>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">An E-commerce director visits and the site seamlessly shifts to showcase conversion rate lifts, cart abandonment recovery, and reliability.</p>
<div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant">
<span className="">Intent: Evaluation</span>
<span className="text-primary">See how it looks -&gt;</span>
</div>
</div>
{/* Recruiter Card */}
<div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-8 flex flex-col gap-4 hover:border-primary-fixed-dim hover:shadow-sm transition-all duration-300">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary-fixed-dim">person_search</span>
<h3 className="font-headline-sm text-headline-sm text-on-surface">If you're looking for talent</h3>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">A Talent Acquisition specialist explores and the narrative revolves around employer branding, candidate engagement, and seamless ATS syncing.</p>
<div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant">
<span className="">Intent: Discovery</span>
<span className="text-primary">See how it looks -&gt;</span>
</div>
</div>
</div>
</div>
</section>
{/* "How It Works" Flow */}
<section className="px-5 md:px-16 max-w-7xl mx-auto py-20 reveal">
<h2 className="font-headline-md text-headline-md text-on-surface mb-8 text-center">How we help you connect</h2>
<div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mt-20">
{/* Connector Line (Hidden on mobile) */}
<div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-outline-variant/30 -z-10 -translate-y-1/2"></div>
<div className="flex flex-col items-center text-center bg-background px-4 w-full md:w-auto">
<div className="w-12 h-12 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-on-surface-variant">login</span>
</div>
<span className="font-label-caps text-label-caps text-on-surface">They arrive</span>
</div>
<div className="flex flex-col items-center text-center bg-background px-4 w-full md:w-auto">
<div className="w-12 h-12 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-primary-fixed-dim">search_insights</span>
</div>
<span className="font-label-caps text-label-caps text-on-surface">We learn</span>
</div>
<div className="flex flex-col items-center text-center bg-background px-4 w-full md:w-auto">
<div className="w-12 h-12 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-primary">See how it looks -&gt;</span>
</div>
<span className="font-label-caps text-label-caps text-on-surface">We adapt</span>
</div>
<div className="flex flex-col items-center text-center bg-background px-4 w-full md:w-auto">
<div className="w-12 h-12 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-secondary">view_quilt</span>
</div>
<span className="font-label-caps text-label-caps text-on-surface">They feel at home</span>
</div>
<div className="flex flex-col items-center text-center bg-background px-4 w-full md:w-auto">
<div className="w-12 h-12 rounded-full bg-on-surface text-surface flex items-center justify-center mb-4">
<span className="material-symbols-outlined">trending_up</span>
</div>
<span className="font-label-caps text-label-caps text-on-surface">They join you</span>
</div>
</div>
</section>
</main>
{/* Footer */}
<footer className="bg-surface-container  text-on-surface  font-label-caps text-label-caps w-full py-8 border-t border-outline-variant/30 mt-20 reveal">
<div className="flex flex-col md:flex-row justify-between items-center gap-4 px-5 md:px-16 max-w-7xl mx-auto">
<div className="font-headline-sm text-headline-sm text-on-surface">
                ArthAI
            </div>
<div className="flex items-center gap-4 flex-wrap justify-center">
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed underline-offset-4 hover:underline transition-all" href="/">Privacy Policy</a>
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed underline-offset-4 hover:underline transition-all" href="/">Terms of Service</a>
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed underline-offset-4 hover:underline transition-all" href="/">Security</a>
<a className="text-on-surface-variant  hover:text-primary :text-primary-fixed underline-offset-4 hover:underline transition-all" href="/">Contact</a>
</div>
<div className="text-on-surface-variant ">
                © 2024 ArthAI. Purpose in Intelligence.
            </div>
</div>
</footer>

    </div>
  );
}
