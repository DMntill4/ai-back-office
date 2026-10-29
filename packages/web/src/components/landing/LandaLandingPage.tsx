import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  Zap,
  Globe,
  TrendingUp,
  Server,
  Layers,
  Search,
  Sliders,
  BarChart3,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
  Cpu,
  Activity,
  ArrowUpRight,
} from "lucide-react";

interface LandaLandingPageProps {
  onBackToApp?: () => void;
}

export const LandaLandingPage: React.FC<LandaLandingPageProps> = ({
  onBackToApp,
}) => {
  // Navigation Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pricing State: "monthly" | "yearly"
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // FAQ Accordion State (open question id)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Smooth scroll handler
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Pricing tiers data
  const pricingTiers = [
    {
      id: "starter",
      name: "Starter",
      description: "Essential tools for personal portfolios and experimental sites.",
      monthlyPrice: 19,
      yearlyPrice: 15,
      features: [
        "Up to 3 active domains",
        "50,000 monthly visits",
        "Global edge caching",
        "Automated SSL certificates",
        "Community Discord support",
      ],
      popular: false,
      ctaLabel: "Get Started",
    },
    {
      id: "pro",
      name: "Pro",
      description: "Engineered for scaling businesses that demand high conversion rates.",
      monthlyPrice: 49,
      yearlyPrice: 39,
      features: [
        "Unlimited active domains",
        "500,000 monthly visits",
        "Autonomous image compression",
        "Programmatic SEO engine",
        "Real-time analytics dashboard",
        "24/7 dedicated chat support",
      ],
      popular: true,
      ctaLabel: "Start 14-day Free Trial",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Custom architecture, bespoke SLAs, and enterprise-grade security.",
      monthlyPrice: 149,
      yearlyPrice: 119,
      features: [
        "Custom traffic & bandwidth limits",
        "99.99% uptime guarantee SLA",
        "Dedicated edge node clusters",
        "SOC2 & GDPR compliance suite",
        "Custom SSO & SAML integration",
        "Dedicated account manager",
      ],
      popular: false,
      ctaLabel: "Contact Enterprise",
    },
  ];

  // FAQs data
  const faqs = [
    {
      question: "How does Landa optimize my existing website?",
      answer:
        "Landa ingests your site's codebase or static assets, applies automated code-splitting, converts media into modern WebP/AVIF formats, and distributes your application across 300+ edge locations worldwide for sub-100ms first paint.",
    },
    {
      question: "Do I need to migrate my DNS or switch my hosting provider?",
      answer:
        "No. Landa works either as a zero-config standalone edge host or as an acceleration proxy in front of your current backend. Simply add a CNAME record or connect your GitHub repository.",
    },
    {
      question: "Can I import layouts from Figma, Webflow, or Next.js?",
      answer:
        "Yes. Landa provides 1-click connectors for Next.js, Webflow exports, and HTML/CSS bundles. Our parser preserves your exact CSS tokens, typography, and responsive breakpoints.",
    },
    {
      question: "What happens if my site experiences an unexpected viral traffic spike?",
      answer:
        "Landa's elastic edge infrastructure scales dynamically to handle millions of concurrent requests without dropping packets or throttling your bandwidth. No hidden overage penalties.",
    },
    {
      question: "Is there a long-term contract or setup fee?",
      answer:
        "None. All plans operate on month-to-month or annual agreements. You can upgrade, downgrade, or cancel your subscription at any time with a single click.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050806] text-[#EDF2EE] font-sans antialiased selection:bg-[#14B8A6]/30 selection:text-white relative overflow-x-hidden">
      {/* Floating Back to Mint App Button (Convenient workspace toggle) */}
      {onBackToApp && (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBackToApp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0C140F]/90 hover:bg-[#15231B] text-xs font-semibold text-white border border-[#25372C] shadow-2xl backdrop-blur-md cursor-pointer"
          >
            <span>← Return to Mint Workspace</span>
          </motion.button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────
          1. NAVIGATION BAR
      ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[#050806]/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#14B8A6] to-[#9DE342] flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(20,184,166,0.5)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#050806]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white font-mono lowercase">
              landa
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#9DA39E]">
            <button
              onClick={() => scrollToSection("about")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Testimonials
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Right Action */}
          <div className="hidden md:flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => scrollToSection("pricing")}
              className="px-4 py-2 rounded-full bg-white text-[#050806] font-semibold text-xs hover:bg-[#F3F4F1] transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer"
            >
              Get started
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#9DA39E] hover:text-white hover:bg-white/[0.05]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#070D09] border-b border-white/[0.08] px-6 py-4 space-y-3"
            >
              <button
                onClick={() => scrollToSection("about")}
                className="block w-full text-left py-2 text-xs font-medium text-[#9DA39E] hover:text-white"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full text-left py-2 text-xs font-medium text-[#9DA39E] hover:text-white"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="block w-full text-left py-2 text-xs font-medium text-[#9DA39E] hover:text-white"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("testimonials")}
                className="block w-full text-left py-2 text-xs font-medium text-[#9DA39E] hover:text-white"
              >
                Testimonials
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="block w-full text-left py-2 text-xs font-medium text-[#9DA39E] hover:text-white"
              >
                FAQ
              </button>
              <div className="pt-2">
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="w-full py-2.5 rounded-full bg-white text-[#050806] font-semibold text-xs text-center"
                >
                  Get started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ───────────────────────────────────────────────────────────────
          2. HERO SECTION
      ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 px-6 overflow-hidden">
        {/* Background Emerald Aurora & Dithered Grid Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.22),transparent_70%)] pointer-events-none" />
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(157,227,66,0.12),transparent_65%)] blur-2xl pointer-events-none" />

        {/* Digital Dot Texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#14B8A6 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Release Date Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#9DE342] mb-6 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#9DE342] animate-pulse" />
            <span>OCTOBER 2026 RELEASE · V2.4 IS LIVE</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] break-words"
          >
            It’s never been easier <br className="hidden sm:block" />
            to build a website.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-sm sm:text-base text-[#9DA39E] max-w-xl mx-auto leading-relaxed"
          >
            Automate visual hierarchy, accelerate load speeds to under 100ms, and optimize conversion loops with real-time edge telemetry.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => scrollToSection("pricing")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#050806] font-semibold text-xs tracking-wide hover:bg-[#F3F4F1] shadow-[0_0_25px_rgba(20,184,166,0.25)] transition-all cursor-pointer group"
            >
              <span>Join waitlist</span>
              <span className="w-4 h-4 rounded-full bg-[#050806] text-white flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </motion.button>
          </motion.div>

          {/* Floating UI Badges around hero (Inspired by modern builder tools) */}
          <div className="mt-14 relative max-w-3xl mx-auto flex flex-wrap items-center justify-around gap-4 text-left">
            {/* Widget Left */}
            <div className="p-3 rounded-xl bg-[#09100B]/80 border border-white/[0.08] shadow-2xl backdrop-blur-md flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center text-[#14B8A6]">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white">Speed Index: 99.8</p>
                <p className="text-[10px] font-mono text-[#9DA39E]">LCP: 0.42s · Core Web Vitals Pass</p>
              </div>
            </div>

            {/* Widget Right */}
            <div className="p-3 rounded-xl bg-[#09100B]/80 border border-white/[0.08] shadow-2xl backdrop-blur-md flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#9DE342]/10 border border-[#9DE342]/20 flex items-center justify-center text-[#9DE342]">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white">Edge Replication</p>
                <p className="text-[10px] font-mono text-[#9DA39E]">310 PoPs · Automated SSL</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          3. LOGOS ROW (CLIENTS / BRANDS)
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-12 border-y border-white/[0.06] bg-[#070D09]/40">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#6B746E] mb-8">
            POWERING HIGH-CONVERTING SITES ACROSS INDUSTRY LEADERS
          </p>

          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            {["Raycast", "Linear", "Vercel", "Retool", "Diagram", "Supabase"].map((brand) => (
              <span
                key={brand}
                className="font-mono text-sm md:text-base font-bold tracking-wider text-[#A7ADA8] hover:text-white transition-colors select-none"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          4. BENEFITS / SUPERCHARGE SECTION (4 CARDS)
      ─────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white break-words">
              Supercharge your website with Landa.
            </h2>
            <p className="text-xs sm:text-sm text-[#9DA39E] mt-3 leading-relaxed">
              Engineered with modern architecture to eliminate latency, optimize user journeys, and scale autonomously.
            </p>
          </div>

          {/* 4 Cards Grid (2x2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="p-8 rounded-2xl bg-[#09110C] border border-white/[0.06] hover:border-white/[0.12] transition-colors relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center text-[#14B8A6] mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Frictionless user journey
              </h3>
              <p className="text-xs text-[#9DA39E] mt-2 leading-relaxed">
                Sub-second page navigation, instantaneous layout rendering, and optimized fluid transitions that eliminate user drop-off.
              </p>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center text-[11px] font-mono text-[#14B8A6] gap-1">
                <span>Core Web Vitals Optimized</span>
                <span className="text-xs">→</span>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="p-8 rounded-2xl bg-[#09110C] border border-white/[0.06] hover:border-white/[0.12] transition-colors relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#9DE342]/10 border border-[#9DE342]/20 flex items-center justify-center text-[#9DE342] mb-6">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Stronger search presence
              </h3>
              <p className="text-xs text-[#9DA39E] mt-2 leading-relaxed">
                Automated programmatic SEO generation, semantic schema markup, and high mobile performance scores favored by search algorithms.
              </p>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center text-[11px] font-mono text-[#9DE342] gap-1">
                <span>92% Average Rank Increase</span>
                <span className="text-xs">→</span>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="p-8 rounded-2xl bg-[#09110C] border border-white/[0.06] hover:border-white/[0.12] transition-colors relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center text-[#14B8A6] mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Better conversion rates
              </h3>
              <p className="text-xs text-[#9DA39E] mt-2 leading-relaxed">
                Dynamic A/B testing, friction-free checkout funnels, and predictive page prefetching designed specifically to maximize sales.
              </p>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center text-[11px] font-mono text-[#14B8A6] gap-1">
                <span>Conversion Uplift Engine</span>
                <span className="text-xs">→</span>
              </div>
            </motion.div>

            {/* Card 4 */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="p-8 rounded-2xl bg-[#09110C] border border-white/[0.06] hover:border-white/[0.12] transition-colors relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#9DE342]/10 border border-[#9DE342]/20 flex items-center justify-center text-[#9DE342] mb-6">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Smarter infrastructure costs
              </h3>
              <p className="text-xs text-[#9DA39E] mt-2 leading-relaxed">
                Zero idle server compute fees. Edge-native asset caching and automated compression cut cloud bandwidth spend by up to 60%.
              </p>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center text-[11px] font-mono text-[#9DE342] gap-1">
                <span>Cost Compression Architecture</span>
                <span className="text-xs">→</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          5. LAUNCH IN 3 STEPS
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/[0.06] bg-[#070D09]/30">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-14">
            Launch faster in just 3 steps.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#09110C] border border-white/[0.06] space-y-3">
              <span className="font-mono text-xs font-bold text-[#14B8A6]">01</span>
              <h3 className="text-base font-bold text-white">Paste your site URL</h3>
              <p className="text-xs text-[#9DA39E] leading-relaxed">
                Enter your live domain, repository link, or Figma prototype to initiate the automated telemetry scan.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#09110C] border border-white/[0.06] space-y-3">
              <span className="font-mono text-xs font-bold text-[#9DE342]">02</span>
              <h3 className="text-base font-bold text-white">Run deep diagnostics</h3>
              <p className="text-xs text-[#9DA39E] leading-relaxed">
                Our edge engine detects performance bottlenecks, missing metadata, and unused scripts in under 15 seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#09110C] border border-white/[0.06] space-y-3">
              <span className="font-mono text-xs font-bold text-[#14B8A6]">03</span>
              <h3 className="text-base font-bold text-white">Deploy globally</h3>
              <p className="text-xs text-[#9DA39E] leading-relaxed">
                Push your high-performance version live across our global edge CDN with zero downtime and automatic SSL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          6. EXPLANATORY BLOCKS WITH MOCKUP PANELS
      ─────────────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Row 1: Site Optimization */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-mono font-bold text-[#14B8A6] uppercase tracking-wider">
                AUTOMATED PERFORMANCE
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Continuous site optimization without touching code.
              </h3>
              <p className="text-xs sm:text-sm text-[#9DA39E] leading-relaxed">
                Landa runs real-time code-splitting, tree-shaking, and next-gen image compression in the background so your team can focus exclusively on content and conversions.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#CFD4D0]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>Automated AVIF & WebP asset conversion</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>Instant CSS purging & script prioritization</span>
                </li>
              </ul>
            </div>

            {/* Mockup 1: Dashboard Panel */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#09110C] border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06] text-xs font-mono text-[#9DA39E]">
                <span>optimization-engine // telemetry</span>
                <span className="text-[#14B8A6]">● 100% ONLINE</span>
              </div>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#060B08] border border-white/[0.04] flex items-center justify-between">
                  <div>
                    <p className="text-white font-sans text-xs font-semibold">Image Compaction Engine</p>
                    <p className="text-[10px] text-[#6B746E]">Lossless WebP compression active</p>
                  </div>
                  <span className="text-[#14B8A6] font-bold">-72% Bandwidth</span>
                </div>
                <div className="p-3 rounded-xl bg-[#060B08] border border-white/[0.04] flex items-center justify-between">
                  <div>
                    <p className="text-white font-sans text-xs font-semibold">Script Tree-Shaking</p>
                    <p className="text-[10px] text-[#6B746E]">Dead code purged on build</p>
                  </div>
                  <span className="text-[#9DE342] font-bold">0.12s Execution</span>
                </div>
                <div className="p-3 rounded-xl bg-[#060B08] border border-white/[0.04] flex items-center justify-between">
                  <div>
                    <p className="text-white font-sans text-xs font-semibold">Edge CDN Replication</p>
                    <p className="text-[10px] text-[#6B746E]">Global PoPs synchronized</p>
                  </div>
                  <span className="text-[#14B8A6] font-bold">18ms Latency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Real-time Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Mockup 2: Analytics Bar Chart */}
            <div className="lg:col-span-7 order-2 lg:order-1 p-5 rounded-2xl bg-[#09110C] border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06] text-xs font-mono text-[#9DA39E]">
                <span>traffic-analytics // live attribution</span>
                <span className="text-[#9DE342]">1,420 ACTIVE VISITORS</span>
              </div>
              <div className="h-40 w-full flex items-end justify-between gap-3 px-2 pt-4">
                {[
                  { label: "00:00", h: 30 },
                  { label: "04:00", h: 45 },
                  { label: "08:00", h: 80 },
                  { label: "12:00", h: 95 },
                  { label: "16:00", h: 85 },
                  { label: "20:00", h: 65 },
                ].map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      style={{ height: `${b.h}%` }}
                      className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-[#0C1F16] to-[#14B8A6] hover:brightness-125 transition-all"
                    />
                    <span className="text-[9px] font-mono text-[#6B746E]">{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#9DA39E]">
                <span>Conversion Rate: <strong className="text-white">4.82% (+1.4%)</strong></span>
                <span>Bounce Rate: <strong className="text-[#14B8A6]">18.2%</strong></span>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-4">
              <span className="text-xs font-mono font-bold text-[#9DE342] uppercase tracking-wider">
                LIVE TELEMETRY
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Real-time analytics without cookie consent banners.
              </h3>
              <p className="text-xs sm:text-sm text-[#9DA39E] leading-relaxed">
                Lightweight, privacy-first edge analytics give you precise visibility over your visitor behavior, traffic channels, and conversion friction points.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#CFD4D0]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#9DE342]" />
                  <span>100% GDPR & CCPA compliant tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#9DE342]" />
                  <span>Zero bloatware (less than 1KB tracking script)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          7. HORIZONTAL LIST OF MICRO-BENEFITS
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-12 border-y border-white/[0.06] bg-[#070D09]/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Instant Optimization</p>
              <p className="text-[11px] text-[#9DA39E]">No manual tuning required</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Zero Maintenance</p>
              <p className="text-[11px] text-[#9DA39E]">Automated SSL & updates</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Performance Tracking</p>
              <p className="text-[11px] text-[#9DA39E]">Live Core Web Vitals audit</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Intelligent Alerting</p>
              <p className="text-[11px] text-[#9DA39E]">Instant slack & email pings</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          8. PRICING SECTION ("Individual Plans.")
      ─────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 relative">
        {/* Subtle upper emerald glow */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.15),transparent_70%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Individual Plans.
            </h2>
            <p className="text-xs sm:text-sm text-[#9DA39E] mt-3">
              Simple, transparent pricing that scales as your digital presence expands.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="mt-8 inline-flex items-center p-1 rounded-full bg-[#09110C] border border-white/[0.08] text-xs">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-white text-[#050806] font-semibold shadow-sm"
                    : "text-[#9DA39E] hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === "yearly"
                    ? "bg-white text-[#050806] font-semibold shadow-sm"
                    : "text-[#9DA39E] hover:text-white"
                }`}
              >
                <span>Yearly</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#14B8A6]/20 text-[#14B8A6] font-bold">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* 3 Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {pricingTiers.map((tier) => {
              const price = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;

              return (
                <motion.div
                  key={tier.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={`p-8 rounded-2xl flex flex-col justify-between transition-all ${
                    tier.popular
                      ? "bg-[#0A140E] border-2 border-[#14B8A6] shadow-[0_0_35px_rgba(20,184,166,0.18)] relative"
                      : "bg-[#09110C] border border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  {/* Top Badge for Pro */}
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#14B8A6] text-[#050806] text-[10px] font-bold uppercase tracking-wider font-mono">
                      MOST POPULAR
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    </div>
                    <p className="text-xs text-[#9DA39E] min-h-[32px] leading-relaxed">
                      {tier.description}
                    </p>

                    {/* Price display with interactive update */}
                    <div className="my-6">
                      <span className="text-4xl font-extrabold font-mono text-white tabular-nums">
                        ${price}
                      </span>
                      <span className="text-xs font-mono text-[#9DA39E]"> / month</span>
                      {billingCycle === "yearly" && (
                        <p className="text-[10px] font-mono text-[#14B8A6] mt-0.5">
                          Billed annually (${price * 12}/yr)
                        </p>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 pt-4 border-t border-white/[0.06] text-xs">
                      {tier.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-[#CFD4D0]">
                          <Check className="w-3.5 h-3.5 text-[#14B8A6] flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Button */}
                  <div className="pt-8 mt-4">
                    <button
                      className={`w-full py-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        tier.popular
                          ? "bg-white text-[#050806] hover:bg-[#F3F4F1] shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                          : "bg-white/[0.06] text-white hover:bg-white/[0.12] border border-white/[0.08]"
                      }`}
                    >
                      {tier.ctaLabel}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          9. TESTIMONIALS SECTION (6 CARDS)
      ─────────────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6 border-t border-white/[0.06] bg-[#070D09]/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Testimonials
            </h2>
            <p className="text-xs sm:text-sm text-[#9DA39E] mt-3">
              Trusted by world-class designers, engineers, and digital founders.
            </p>
          </div>

          {/* 6 Testimonial Cards (3x2 Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "Landa dropped our page load times from 3.8s down to 420ms. Our organic conversions surged by 34% within the first 10 days of deployment.",
                author: "Sarah Jenkins",
                role: "Design Lead at Vertex Studio",
                avatar: "SJ",
              },
              {
                quote:
                  "The automated image compression and script pruning alone saved our engineering team two full sprint cycles. It is effortlessly fast.",
                author: "Marcus Vance",
                role: "Co-Founder, HyperScale AI",
                avatar: "MV",
              },
              {
                quote:
                  "Zero configuration edge hosting that actually works. We migrated 12 client properties to Landa in one morning without a single hiccup.",
                author: "Elena Rostova",
                role: "VP of Growth, Alto Labs",
                avatar: "ER",
              },
              {
                quote:
                  "The privacy-friendly real-time telemetry gave us actionable visitor analytics without cluttering our UI with obnoxious cookie banners.",
                author: "David Chen",
                role: "Head of Infrastructure, StackWave",
                avatar: "DC",
              },
              {
                quote:
                  "Our SEO rank increased across 40+ high-intent keywords because of Landa's instant Core Web Vitals optimization. Irreplaceable product.",
                author: "Amara Okafor",
                role: "Product Director, Kora Digital",
                avatar: "AO",
              },
              {
                quote:
                  "Figma-level visual polish combined with edge-grade performance. Landa represents the future of modern web deployment.",
                author: "Lucas Meyer",
                role: "Principal Architect, Studio 9",
                avatar: "LM",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-2xl bg-[#09110C] border border-white/[0.06] hover:border-white/[0.12] flex flex-col justify-between space-y-4"
              >
                <p className="text-xs text-[#CFD4D0] leading-relaxed italic">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                  <div className="w-8 h-8 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/30 text-[#14B8A6] font-mono text-xs font-bold flex items-center justify-center">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.author}</p>
                    <p className="text-[10px] text-[#9DA39E]">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          10. STATISTICS BLOCK
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-b border-white/[0.06] bg-[#09110C]/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            <div className="pt-4 md:pt-0">
              <span className="text-4xl sm:text-5xl font-extrabold font-mono text-white tabular-nums">
                99.99%
              </span>
              <p className="text-xs text-[#9DA39E] mt-2 font-medium">Platform Uptime SLA</p>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="text-4xl sm:text-5xl font-extrabold font-mono text-white tabular-nums">
                10K+
              </span>
              <p className="text-xs text-[#9DA39E] mt-2 font-medium">Optimized Websites</p>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="text-4xl sm:text-5xl font-extrabold font-mono text-[#14B8A6] tabular-nums">
                92%
              </span>
              <p className="text-xs text-[#9DA39E] mt-2 font-medium">Higher SEO Scores</p>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="text-4xl sm:text-5xl font-extrabold font-mono text-[#9DE342] tabular-nums">
                50%+
              </span>
              <p className="text-xs text-[#9DA39E] mt-2 font-medium">Faster Load Times</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          11. FAQ ACCORDION ("Got questions? We've got answers.")
      ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Got questions? <br />
              We’ve got answers.
            </h2>
            <p className="text-xs sm:text-sm text-[#9DA39E] mt-3">
              Everything you need to know about Landa's edge compiler and hosting architecture.
            </p>
          </div>

          {/* Accordion Questions */}
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={index}
                  className="rounded-2xl bg-[#09110C] border border-white/[0.06] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-white tracking-tight">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#9DA39E] transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5 text-xs text-[#9DA39E] leading-relaxed border-t border-white/[0.04] pt-3"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          12. FINAL CALL TO ACTION ("Launch a faster site in seconds.")
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden text-center">
        {/* Luminous circular horizon glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.25),transparent_70%)] pointer-events-none" />

        <div className="max-w-2xl mx-auto relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Launch a faster site <br />
            in seconds.
          </h2>
          <p className="text-xs sm:text-sm text-[#9DA39E] leading-relaxed max-w-lg mx-auto">
            Experience next-generation website deployment with automated performance, edge speed, and zero configuration overhead.
          </p>

          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollToSection("pricing")}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#050806] font-semibold text-xs tracking-wide hover:bg-[#F3F4F1] shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all cursor-pointer group"
            >
              <span>Get Early Access</span>
              <span className="w-4 h-4 rounded-full bg-[#050806] text-white flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          13. FOOTER WITH GIANT DITHERED "LANDA" WORDMARK
      ─────────────────────────────────────────────────────────────── */}
      <footer className="pt-16 pb-12 border-t border-white/[0.06] bg-[#030604] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          {/* Top Footer Navigation Columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-14 border-b border-white/[0.06] text-xs">
            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B746E]">
                PRODUCT
              </span>
              <ul className="space-y-2 text-[#9DA39E]">
                <li><button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors cursor-pointer">Features</button></li>
                <li><button onClick={() => scrollToSection("pricing")} className="hover:text-white transition-colors cursor-pointer">Pricing</button></li>
                <li><a href="#about" className="hover:text-white transition-colors">Edge Infrastructure</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Telemetry Engine</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B746E]">
                RESOURCES
              </span>
              <ul className="space-y-2 text-[#9DA39E]">
                <li><a href="#about" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Changelog</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Core Web Vitals Guide</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Community Discord</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B746E]">
                COMPANY
              </span>
              <ul className="space-y-2 text-[#9DA39E]">
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B746E]">
                LEGAL & COMPLIANCE
              </span>
              <ul className="space-y-2 text-[#9DA39E]">
                <li><a href="#about" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Security & SOC2</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">GDPR Compliance</a></li>
              </ul>
            </div>
          </div>

          {/* Giant Oversized Dithered Wordmark ("landa") */}
          <div className="pt-12 pb-6 text-center select-none overflow-hidden">
            <h1
              className="text-[18vw] font-extrabold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#14B8A6]/40 via-[#0A1A14]/20 to-transparent font-mono uppercase opacity-60 pointer-events-none"
              style={{
                letterSpacing: "-0.06em",
              }}
            >
              landa
            </h1>
          </div>

          {/* Bottom Copyright & Status */}
          <div className="pt-4 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#6B746E] gap-3">
            <span>© 2026 Landa Technologies Inc. All rights reserved.</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
              <span>All Systems Operational (310 PoPs Online)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
