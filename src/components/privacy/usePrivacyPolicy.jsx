// Static Privacy Policy Data - No external fetching
const PRIVACY_POLICY_TEXT = {
  lastUpdated: 'April 4, 2026',
  sections: [
    {
      title: 'Privacy Policy – Debt Payoff Simulator',
      content: ''
    },
    {
      title: '',
      content: 'Last updated: April 4, 2026.\n\nDebt Payoff Simulator ("the app") is operated by Khaos (doing business as Khaos KRServices), located in The Netherlands.\n\nDebt Payoff Simulator is a free, privacy-first financial planning application that allows users to simulate debt payoff scenarios, including credit cards and loans, across multiple currencies. The app does not connect to banks, financial institutions, or any third-party financial data providers.\n\nWe are committed to protecting your privacy and being transparent about how your data is collected, used, stored, and processed.'
    },
    {
      title: 'Legal Basis for Processing',
      content: 'We process personal data in accordance with applicable data protection laws, including the General Data Protection Regulation (GDPR), based on:\n\nContractual necessity – to provide app functionality and services\nUser consent – when creating an account and using the app\nLegitimate interests – to maintain security, prevent abuse, and improve functionality\nLegal obligations – where required by applicable law'
    },
    {
      title: 'Data We Collect',
      content: 'Information you provide:\n\n• Email address (for account creation and authentication)\n• Name (if provided)\n• Financial data manually entered into the app, including:\n  - debt names and balances\n  - interest rates (APR)\n  - minimum payments\n  - payment scenarios and simulations\n• App preferences and settings\n\nInformation we do not collect:\n\n• Bank login credentials\n• Full credit card numbers\n• Financial institution access tokens\n• Government identifiers\n• Physical addresses\n• Location data\n• Contacts\n• Photos or files\n• Advertising identifiers\n• Device tracking identifiers\n• Behavioral tracking data\n• Cross-app or cross-site tracking data\n\nDebt Payoff Simulator does not connect to banks, credit bureaus, payment networks, or financial institutions. All financial data is manually entered by the user.'
    },
    {
      title: 'How We Store and Process Data',
      content: 'Your data is securely stored using Base44 cloud infrastructure, which acts as a data processor on our behalf.\n\n• Base44 servers are located in the United States\n• Data is encrypted in transit and at rest using industry-standard security practices\n• Access is restricted to authorized systems and services only\n• Data is processed solely to provide app functionality\n\nWe do not sell user data. We do not share data for advertising. We do not monetize user data. We do not profile users for marketing purposes.'
    },
    {
      title: 'Third-Party Services',
      content: 'We use the following service providers to operate Debt Payoff Simulator:\n\nBase44\n• Cloud hosting and data storage\n• Infrastructure services\n• Acts as a data processor\n\nGoogle Play Services\n• App distribution (Android)\n• Licensing and app verification\n\nDebt Payoff Simulator does not use any advertising SDKs, analytics services that profile users, or payment processors. The app is free with no in-app purchases.'
    },
    {
      title: 'Payments and Subscriptions',
      content: 'Debt Payoff Simulator is a free app.\n\n• There are no in-app purchases\n• There are no subscriptions\n• There are no paid features\n• No payment data is collected or processed\n\nWe do not collect, store, or process any payment or billing information.'
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
      content: 'Debt Payoff Simulator:\n\n• Does not display ads\n• Does not use advertising SDKs\n• Does not track users across apps or websites\n• Does not use behavioral tracking\n• Does not use third-party analytics for profiling\n• Does not sell or monetize user data'
    },
    {
      title: 'Security',
      content: 'We implement appropriate technical and organizational security measures, including:\n\n• Encryption\n• Secure cloud infrastructure\n• Access controls\n• Authentication safeguards\n• Secure session handling\n\nWhile we take strong precautions, no system can guarantee absolute security.'
    },
    {
      title: "Children's Privacy",
      content: 'Debt Payoff Simulator is not intended for children under:\n\n• 13 years old (globally)\n• 16 years old (European Union)\n\nWe do not knowingly collect data from children. If we become aware of such data, it will be deleted promptly.'
    },
    {
      title: 'Changes to This Policy',
      content: 'This privacy policy may be updated periodically. Updates will be reflected with a revised date. Continued use of the app after changes constitutes acceptance of the updated policy.'
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