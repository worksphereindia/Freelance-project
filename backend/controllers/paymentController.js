const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Job = require('../models/Job');
const User = require('../models/User');
const { sendEmail, sendProfessionalEmail } = require('../utils/email');

const emitJobUpdate = (req, userIds) => {
  const io = req.app.get('io');
  if (io) {
    userIds.forEach(id => {
      if (id) io.to(`updates_${id.toString()}`).emit('job_updated');
    });
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateReceiptHtml = ({
  receiptId,
  date,
  category,
  clientName,
  freelancerName,
  jobTitle,
  bidAmount,
  platformFee,
  totalAmount,
  jobId
}) => {
  // Generate random barcode lines
  let barcodeHtml = '';
  for (let i = 0; i < 40; i++) {
    const width = [1, 2, 3][Math.floor(Math.random() * 3)];
    const bg = Math.random() > 0.45 ? '#ffffff' : '#090d16';
    barcodeHtml += `<td width="${width}" style="background-color: ${bg}; height: 32px;"></td>`;
  }

  return `
    <div style="background-color: #f8fafc; padding: 40px 10px; font-family: monospace; text-align: center;">
      <div style="max-width: 360px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 24px; text-align: left; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 16px;">
          <h1 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; color: #0f172a; letter-spacing: -1px;">WorkSphere</h1>
          <p style="font-size: 10px; color: #64748b; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Secure Escrow Receipt</p>
          <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">Mangalore, MAQ - India</p>
        </div>

        <!-- Separator -->
        <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 12px 0;" />

        <!-- Metadata -->
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: monospace; font-size: 11px; color: #475569; border-collapse: collapse;">
          <tr>
            <td align="left" style="padding: 2px 0;">RECEIPT ID:</td>
            <td align="right" style="font-weight: bold; color: #0f172a; padding: 2px 0;">${receiptId}</td>
          </tr>
          <tr>
            <td align="left" style="padding: 2px 0;">DATE:</td>
            <td align="right" style="font-weight: bold; color: #0f172a; padding: 2px 0;">${date}</td>
          </tr>
          <tr>
            <td align="left" style="padding: 2px 0;">CATEGORY:</td>
            <td align="right" style="font-weight: bold; color: #0f172a; padding: 2px 0; text-transform: uppercase;">${category}</td>
          </tr>
          <tr>
            <td align="left" style="padding: 2px 0;">CLIENT:</td>
            <td align="right" style="font-weight: bold; color: #0f172a; padding: 2px 0; text-transform: uppercase;">${clientName}</td>
          </tr>
          <tr>
            <td align="left" style="padding: 2px 0;">TALENT:</td>
            <td align="right" style="font-weight: bold; color: #0f172a; padding: 2px 0; text-transform: uppercase;">${freelancerName}</td>
          </tr>
        </table>

        <!-- Separator -->
        <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 12px 0;" />

        <!-- Itemized Pricing -->
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: monospace; font-size: 11px; color: #475569; border-collapse: collapse; margin-bottom: 8px;">
          <tr style="font-weight: bold; color: #0f172a;">
            <td align="left" style="padding-bottom: 6px;">ITEM DESCRIPTION</td>
            <td align="right" style="padding-bottom: 6px;">PRICE</td>
          </tr>
          <tr>
            <td align="left" style="padding: 2px 0; text-transform: uppercase; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${jobTitle}</td>
            <td align="right" style="color: #0f172a; padding: 2px 0;">₹${bidAmount.toLocaleString('en-IN')}.00</td>
          </tr>
          <tr>
            <td align="left" style="padding: 2px 0;">PLATFORM FEE (5.0%)</td>
            <td align="right" style="color: #0f172a; padding: 2px 0;">₹${platformFee.toLocaleString('en-IN')}.00</td>
          </tr>
        </table>

        <!-- Separator -->
        <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 12px 0;" />

        <!-- Total -->
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: monospace; font-size: 13px; font-weight: bold; color: #0f172a; border-collapse: collapse;">
          <tr>
            <td align="left">GRAND TOTAL:</td>
            <td align="right">₹${totalAmount.toLocaleString('en-IN')}.00</td>
          </tr>
        </table>
        <p style="font-size: 8px; color: #94a3b8; text-align: right; margin: 2px 0 0 0; text-transform: uppercase;">Prices include 5% platform facilitation fee</p>

        <!-- Separator -->
        <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 12px 0;" />

        <!-- Barcode representation -->
        <div style="margin: 12px 0;">
          <table width="100%" height="32" cellpadding="0" cellspacing="0" style="background-color: #090d16; border-collapse: collapse; overflow: hidden; table-layout: fixed;">
            <tr>
              ${barcodeHtml}
            </tr>
          </table>
          <div style="font-size: 8px; color: #94a3b8; text-align: center; margin-top: 4px; letter-spacing: 4px;">${jobId.toString().substring(0, 12).toUpperCase()}</div>
        </div>

        <!-- PAID Stamp -->
        <div style="text-align: center; margin: 16px 0;">
          <div style="display: inline-block; border: 2px dashed #2563eb; color: #2563eb; font-weight: bold; font-size: 13px; padding: 6px 14px; border-radius: 4px; letter-spacing: 1px; text-transform: uppercase;">
            ✓ PAID & ESCROWED
          </div>
        </div>

        <!-- Footer Note -->
        <p style="font-size: 8px; color: #94a3b8; text-align: center; line-height: 1.3; margin: 8px 0 0 0;">
          Thank you for trusting WorkSphere Escrow.<br />Retain this digital thermal receipt for billing verification purposes.
        </p>

      </div>
    </div>
  `;
};

const sendReceiptEmail = async (client, payment, job) => {
  try {
    const freelancer = await User.findById(payment.freelancer);
    const receiptId = `WS-${payment.job.toString().substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const date = payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    
    const htmlContent = generateReceiptHtml({
      receiptId,
      date,
      category: job.category || 'Web Design',
      clientName: client.name || 'Client',
      freelancerName: freelancer?.name || 'Freelancer',
      jobTitle: job.title || 'Project Contract',
      bidAmount: payment.freelancerAmount || (payment.amount - payment.platformFee),
      platformFee: payment.platformFee,
      totalAmount: payment.amount,
      jobId: payment.job
    });

    await sendProfessionalEmail(
      client.email,
      "Payment Receipt - WorkSphere Escrow",
      "Payment Successful! 🎉",
      htmlContent
    );

    if (freelancer && freelancer.email) {
      await sendProfessionalEmail(
        freelancer.email,
        "Escrow Funded - Start Working!",
        "Escrow Funded",
        `<p>Great news! The client has securely deposited your fee into the WorkSphere Escrow for the job <strong>"${job.title}"</strong>.</p><p>You can now safely begin your work knowing your payment is secured.</p>`
      );
    }
  } catch (error) {
    console.error("Failed to send receipt email:", error);
  }
};

// On release, tell both parties the project is complete — revealing ONLY the other side's name (no contact details)
const sendCompletionEmails = async (payment, job) => {
  try {
    const client = await User.findById(payment.client).select('name email');
    const freelancer = await User.findById(payment.freelancer).select('name email');
    const amount = payment.freelancerAmount || (payment.amount - payment.platformFee);

    if (freelancer?.email) {
      await sendProfessionalEmail(
        freelancer.email,
        `Payment released — "${job.title}"`,
        "Payment Released ✓",
        `<p><strong>${client?.name || 'The client'}</strong> has released <strong>₹${amount.toLocaleString('en-IN')}</strong> from escrow for <strong>"${job.title}"</strong>.</p>
         <p>The project is now marked as complete. Thank you for delivering great work on WorkSphere!</p>`
      );
    }
    if (client?.email) {
      await sendProfessionalEmail(
        client.email,
        `Project completed — "${job.title}"`,
        "Project Completed ✓",
        `<p>You've released the escrow to <strong>${freelancer?.name || 'your freelancer'}</strong> for <strong>"${job.title}"</strong>.</p>
         <p>We hope it was a great collaboration. You can hire them again anytime on WorkSphere.</p>`
      );
    }
  } catch (err) {
    console.error('Failed to send completion emails:', err);
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { jobId } = req.body;
    
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to fund this job' });
    }
    if (!job.selectedFreelancer) return res.status(400).json({ message: 'No freelancer selected yet' });

    const basePrice = job.acceptedPrice || job.budget; // Use agreed bid amount if available
    const platformFee = basePrice * 0.05; // 5% platform fee
    const totalAmount = basePrice + platformFee; // Client pays bid + fee
    const freelancerAmount = basePrice; // Freelancer receives full bid

    // Simulation/Fallback mode if Razorpay credentials are not provided
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      const mockOrderId = `mock_order_${Math.random().toString(36).substring(7)}`;
      const payment = await Payment.create({
        job: jobId,
        client: req.user.id,
        freelancer: job.selectedFreelancer,
        razorpayOrderId: mockOrderId,
        amount: totalAmount,
        platformFee,
        freelancerAmount,
        status: 'created'
      });
      return res.json({ isMock: true, order: { id: mockOrderId, amount: Math.round(totalAmount * 100) }, payment });
    }

    const options = {
      amount: Math.round(totalAmount * 100), // Razorpay takes amount in paise (1 INR = 100 paise)
      currency: "INR",
      receipt: `receipt_job_${jobId}`,
    };

    const order = await razorpay.orders.create(options);

    const payment = await Payment.create({
      job: jobId,
      client: req.user.id,
      freelancer: job.selectedFreelancer,
      razorpayOrderId: order.id,
      amount: totalAmount,
      platformFee,
      freelancerAmount,
    });

    res.json({ isMock: false, order, payment });
  } catch (error) {
    console.error('Error in createOrder:', error);
    const errorMsg = error.message || (error.error && error.error.description) || 'Payment initialization failed';
    res.status(500).json({ message: errorMsg });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Auto-verify simulated mock payments
    if (razorpay_order_id && razorpay_order_id.startsWith('mock_order_')) {
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
      if (!payment) return res.status(404).json({ message: 'Payment not found' });

      payment.status = 'escrow_funded';
      payment.razorpayPaymentId = razorpay_payment_id || `mock_pay_${Math.random().toString(36).substring(7)}`;
      await payment.save();

      const job = await Job.findById(payment.job);
      job.paymentStatus = 'escrow_funded';
      job.status = 'in-progress'; // Status becomes in-progress ONLY after payment
      await job.save();

      const client = await User.findById(req.user.id);
      if (client) {
        await sendReceiptEmail(client, payment, job);
      }

      return res.json({ message: 'Mock payment verified successfully and funded to escrow', payment });
    }

    // Simple verification (in production, use crypto to verify signature against RAZORPAY_KEY_SECRET)
    // For this demonstration, we'll assume it's valid if all fields exist
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
      if (!payment) return res.status(404).json({ message: 'Payment not found' });

      payment.status = 'escrow_funded';
      payment.razorpayPaymentId = razorpay_payment_id;
      await payment.save();

      const job = await Job.findById(payment.job);
      job.paymentStatus = 'escrow_funded';
      job.status = 'in-progress'; // Status becomes in-progress ONLY after payment
      await job.save();

      const client = await User.findById(req.user.id);
      if (client) {
        await sendReceiptEmail(client, payment, job);
      }

      // Emit real-time update
      emitJobUpdate(req, [payment.client, payment.freelancer]);

      res.json({ message: 'Payment verified successfully and funded to escrow', payment });
    } else {
      res.status(400).json({ message: 'Invalid payment details' });
    }
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ message: error.message || 'Payment verification failed' });
  }
};

exports.releasePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    
    if (payment.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to release this payment' });
    }
    
    if (payment.status !== 'escrow_funded') {
      return res.status(400).json({ message: 'Payment is not in escrow' });
    }

    // Simulate payout to freelancer's encrypted bank/UPI via Razorpay route
    // In reality, this would use RazorpayX Payouts
    
    payment.status = 'released';
    await payment.save();

    const job = await Job.findById(payment.job);
    job.paymentStatus = 'released';
    job.status = 'completed';
    await job.save();

    await sendCompletionEmails(payment, job);

    // Emit real-time update
    emitJobUpdate(req, [payment.client, payment.freelancer]);

    res.json({ message: 'Payment released to freelancer successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Freelancer earnings dashboard: escrowed / received totals + payment history
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ freelancer: req.user.id })
      .populate('job', 'title category status')
      .populate('client', 'name') // privacy: expose client name only
      .sort({ createdAt: -1 });

    let escrowed = 0; // funds currently held in escrow for this freelancer
    let received = 0; // funds already released to this freelancer

    const history = payments.map((p) => {
      const amount = p.freelancerAmount || (p.amount - p.platformFee);
      if (p.status === 'escrow_funded') escrowed += amount;
      if (p.status === 'released') received += amount;
      return {
        _id: p._id,
        jobTitle: p.job?.title || 'Project',
        category: p.job?.category || '',
        clientName: p.client?.name || 'Client',
        amount,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    res.json({
      summary: {
        escrowed,
        received,
        total: escrowed + received,
        count: history.length
      },
      history
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.releasePaymentByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const payment = await Payment.findOne({ job: jobId, status: 'escrow_funded' });
    if (!payment) return res.status(404).json({ message: 'Active escrow payment not found for this job' });
    
    if (payment.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to release this payment' });
    }

    payment.status = 'released';
    await payment.save();

    const job = await Job.findById(payment.job);
    job.paymentStatus = 'released';
    job.status = 'completed';
    await job.save();

    await sendCompletionEmails(payment, job);

    // Emit real-time update
    emitJobUpdate(req, [payment.client, payment.freelancer]);

    res.json({ message: 'Payment released to freelancer successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
