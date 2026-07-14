import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  Mic,
  BarChart2,
  History,
  Layers,
  Sparkles,
  Check,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <Zap className="h-6 w-6 text-violet-400" />
          Apex.ai
        </Link>

        {/* Nav links */}
        <ul className="hidden items-center gap-8 text-sm font-medium text-gray-400 md:flex">
          <li>
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
          </li>
          <li>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </li>
          <li>
            <a href="#how-it-works" className="transition-colors hover:text-white">
              About
            </a>
          </li>
        </ul>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 text-white hover:bg-violet-700"
            asChild
          >
            <Link to="/register">Get Started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gray-950 py-28 sm:py-36">
      {/* Animated gradient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-700/30 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 right-0 h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="flex flex-col items-center gap-6"
        >
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Interview Practice
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Ace Your Next{' '}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Interview
            </span>{' '}
            with AI
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="max-w-2xl text-lg text-gray-400 sm:text-xl"
          >
            Practice with realistic AI-driven interviews, get instant feedback, and track your
            progress — all in one place.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-violet-600 px-8 text-white hover:bg-violet-700"
              asChild
            >
              <Link to="/register">Start Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              asChild
            >
              <a href="#how-it-works" className="flex items-center gap-2">
                See How It Works <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

const features = [
  {
    icon: Brain,
    title: 'AI-Generated Questions',
    description:
      'Our model crafts role-specific questions tailored to the job description and your experience level.',
  },
  {
    icon: Mic,
    title: 'Real-Time Transcription',
    description:
      'Speak naturally — your answers are transcribed live so you can review exactly what you said.',
  },
  {
    icon: BarChart2,
    title: 'Detailed Performance Reports',
    description:
      'Get scored on clarity, completeness, confidence, and technical depth after every session.',
  },
  {
    icon: History,
    title: 'Interview History & Analytics',
    description:
      'Track improvement over time with trend charts and a full searchable history of past interviews.',
  },
  {
    icon: Layers,
    title: 'Multiple Interview Types',
    description:
      'Behavioral, technical, system design — practice any format with customizable difficulty.',
  },
  {
    icon: Sparkles,
    title: 'Personalized Suggestions',
    description:
      'Receive tailored coaching tips after each session so you always know what to work on next.',
  },
];

function Features() {
  return (
    <section id="features" className="bg-gray-900 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Features
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-2 text-4xl font-bold text-white">
            Everything you need to prepare
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-gray-400">
            Built for engineers, designed to get you hired. Apex.ai covers every angle of
            interview preparation.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-gray-800/50 p-6 transition-colors hover:border-violet-500/40 hover:bg-gray-800"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">
                <Icon className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How It Works
// ---------------------------------------------------------------------------

const steps = [
  {
    number: '01',
    title: 'Configure',
    description:
      'Choose your interview type, difficulty, and job role. Paste a job description for hyper-targeted questions.',
  },
  {
    number: '02',
    title: 'Lobby Check',
    description:
      'Test your mic and camera in the pre-interview lobby so nothing interrupts your flow once you start.',
  },
  {
    number: '03',
    title: 'Interview',
    description:
      'Answer AI questions in a realistic, timed environment with live transcription running in the background.',
  },
  {
    number: '04',
    title: 'Get Your Report',
    description:
      'Receive an in-depth performance report instantly — export as PDF or share with a link.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-950 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            How It Works
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-2 text-4xl font-bold text-white">
            Four steps to your dream offer
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map(({ number, title, description }) => (
            <motion.div key={number} variants={fadeUp} className="relative flex flex-col gap-4">
              <span className="text-5xl font-black text-violet-500/20">{number}</span>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{description}</p>
              {/* connector line (hidden on last item via CSS) */}
              <div className="absolute right-0 top-8 hidden h-px w-8 bg-violet-500/20 lg:block last:hidden" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

const freeTier = {
  name: 'Free',
  price: '$0',
  period: 'forever',
  description: 'Perfect for getting started and exploring the platform.',
  perks: ['5 interviews per day', 'Basic performance reports', 'Interview history (7 days)', 'Standard question bank'],
  cta: 'Get Started Free',
  ctaLink: '/register',
  highlight: false,
};

const proTier = {
  name: 'Pro',
  price: '$9.99',
  period: 'per month',
  description: 'Unlock everything you need to land the offer.',
  perks: [
    'Unlimited interviews',
    'Detailed performance reports',
    'PDF export',
    'Shareable report links',
    'Full interview history',
    'Priority support',
    'Advanced analytics',
  ],
  cta: 'Upgrade to Pro',
  ctaLink: '/register',
  highlight: true,
};

function PricingCard({
  tier,
}: {
  tier: typeof freeTier | typeof proTier;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        tier.highlight
          ? 'border-violet-500 bg-violet-600/10 shadow-[0_0_40px_-8px_rgba(139,92,246,0.4)]'
          : 'border-white/10 bg-gray-800/50'
      }`}
    >
      {tier.highlight && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-semibold text-white">
          Most Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-extrabold text-white">{tier.price}</span>
          <span className="mb-1 text-sm text-gray-400">/{tier.period}</span>
        </div>
        <p className="mt-2 text-sm text-gray-400">{tier.description}</p>
      </div>

      <ul className="mb-8 flex flex-col gap-3">
        {tier.perks.map((perk) => (
          <li key={perk} className="flex items-center gap-3 text-sm text-gray-300">
            <Check className="h-4 w-4 flex-shrink-0 text-violet-400" />
            {perk}
          </li>
        ))}
      </ul>

      <Button
        className={`mt-auto w-full ${
          tier.highlight
            ? 'bg-violet-600 text-white hover:bg-violet-700'
            : 'border border-white/20 bg-transparent text-white hover:bg-white/10'
        }`}
        asChild
      >
        <Link to={tier.ctaLink}>{tier.cta}</Link>
      </Button>
    </motion.div>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-gray-900 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Pricing
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-2 text-4xl font-bold text-white">
            Simple, transparent pricing
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-lg text-gray-400">
            Start for free and upgrade when you're ready to go all in on your prep.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="grid gap-8 md:grid-cols-2"
        >
          <PricingCard tier={freeTier} />
          <PricingCard tier={proTier} />
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-gray-950 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-white">
          <Zap className="h-4 w-4 text-violet-400" />
          Apex.ai
        </Link>

        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Apex.ai. All rights reserved.
        </p>

        <div className="flex gap-6 text-sm text-gray-400">
          <a href="#" className="transition-colors hover:text-white">
            Terms
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
