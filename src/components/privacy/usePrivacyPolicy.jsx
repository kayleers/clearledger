// Static Privacy Policy Data - No external fetching
const PRIVACY_POLICY_TEXT = {
  lastUpdated: 'Feb. 7, 2026',
  sections: [
    {
      title: 'Privacy Policy – ClearLedger',
      content: ''
    },
    {
      title: '',
      content: 'Last updated: Feb. 7, 2026.\n\nClearLedger ("the app") is operated by Khaos (doing business as Khaos KRServices), located in The Netherlands.\n\nClearLedger is a privacy-first, manual financial planning application that allows users to track bills, loans, credit cards, bank accounts, payment schedules, and financial scenarios across multiple currencies. The app does not connect to banks, financial institutions, or third-party financial data providers.\n\nWe are committed to protecting your privacy and being transparent about how your data is collected, used, stored, and processed.'
    },
    {
      title: 'Legal Basis for Processing',
      content: 'We process personal data in accordance with applicable data protection laws, including the General Data Protection Regulation (GDPR), based on:\n\nContractual necessity – to provide app functionality and services\nUser consent – when creating an account and using the app\nLegitimate interests – to maintain security, prevent abuse, and improve functionality\nLegal obligations – where required by applicable law'
    },
    {
      title: 'Data We Collect',
      content: 'Information you provide:\n\n• Email address (for account creation and authentication)\n• Name (if provided)\n• Financial data manually entered into the app, including:\n  - bills\n  - loans\n  - credit cards\n  - bank accounts\n  - balances\n  - payment schedules\n  - financial planning data\n• App preferences and settings\n\nInformation we do not collect:\n\n• Bank login credentials\n• Full credit card numbers\n• Financial institution access tokens\n• Government identifiers\n• Physical addresses\n• Location data\n• Contacts\n• Photos or files\n• Advertising identifiers\n• Device tracking identifiers\n• Behavioral tracking data\n• Cross-app or cross-site tracking data\n\nClearLedger does not connect to banks, credit bureaus, payment networks, or financial institutions.\nAll financial data is manually entered by the user.'
    },
    {
      title: 'How We Store and Process Data',
      content: 'Your data is securely stored using Base44 cloud infrastructure, which acts as a data processor on our behalf.\n\n• Base44 servers are located in the United States\n• Data is encrypted in transit and at rest using industry-standard security practices\n• Access is restricted to authorized systems and services only\n• Data is processed solely to provide app functionality\n\nWe do not sell user data. We do not share data for advertising. We do not monetize user data. We do not profile users for marketing purposes.'
    },
    {
      title: 'Third-Party Services',
      content: 'We use the following service providers to operate ClearLedger:\n\nBase44\n• Cloud hosting and data storage\n• Infrastructure services\n• Acts as a data processor\n\nGoogle Play Services\n• App distribution\n• Billing and payment processing\n• Subscription management\n• Purchase verification\n• Licensing and entitlement validation\n\nClearLedger does not receive or store your full payment card information. All payments are processed directly by Google Play Billing.'
    },
    {
      title: 'Payments and Subscriptions',
      content: 'ClearLedger offers optional paid plans through Google Play Billing, including:\n\n• Pro Monthly subscription\n• Pro Yearly subscription\n• Lifetime one-time purchase\n\nAll payments, subscriptions, refunds, and billing data are processed by Google Play. ClearLedger does not store payment card information.\n\nClearLedger only receives:\n• purchase confirmation\n• entitlement status\n• subscription state\n• access rights'
    },
    {
      title: 'Account System and Google Play Separation',
      content: 'Your ClearLedger app account is separate from your Google Play account.\n\n• App login credentials are independent of Google Play\n• Changing your email/password in the app does not affect Google Play\n• Google Play billing identity is managed solely by Google\n• Subscription access is determined by Google Play purchase status'
    },
    {
      title: 'International Data Transfers',
      content: 'Your data may be transferred to and stored on servers outside your country of residence, including in the United States.\n\nSuch transfers are protected by appropriate safeguards in accordance with GDPR, including contractual data protection agreements and standard contractual clauses.'
    },
    {
      title: 'Data Retention',
      content: 'We retain your data only as long as your account remains active or as necessary to provide services.\n\nWhen you delete your account:\n\n• Your user profile is deleted\n• Your financial data is deleted\n• Your stored records are deleted\n• Your app data is permanently removed\n\nData deletion occurs within 30 days, unless legal retention obligations apply.'
    },
    {
      title: 'Your Privacy Rights',
      content: 'Depending on your jurisdiction, you may have the right to:\n\n• Access your data\n• Correct your data\n• Delete your data\n• Export your data\n• Withdraw consent\n• Restrict processing\n• Object to processing\n• Data portability\n\nYou may exercise these rights within the app or by contacting:\n\nkhaoskrservices@gmail.com\n\nIf you are located in the EU, you may also file a complaint with your local data protection authority.'
    },
    {
      title: 'Ads and Tracking',
      content: 'ClearLedger:\n\n• Does not display ads\n• Does not use advertising SDKs\n• Does not track users across apps or websites\n• Does not use behavioral tracking\n• Does not use third-party analytics for profiling\n• Does not sell or monetize user data'
    },
    {
      title: 'Security',
      content: 'We implement appropriate technical and organizational security measures, including:\n\n• Encryption\n• Secure cloud infrastructure\n• Access controls\n• Authentication safeguards\n• Secure session handling\n\nWhile we take strong precautions, no system can guarantee absolute security.'
    },
    {
      title: "Children's Privacy",
      content: 'ClearLedger is not intended for children under:\n\n• 13 years old (globally)\n• 16 years old (European Union)\n\nWe do not knowingly collect data from children. If we become aware of such data, it will be deleted promptly.'
    },
    {
      title: 'Changes to This Policy',
      content: 'This privacy policy may be updated periodically. Updates will be reflected with a revised date.'
    },
    {
      title: 'Contact Information',
      content: 'Operator: Khaos (doing business as Khaos KRServices)\nCountry: The Netherlands\nSupport Email: khaoskrservices@gmail.com'
    }
  ]
};

export const usePrivacyPolicy = () => {
  return {
    sections: PRIVACY_POLICY_TEXT.sections,
    lastUpdated: PRIVACY_POLICY_TEXT.lastUpdated
  };
};