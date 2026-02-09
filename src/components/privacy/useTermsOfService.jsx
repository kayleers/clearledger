// Static Terms of Service Data
const TERMS_OF_SERVICE_TEXT = {
  lastUpdated: 'Feb. 7, 2026',
  sections: [
    {
      title: '📜 Terms of Service – ClearLedger',
      content: ''
    },
    {
      title: '',
      content: 'Last updated: Feb. 7, 2026\n\nThese Terms of Service ("Terms") govern your access to and use of the ClearLedger application ("ClearLedger", "the app", "we", "us", "our"), operated by Khaos (doing business as Khaos KRServices), located in The Netherlands.\n\nBy creating an account, accessing, or using ClearLedger, you agree to be bound by these Terms. If you do not agree, you may not use the app.'
    },
    {
      title: 'Eligibility',
      content: 'You must be at least:\n\n• 13 years old globally, or\n• 16 years old in the European Union\n\nto use ClearLedger. By using the app, you confirm that you meet these requirements.'
    },
    {
      title: 'Account Registration and Responsibility',
      content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.\n\nYou agree to provide accurate and current information and to keep your account information up to date.\n\nYou are responsible for all data entered into the app.'
    },
    {
      title: 'Nature of the Service',
      content: 'ClearLedger is a manual financial planning tool. It allows users to enter and manage financial information such as:\n\n• bills\n• loans\n• credit cards\n• bank accounts\n• balances\n• payment schedules\n• financial planning scenarios\n• simulations\n• currency conversions\n\nClearLedger:\n\n• does not connect to banks\n• does not connect to financial institutions\n• does not sync transactions\n• does not retrieve real-time financial data\n• does not access payment networks\n• does not access credit bureaus\n\nAll financial data is manually entered by the user.'
    },
    {
      title: 'No Financial Advice Disclaimer',
      content: 'ClearLedger is not a financial advisor, not a bank, not a lender, and not a financial institution.\n\nThe app provides planning tools, simulations, and organizational features only.\n\nNothing in the app constitutes:\n\n• financial advice\n• investment advice\n• tax advice\n• legal advice\n• credit advice\n• accounting advice\n\nAll decisions based on the app\'s information are made at your own risk. You are solely responsible for your financial decisions.'
    },
    {
      title: 'Accuracy Disclaimer',
      content: 'ClearLedger does not guarantee the accuracy, completeness, or reliability of any data, calculations, projections, simulations, or outputs.\n\nResults are dependent on user-provided data and assumptions.\n\nSimulations and projections are hypothetical and may not reflect real-world outcomes.'
    },
    {
      title: 'Free and Paid Plans',
      content: 'ClearLedger offers:\n\n• a Free tier (with usage limits)\n• Pro Monthly subscription\n• Pro Yearly subscription\n• Lifetime one-time purchase\n\nFeature access and limits are determined by your plan.'
    },
    {
      title: 'Payments and Billing',
      content: 'All payments, subscriptions, refunds, and billing are processed exclusively through Google Play Billing.\n\nClearLedger does not process or store payment card information.\n\nGoogle Play controls:\n\n• billing\n• refunds\n• payment methods\n• subscription management\n• cancellations\n• chargebacks'
    },
    {
      title: 'Account and Google Play Separation',
      content: 'Your ClearLedger account is separate from your Google Play account.\n\n• App login credentials are independent of Google Play\n• Google Play billing identity is managed by Google\n• Subscription access is determined by Google Play purchase status'
    },
    {
      title: 'Acceptable Use',
      content: 'You agree not to:\n\n• misuse the app\n• attempt unauthorized access\n• bypass security systems\n• manipulate subscription systems\n• exploit vulnerabilities\n• reverse engineer the app\n• interfere with services\n• abuse system resources\n• use the app for unlawful purposes'
    },
    {
      title: 'Data Export',
      content: 'ClearLedger provides data export functionality.\n\nYou are responsible for:\n\n• how exported data is stored\n• where it is shared\n• how it is protected after export\n• compliance with laws applicable to exported data'
    },
    {
      title: 'Service Availability',
      content: 'We do not guarantee uninterrupted or error-free operation.\n\nClearLedger may be unavailable due to:\n\n• maintenance\n• updates\n• technical issues\n• infrastructure failures\n• third-party service outages'
    },
    {
      title: 'Termination',
      content: 'We reserve the right to suspend or terminate accounts that violate these Terms, misuse the service, or create risk to the platform or other users.\n\nUsers may delete their account at any time through the app.'
    },
    {
      title: 'Intellectual Property',
      content: 'ClearLedger, its design, code, branding, and content are the intellectual property of Khaos (Khaos KRServices).\n\nYou may not copy, distribute, modify, or create derivative works without permission.'
    },
    {
      title: 'Limitation of Liability',
      content: 'To the maximum extent permitted by law:\n\nClearLedger and Khaos (Khaos KRServices) shall not be liable for:\n\n• financial losses\n• indirect damages\n• incidental damages\n• consequential damages\n• loss of data\n• loss of profits\n• business interruption\n• decision-making outcomes\n• simulation inaccuracies\n• data entry errors\n• third-party service failures\n\nYour use of the app is at your own risk.'
    },
    {
      title: 'Indemnification',
      content: 'You agree to indemnify and hold harmless Khaos (Khaos KRServices) from claims arising from:\n\n• misuse of the app\n• violation of these Terms\n• violation of laws\n• misuse of data\n• misuse of exports\n• third-party claims'
    },
    {
      title: 'Privacy',
      content: 'Your use of ClearLedger is also governed by the Privacy Policy, which forms part of these Terms.'
    },
    {
      title: 'Changes to These Terms',
      content: 'We may update these Terms from time to time.\n\nContinued use of the app after changes constitutes acceptance of the updated Terms.'
    },
    {
      title: 'Governing Law',
      content: 'These Terms are governed by the laws of The Netherlands, without regard to conflict-of-law principles.'
    },
    {
      title: 'Contact Information',
      content: 'Operator: Khaos (doing business as Khaos KRServices)\nCountry: The Netherlands\nSupport Email: khaoskrservices@gmail.com'
    }
  ]
};

export const useTermsOfService = () => {
  return {
    sections: TERMS_OF_SERVICE_TEXT.sections,
    lastUpdated: TERMS_OF_SERVICE_TEXT.lastUpdated
  };
};