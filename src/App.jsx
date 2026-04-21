import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './index.css';

// Reusable SEO Component
const PageSEO = ({ title, description }) => {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.remove();
    const metaDesc = document.createElement('meta');
    metaDesc.name = "description";
    metaDesc.content = description;
    document.head.appendChild(metaDesc);
  }, [title, description]);
  return null;
};

// Navbar Component
const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">Saadawa Data</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <a href="#features">Features</a>
          <a href="#networks">Networks</a>
          <a href="#download">Download</a>
        </div>
        <div className="nav-buttons">
          <a href="#login" className="btn-login">Login</a>
          <a href="#register" className="btn-register">Register</a>
        </div>
      </div>
    </nav>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="#contact">Contact Us</a>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/delete-account-policy">Delete Account Policy</Link>
      </div>
      <div className="footer-bottom">
        Developed by <span>HK CREATIVE LTD .</span>
      </div>
    </footer>
  );
};

// Privacy Policy Page
const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="main-wrapper">
      <PageSEO 
        title="Privacy Policy - Saadawa Data" 
        description="Your privacy matters to us at Saadawa Data. Learn how we protect your data." 
      />
      <header className="page-header animate-fade-in">
        <h1>Privacy Policy</h1>
        <p>Your privacy matters to us at Saadawa Data. Learn how we protect your data.</p>
      </header>

      <section className="content-section animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <div className="policy-block">
          <span className="update-date">Last Updated: April 21, 2026</span>
          
          <h2 className="first">1. Introduction</h2>
          <p>
            Saadawa Data is a Virtual Top-Up (VTU) application for airtime, data, and bill payments in Nigeria. We are committed to safeguarding your privacy and ensuring your personal information is protected. This Privacy Policy explains how we collect, use, and store your data when you create an account and use our app. By using Saadawa Data, you agree to the practices described herein.
          </p>

          <h2>2. Age Restriction</h2>
          <p>
            Saadawa Data is intended for users aged 18 and older. We do not knowingly collect personal information from individuals under 18. If we discover that a user under 18 has created an account, we will terminate the account and delete all associated data. If you are a parent or guardian and believe your child has provided us with data, please contact us at info@saadawa.com.ng or aliyufalalu10@gmail.com.
          </p>

          <h2>3. Account Creation</h2>
          <p>
            To use Saadawa Data, you must create an account, as our app requires login for all services, including airtime top-ups, data purchases, and bill payments. During account creation, we collect:
          </p>
          <ul>
            <li><strong>Personal Information:</strong> Full name, phone number, email address, and a secure password.</li>
          </ul>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and notifying us immediately of any unauthorized access.
          </p>

          <h2>4. Information We Collect</h2>
          <p>We collect the following data to provide our services:</p>
          <ul>
            <li><strong>Account Information:</strong> Data provided during registration, as described above.</li>
            <li><strong>Transaction Data:</strong> Details of your airtime top-ups, data purchases, and bill payments, including network provider, amount, and timestamp.</li>
            <li><strong>Device Information:</strong> Device type, operating system, IP address, and unique identifiers for security and analytics.</li>
          </ul>

          <h2>5. How We Use Your Information</h2>
          <p>We use your data solely to:</p>
          <ul>
            <li>Facilitate account creation and login.</li>
            <li>Process transactions for airtime, data, and bill payments.</li>
            <li>Provide customer support and respond to your inquiries.</li>
            <li>Enhance app functionality and user experience through analytics.</li>
            <li>Send transactional notifications (e.g., payment confirmations).</li>
            <li>Detect and prevent fraud, unauthorized access, or security breaches.</li>
            <li>Comply with legal obligations under the Nigeria Data Protection Regulation (NDPR) and other applicable laws.</li>
          </ul>

          <h2>6. Data Sharing and Disclosure</h2>
          <p>
            We do not share, sell, or disclose your personal information to any third parties, except as required by law. For example, we may disclose data to legal authorities if compelled by a court order or to protect our rights, safety, or property. All transactions are processed directly through secure payment gateways, and we do not share your payment details with external entities.
          </p>

          <h2>7. Data Security</h2>
          <p>
            We employ industry-standard security measures, including encryption, secure servers, and access controls, to protect your data. However, no system is entirely secure. We recommend using a strong, unique password and enabling two-factor authentication (if available) to enhance your account security.
          </p>

          <h2>8. Your Rights</h2>
          <p>Under the NDPR, you have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the data we hold about you.</li>
            <li><strong>Correction:</strong> Update inaccurate or incomplete data.</li>
            <li><strong>Deletion:</strong> Request deletion of your data, subject to legal retention requirements.</li>
            <li><strong>Objection:</strong> Object to certain data processing activities.</li>
            <li><strong>Complaint:</strong> Lodge a complaint with the National Information Technology Development Agency (NITDA).</li>
          </ul>
          <p>To exercise these rights, contact us at info@saadawa.com.ng or aliyufalalu10@gmail.com.</p>

          <h2>9. Cookies and Tracking</h2>
          <p>
            Our app and website may use cookies to improve functionality, such as remembering login sessions. You can manage cookie preferences in your browser or device settings, but disabling cookies may impact app performance.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy to reflect changes in our practices or legal requirements. Updates will be communicated via email or in-app notifications. Continued use of the app after changes implies acceptance of the revised policy.
          </p>
        </div>
      </section>
    </main>
  );
};

