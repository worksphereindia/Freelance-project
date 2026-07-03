import { useState } from 'react';
import PolicyModal from './PolicyModal';

export default function Footer() {
  const [activePolicy, setActivePolicy] = useState(null);

  const policyData = {
    privacy: { 
      type: 'privacy', 
      title: 'Privacy Policy', 
      content: "1. Information We Collect\nWe collect information you provide directly to us: your name, email, profile data, and payment information for escrow. We also collect usage data (logs, IP addresses).\n\n2. How We Use Your Data\nWe use your data to provide, maintain, and improve WorkSphere; to process escrow transactions and send notices; and to verify identities to prevent fraud.\n\n3. Data Sharing\nWe do not sell your personal data. We may share it with service providers (like Razorpay for payment processing) or when required by law.\n\n4. Data Security\nWe implement enterprise-grade encryption for all in-app messaging and strict access controls for payment details." 
    },
    terms: { 
      type: 'terms', 
      title: 'Terms of Service', 
      content: "1. Acceptance of Terms\nBy accessing WorkSphere, you agree to be bound by these Terms of Service. If you disagree, do not use our platform.\n\n2. User Accounts\nYou must provide accurate information when creating an account. You are responsible for safeguarding your credentials. Admin approval is required for freelancers.\n\n3. Prohibited Conduct\nYou agree not to engage in fraud, circumvent our escrow system, post malicious content, or share personal contact information to bypass platform fees.\n\n4. Platform Fees\nWorkSphere charges a transparent 5% facilitation fee on all completed jobs. This covers escrow management and platform maintenance.\n\n5. Refund Policy\nAll payments processed through the WorkSphere Escrow system are final. Once a payment is securely funded into escrow, it cannot be refunded under any circumstances unless a formal dispute is resolved in the client's favor before funds are released to the freelancer.\n\n6. Termination\nWe reserve the right to suspend or terminate accounts that violate these terms, particularly for attempts to bypass the secure escrow." 
    },
    escrow: { 
      type: 'escrow', 
      title: 'Escrow Guidelines', 
      content: "1. The Escrow Process\nWhen a client accepts a freelancer's bid, the agreed funds (plus the 5% platform fee) must be deposited into the WorkSphere Escrow Account via our payment gateway. Work does not officially begin until these funds are secured.\n\n2. Fund Security\nFunds are held in a secure, non-interest-bearing virtual account. WorkSphere acts as a trusted third party to ensure neither the client nor the freelancer is defrauded.\n\n3. Releasing Funds\nOnce the freelancer delivers the work and the client approves it, the funds are automatically released to the freelancer's linked account. Once funds are released from escrow, the transaction is final and strictly non-refundable.\n\n4. Dispute Resolution\nIf a client rejects the delivered work, either party can initiate a dispute. Our arbitration team will review the in-app communications and deliverables to make a final, binding decision on fund distribution." 
    }
  };

  return (
    <>
      <footer className="py-16 bg-white text-slate-500 text-center border-t border-slate-100 relative z-10 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex justify-center items-center gap-2 text-2xl font-black text-slate-900 tracking-tight">
            <img src="/logo.png" alt="WorkSphere Logo" className="h-8 w-auto grayscale opacity-80" />
            <span>WorkSphere</span>
          </div>
          <p className="text-sm font-medium text-slate-400">&copy; {new Date().getFullYear()} WorkSphere. Built with cryptographic verification.</p>
          <div className="flex justify-center gap-8 text-sm font-bold text-slate-400 pt-4">
            <button onClick={() => setActivePolicy(policyData.privacy)} className="hover:text-blue-600 transition-colors">Privacy</button>
            <button onClick={() => setActivePolicy(policyData.terms)} className="hover:text-blue-600 transition-colors">Terms</button>
            <button onClick={() => setActivePolicy(policyData.escrow)} className="hover:text-blue-600 transition-colors">Escrow</button>
          </div>
        </div>
      </footer>
      
      <PolicyModal 
        isOpen={!!activePolicy} 
        onClose={() => setActivePolicy(null)} 
        policy={activePolicy} 
      />
    </>
  );
}
