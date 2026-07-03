const mongoose = require('mongoose');
const User = require('./models/User');
const Job = require('./models/Job');
const axios = require('axios');

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/freelance-app');
  console.log('Connected to DB');

  // 1. Create more freelancers
  const freelancersData = [
    // Previous freelancers
    { name: 'Aarav Sharma', username: 'aarav_s', email: 'aarav@worksphere.com', password: 'password123', role: 'freelancer', skills: ['react', 'nodejs', 'mongodb'], rating: 4.8 },
    { name: 'Vivaan Patel', username: 'vivaan_p', email: 'vivaan@worksphere.com', password: 'password123', role: 'freelancer', skills: ['html', 'css', 'javascript'], rating: 4.5 },
    { name: 'Aditya Gupta', username: 'aditya_g', email: 'aditya@worksphere.com', password: 'password123', role: 'freelancer', skills: ['python', 'django', 'postgresql'], rating: 4.9 },
    { name: 'Diya Singh', username: 'diya_s', email: 'diya@worksphere.com', password: 'password123', role: 'freelancer', skills: ['figma', 'ui/ux', 'web design'], rating: 4.7 },
    { name: 'Ananya Reddy', username: 'ananya_r', email: 'ananya@worksphere.com', password: 'password123', role: 'freelancer', skills: ['react', 'nextjs', 'tailwind'], rating: 4.6 },
    { name: 'Rohan Desai', username: 'rohan_d', email: 'rohan@worksphere.com', password: 'password123', role: 'freelancer', skills: ['angular', 'typescript', 'firebase'], rating: 4.2 },
    { name: 'Neha Joshi', username: 'neha_j', email: 'neha@worksphere.com', password: 'password123', role: 'freelancer', skills: ['seo', 'digital marketing', 'content writing'], rating: 4.8 },
    
    // New freelancers with other categories
    { name: 'Karan Malhotra', username: 'karan_m', email: 'karan@worksphere.com', password: 'password123', role: 'freelancer', skills: ['flutter', 'dart', 'mobile dev'], rating: 4.7 },
    { name: 'Priya Verma', username: 'priya_v', email: 'priya@worksphere.com', password: 'password123', role: 'freelancer', skills: ['video editing', 'premiere pro', 'after effects'], rating: 4.9 },
    { name: 'Amit Kumar', username: 'amit_k', email: 'amit@worksphere.com', password: 'password123', role: 'freelancer', skills: ['aws', 'kubernetes', 'docker', 'devops'], rating: 4.6 },
    { name: 'Sneha Rao', username: 'sneha_r', email: 'sneha@worksphere.com', password: 'password123', role: 'freelancer', skills: ['copywriting', 'blog writing', 'content creation'], rating: 4.5 },
    { name: 'Vikram Singh', username: 'vikram_s', email: 'vikram@worksphere.com', password: 'password123', role: 'freelancer', skills: ['solidity', 'blockchain', 'web3', 'ethereum'], rating: 4.8 },
    { name: 'Pooja Iyer', username: 'pooja_i', email: 'pooja@worksphere.com', password: 'password123', role: 'freelancer', skills: ['cybersecurity', 'penetration testing', 'ethical hacking'], rating: 4.9 }
  ];

  for (let f of freelancersData) {
    if (!await User.findOne({ email: f.email })) {
      await User.create(f);
      console.log(`Created freelancer: ${f.name}`);
    }
  }

  // 2. Create a client
  let client = await User.findOne({ email: 'harikiranap123@gmail.com' });

  // 3. Create more jobs
  const jobsData = [
    // Previous jobs
    { title: 'E-commerce Website Development', description: 'Need a full-stack developer to build an e-commerce site using MERN.', budget: 50000, skills: ['react', 'nodejs', 'mongodb'], category: 'Website development', client: client._id, isApproved: true },
    { title: 'Fullstack SaaS Application', description: 'Looking for a fullstack expert for a new SaaS product.', budget: 80000, skills: ['python', 'django', 'react'], category: 'fullstack', client: client._id, isApproved: true },
    { title: 'Front End Dashboard', description: 'Develop a responsive frontend dashboard.', budget: 30000, skills: ['html', 'css', 'javascript', 'react'], category: 'front end', client: client._id, isApproved: true },
    { title: 'High-Converting Landing Page', description: 'Design and build a landing page for our marketing campaign.', budget: 15000, skills: ['html', 'css', 'figma'], category: 'landing page', client: client._id, isApproved: true },
    { title: 'Data Analysis Script', description: 'Need a python script for data analysis.', budget: 10000, skills: ['python', 'pandas'], category: 'Data Analysis', client: client._id, isApproved: true },
    { title: 'SEO Optimization for Blog', description: 'Improve SEO ranking for our tech blog.', budget: 12000, skills: ['seo', 'digital marketing'], category: 'Marketing', client: client._id, isApproved: true },
    
    // New jobs with other categories
    { title: 'Cross-Platform Mobile App', description: 'Need a developer to build an iOS and Android app using Flutter.', budget: 60000, skills: ['flutter', 'dart', 'mobile dev'], category: 'Mobile App Development', client: client._id, isApproved: true },
    { title: 'Corporate Video Editing', description: 'Looking for a video editor to edit our corporate promo video.', budget: 20000, skills: ['video editing', 'premiere pro'], category: 'Video Editing', client: client._id, isApproved: true },
    { title: 'Cloud Infrastructure Setup', description: 'Set up our scalable backend infrastructure on AWS using Kubernetes.', budget: 90000, skills: ['aws', 'kubernetes', 'docker'], category: 'Cloud Architecture', client: client._id, isApproved: true },
    { title: 'Website Copywriting', description: 'Need compelling copy for our new service pages.', budget: 15000, skills: ['copywriting', 'content creation'], category: 'Content Writing', client: client._id, isApproved: true },
    { title: 'Smart Contract Development', description: 'Create and audit an ERC20 smart contract.', budget: 100000, skills: ['solidity', 'blockchain', 'ethereum'], category: 'Web3 Development', client: client._id, isApproved: true },
    { title: 'Web Application Pentesting', description: 'Perform security penetration testing on our fintech app.', budget: 50000, skills: ['cybersecurity', 'penetration testing'], category: 'Cyber Security', client: client._id, isApproved: true }
  ];

  const jobs = [];
  for (let j of jobsData) {
    let job = await Job.findOne({ title: j.title });
    if (!job) {
      job = await Job.create(j);
      console.log(`Created job: ${j.title}`);
    }
    jobs.push(job);
  }

  // 4. Test AI Match Finder
  console.log('\n--- Testing AI Match Finder on New Jobs ---');
  const allFreelancers = await User.find({ role: 'freelancer' }).select('_id skills name username rating profileCompleteness');
  
  // Test only the last 6 new jobs to keep logs short
  for (let job of jobs.slice(-6)) {
    console.log(`\nJob: ${job.title} | Category: ${job.category}`);
    console.log(`Skills: ${job.skills.join(', ')}`);
    
    const payload = {
      job: {
        id: job._id.toString(),
        title: job.title || '',
        description: job.description || '',
        skills_required: job.skills || []
      },
      freelancers: allFreelancers.map(f => ({
        id: f._id.toString(),
        name: f.name || '',
        skills: f.skills || [],
        rating: f.rating || 5
      }))
    };

    try {
      const aiResponse = await axios.post('http://127.0.0.1:8000/match', payload);
      console.log('AI Matches:');
      aiResponse.data.forEach(match => {
        const fData = allFreelancers.find(f => f._id.toString() === match.freelancer_id);
        if (fData) {
          console.log(` - ${fData.name} (Score: ${match.score.toFixed(4)}, Skills: ${fData.skills.join(', ')})`);
        }
      });
    } catch (err) {
      console.error('Failed to call AI service:', err.message);
    }
  }

  process.exit(0);
}

seed().catch(console.error);