// Delete Account Policy Page
const DeleteAccountPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="main-wrapper">
      <PageSEO 
        title="Delete Account Policy - Saadawa Data" 
        description="Learn how to request the deletion of your Saadawa Data account and personal data." 
      />
      <header className="page-header animate-fade-in">
        <h1>Delete Account Policy</h1>
        <p>Learn how to request the deletion of your Saadawa Data account and personal data.</p>
      </header>

      <section className="content-section animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <div className="policy-block">
          <span className="update-date">Last Updated: April 21, 2026</span>
          
          <h2 className="first">1. Introduction</h2>
          <p>
            At Saadawa Data, we respect your right to control your personal data. This Delete Account Policy outlines the process for requesting the deletion of your account and associated data from our Virtual Top-Up (VTU) application for airtime, data, and bill payments in Nigeria. As our app requires users to create an account and log in, we provide a clear mechanism for account deletion in compliance with the Nigeria Data Protection Regulation (NDPR).
          </p>

          <h2>2. Who Can Request Deletion</h2>
          <p>
            Only registered users aged 18 and older who have an active Saadawa Data account can request account deletion. We do not knowingly collect data from users under 18, and such accounts, if discovered, are terminated immediately.
          </p>

          <h2>3. How to Request Account Deletion</h2>
          <p>
            To delete your Saadawa Data account and all associated personal data, please follow these steps:
          </p>
          <ul>
            <li>Send an email to <strong>info@saadawa.com.ng</strong> or <strong>aliyufalalu10@gmail.com</strong>.</li>
            <li>Use the subject line: <strong>"I want to delete my data"</strong>.</li>
            <li>Include the following information in your email:
              <ul>
                <li>Full Name (as registered in the app)</li>
                <li>Phone Number (associated with your account)</li>
                <li>Email Address (associated with your account)</li>
              </ul>
            </li>
            <li>Submit the email from the email address linked to your Saadawa Data account.</li>
          </ul>
          <p>We may contact you to verify your identity to ensure the request is legitimate.</p>

          <h2>4. What Data Will Be Deleted</h2>
          <p>
            Upon successful verification, we will delete all personal data associated with your account, including:
          </p>
          <ul>
            <li><strong>Account Information:</strong> Name, phone number, email address, and password.</li>
            <li><strong>Transaction Data:</strong> Records of airtime top-ups, data purchases, and bill payments.</li>
            <li><strong>Device Information:</strong> Device type, operating system, IP address, and unique identifiers.</li>
            <li><strong>Usage Data:</strong> Information on how you interacted with the app.</li>
          </ul>
          <p>
            Note: Certain data may be retained if required by law (e.g., transaction records for tax or audit purposes), but it will be anonymized to prevent identification.
          </p>

          <h2>5. Processing Time</h2>
          <p>
            We will process your deletion request within 2 days of receiving and verifying your email. You will receive a confirmation email once your account and data have been deleted. If we are unable to verify your identity, we will notify you to provide additional information.
          </p>

          <h2>6. Data Security</h2>
          <p>
            Your data is protected with industry-standard encryption and security measures during the deletion process. We do not share, sell, or disclose your data to third parties, except as required by law (e.g., court orders).
          </p>

          <h2>7. Impact of Deletion</h2>
          <p>Once your account is deleted:</p>
          <ul>
            <li>You will lose access to the Saadawa Data app and its services.</li>
            <li>All transaction history and preferences will be removed (except legally required data).</li>
            <li>You will need to create a new account to use Saadawa Data again in the future.</li>
          </ul>

          <h2>8. Your Rights</h2>
          <p>Under the NDPR, you have the right to:</p>
          <ul>
            <li>Request deletion of your personal data.</li>
            <li>Access or correct your data before deletion.</li>
            <li>Lodge a complaint with the National Information Technology Development Agency (NITDA).</li>
          </ul>
          <p>Contact us at info@saadawa.com.ng or aliyufalalu10@gmail.com to exercise these rights.</p>

          <h2>9. Contact Us</h2>
          <p>For questions or assistance with account deletion, please contact us at info@saadawa.com.ng or aliyufalalu10@gmail.com.</p>
        </div>
      </section>
    </main>
  );
};

// Main App Component with Routing
function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<PrivacyPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/delete-account-policy" element={<DeleteAccountPolicy />} />
        <Route path="*" element={<PrivacyPolicy />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
