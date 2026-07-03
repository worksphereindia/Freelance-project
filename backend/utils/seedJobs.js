const Job = require('../models/Job');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const seedJobs = async () => {
  try {
    // Only seed when explicitly enabled (prevents re-inserting demo data on every boot)
    if (process.env.SEED !== 'true') {
      console.log('Seeding disabled (set SEED=true in .env to enable).');
      return;
    }

    const jobCount = await Job.countDocuments();
    if (jobCount > 0) {
      console.log('Database already has jobs. Skipping seeding.');
      return;
    }

    console.log('Seeding jobs...');

    // Find or create a client user
    let client = await User.findOne({ role: 'client' });
    if (!client) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      client = await User.create({
        name: 'Harish Kumar',
        email: 'client@WorkOwn.com',
        password: hashedPassword,
        role: 'client',
        companyName: 'Apex Digital Inc.',
        isProfileComplete: true,
        isVerified: true
      });
      console.log('Dummy client user created for seeding.');
    }

    // Seed jobs
    const jobs = [
      {
        client: client._id,
        title: 'Next.js E-Commerce platform for D2C Fashion Brand',
        description: 'Looking for an expert Web Designer/Developer to build a modern, high-performance Next.js store. Needs styling with Tailwind CSS, Stripe/Razorpay payment gateway, and a custom product customizer. The layout must feel extremely premium with micro-interactions and smooth page transitions. The freelancer will also design the user experience (UX) and dashboard for customer tracking.',
        budget: 75000,
        skills: ['React', 'Next.js', 'Tailwind CSS', 'Razorpay'],
        category: 'Web Design',
        status: 'open'
      },
      {
        client: client._id,
        title: 'Cinematic SaaS Explainer Video & Product Promo',
        description: 'We need a cinematic 2-minute product video for our SaaS landing page. You\'ll be provided with screencasts, logo assets, and a basic script. You will handle voiceover selection, motion graphics, audio sync, color grading, and SFX. Must have a futuristic vibe with premium animations and smooth zoom transitions.',
        budget: 35000,
        skills: ['Adobe Premiere', 'After Effects', 'Motion Graphics', 'Video Editing'],
        category: 'Video Editing',
        status: 'open'
      },
      {
        client: client._id,
        title: '15 Engaging FinTech Reels & TikTok Videos',
        description: 'Looking for a creative reels maker to produce 15 short-form videos explaining stock market concepts. Must add engaging dynamic captions, B-roll overlays, kinetic typography, and fast-paced sound effects. Examples: Ali Abdaal or Iman Gadzhi style edits. Captions must be animated and use brand colors.',
        budget: 20000,
        skills: ['CapCut', 'Video Editing', 'Shorts/Reels', 'Kinetic Typography'],
        category: 'Reels Making',
        status: 'open'
      },
      {
        client: client._id,
        title: 'High-converting Landing Page Copy for AI Productivity App',
        description: 'We need a copywriter to craft high-fidelity landing page copy. The focus is on translating complex AI features into benefits for remote teams. Must include hero headlines, value propositions, feature descriptions, and multiple CTA texts. Requires familiarity with SaaS platforms and conversion rate optimization (CRO) principles.',
        budget: 15000,
        skills: ['Copywriting', 'Content Writing', 'SEO', 'SaaS Copy'],
        category: 'Copywriting',
        status: 'open'
      },
      {
        client: client._id,
        title: 'Meta Ads Campaign & Lead Generation for EdTech Platform',
        description: 'Looking for a media buyer to set up, optimize, and manage our Facebook and Instagram Ads campaigns. Goal is to generate demo class signups for coding courses. Budget does not include ad spend. Weekly reporting, custom audiences creation, and copy tweaks are required.',
        budget: 45000,
        skills: ['Meta Ads', 'Lead Gen', 'Copywriting', 'A/B Testing'],
        category: 'Digital Marketing',
        status: 'open'
      },
      {
        client: client._id,
        title: 'E-Commerce SEO Audit & 3-Month Keyword Growth Strategy',
        description: 'We are an online pharmacy store experiencing a decline in organic traffic. We need a comprehensive technical SEO audit, on-page optimization recommendations, and a structured 3-month blog content/backlink strategy. Experience with Google Analytics, Semrush, and Shopify SEO is highly preferred.',
        budget: 30000,
        skills: ['SEO', 'Google Analytics', 'Content Audit', 'Keyword Research'],
        category: 'SEO Optimization',
        status: 'open'
      }
    ];

    await Job.insertMany(jobs);
    console.log('Successfully seeded 6 premium jobs!');
  } catch (error) {
    console.error('Error seeding jobs:', error);
  }
};

module.exports = seedJobs;
