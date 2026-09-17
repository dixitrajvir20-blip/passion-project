export interface Source {
  title: string;
  url: string;
}

export interface Stat {
  figure: string;
  label: string;
  source: Source;
}

export interface Track {
  title: string;
  summary: string;
  lessons: string[];
}

export interface ToolScenario {
  fixed: string;
  variable: string;
  price: string;
  units: string;
  unitName: string;
  fixedHint: string;
  variableHint: string;
  scenario: string;
}

export interface Region {
  code: string;
  name: string;
  tab: string;
  locale: string;
  currency: string;
  /** One sentence naming the gap this edition exists to close. */
  problem: string;
  intro: string;
  stats: Stat[];
  problems: { title: string; body: string }[];
  tracks: Track[];
  breakEven: ToolScenario;
  note: string;
}

export const REGIONS: Region[] = [
  {
    code: 'in',
    name: 'India',
    tab: 'India',
    locale: 'en-IN',
    currency: 'INR',
    problem:
      'Digital payments arrived faster than the knowledge needed to use them safely.',
    intro:
      'India built payment rails almost everyone can reach, and the knowledge to use them safely has not caught up. This edition is about keeping what you earn, spotting the patterns fraud uses, and working out whether a small business actually makes money.',
    stats: [
      {
        figure: '27%',
        label: 'of Indian adults are financially literate, against about 52% in advanced economies',
        source: {
          title: 'NCFE Financial Literacy and Inclusion Survey',
          url: 'https://ncfe.org.in/wp-content/uploads/2023/12/NISM_Final-Report-All-India.pdf',
        },
      },
      {
        figure: '68.3%',
        label: 'of digital fraud victims are graduates or postgraduates — education is not the protection people assume',
        source: {
          title: 'Exploratio Journal, analysis of UPI scams',
          url: 'https://exploratiojournal.com/exploring-how-indias-digital-payment-revolution-created-a-new-class-of-fraud-victims-an-analysis-of-upi-scams/',
        },
      },
      {
        figure: '₹805 crore',
        label: 'lost to UPI fraud across 10.64 lakh incidents in the year to November',
        source: {
          title: 'Government figures reported to Parliament',
          url: 'https://the420.in/india-upi-fraud-data-fy26-parliament-digital-payments/',
        },
      },
    ],
    problems: [
      {
        title: 'Fraud on the rails everyone uses',
        body: 'Phishing links, counterfeit QR codes, screen-sharing apps and SIM swaps. Taught as patterns you can recognise in the moment, not as a list of things to be afraid of.',
      },
      {
        title: 'Lending apps that are not lenders',
        body: 'Apps operating without RBI authorisation that harvest your contacts and use them against you. They find people at their most stretched, which is exactly when judgement is worst.',
      },
      {
        title: 'Fake job and part-time income offers',
        body: 'Aimed at students specifically, usually asking for a payment before any work exists.',
      },
      {
        title: 'Shared and borrowed devices',
        body: 'Plenty of people reach the internet on a phone that is not only theirs. Nothing here assumes a private device or a saved login.',
      },
    ],
    tracks: [
      {
        title: 'Money basics',
        summary: 'What to do with money once you have some, and how to keep it.',
        lessons: [
          'Your first earnings: where they should go',
          'Spotting a UPI scam before you tap',
          'Loan apps: how to tell a real one from a trap',
          'Compound growth on ₹500 a month',
        ],
      },
      {
        title: 'Start something',
        summary: 'Turning an idea into something real, starting with almost nothing.',
        lessons: [
          'Test an idea in a weekend without spending',
          'Pricing when everyone around you is cheaper',
          'Break-even: how many cups before you profit?',
          'Selling on WhatsApp and Instagram',
        ],
      },
      {
        title: 'How business works',
        summary: 'The machinery underneath the shops and stalls you already know.',
        lessons: [
          'How a chai stall makes money',
          'Where the money actually goes in a kirana store',
          'Supply and demand at your local market',
          'Government schemes you may already qualify for',
        ],
      },
    ],
    breakEven: {
      fixed: '2000',
      variable: '8',
      price: '15',
      units: '400',
      unitName: 'cups',
      fixedHint: 'What you pay every month whatever you sell: stall rent, licence, gas cylinder.',
      variableHint: 'What one cup costs you: tea, milk, sugar, cup.',
      scenario: 'A chai stall, worked out in rupees.',
    },
    note: 'Indian market examples use data at least three months old, following SEBI’s January 2025 rules on educational material. Nothing here is investment advice.',
  },
  {
    code: 'eu',
    name: 'Europe',
    tab: 'Europe',
    locale: 'de-DE',
    currency: 'EUR',
    problem:
      'Strong consumer protections, low financial confidence, and rules that change at every border.',
    intro:
      'Europe has some of the strongest consumer protections anywhere and some of the lowest financial confidence. This edition is about building a buffer, seeing debt for what it is when it arrives dressed as convenience, and working across borders without guessing.',
    stats: [
      {
        figure: '18%',
        label: 'of EU citizens score high on financial literacy; young people score among the lowest',
        source: {
          title: 'Flash Eurobarometer 525',
          url: 'https://europa.eu/eurobarometer/surveys/detail/2953',
        },
      },
      {
        figure: '49%',
        label: 'of Europeans could not cover three months of expenses from savings',
        source: {
          title: 'European Commission, Financial Literacy Strategy',
          url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:52025DC0681',
        },
      },
      {
        figure: '27',
        label: 'member states, each with its own tax and registration rules, in one single market',
        source: {
          title: 'European Commission, Financial Literacy Strategy',
          url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:52025DC0681',
        },
      },
    ],
    problems: [
      {
        title: 'No buffer when something breaks',
        body: 'Half of Europeans cannot cover three months. An emergency fund is not a wealth strategy — it is the thing that stops one bad month becoming a bad year.',
      },
      {
        title: 'Buy now, pay later is a loan',
        body: 'Four instalments at checkout is borrowing, however it is presented. Rules are tightening under the second Consumer Credit Directive, but a purchase made today still needs to be seen clearly.',
      },
      {
        title: 'Crossing a border changes the rules',
        body: 'Studying, working or selling in another member state can change your tax residency and your invoicing. Lessons explain the shape and send you to your own national authority for the answer.',
      },
      {
        title: 'The euro is not everyone’s money',
        body: 'Poland, Sweden, Czechia, Hungary, Denmark and Romania are outside the eurozone, so you can switch the currency on every calculator here.',
      },
    ],
    tracks: [
      {
        title: 'Money basics',
        summary: 'Building a cushion and keeping debt visible.',
        lessons: [
          'Your first pay: what to do in the first week',
          'Building three months of cover, slowly',
          'Buy now, pay later: seeing the debt',
          'What inflation did to your savings',
        ],
      },
      {
        title: 'Start something',
        summary: 'Selling into a single market made of 27 rulebooks.',
        lessons: [
          'Test an idea without spending',
          'Pricing for customers in another country',
          'Break-even with platform fees included',
          'Registering as a small trader: what to ask',
        ],
      },
      {
        title: 'How business works',
        summary: 'Where profit comes from, and which rights you already have.',
        lessons: [
          'Reading a simple income statement',
          'Consumer rights you can actually use',
          'Supply and demand around you',
          'How startups raise money in Europe',
        ],
      },
    ],
    breakEven: {
      fixed: '150',
      variable: '6',
      price: '18',
      units: '120',
      unitName: 'orders',
      fixedHint: 'What you pay every month whatever you sell: shop subscription, tools, storage.',
      variableHint: 'What one order costs you: materials, packaging, postage.',
      scenario: 'A small online shop selling across the EU.',
    },
    note: 'Tax and registration rules differ in every member state. This edition explains the principle and points to your national authority rather than guessing which of 27 answers applies to you.',
  },
  {
    code: 'us',
    name: 'United States',
    tab: 'United States',
    locale: 'en-US',
    currency: 'USD',
    problem:
      'Large, permanent debt decisions are made at 17, before anyone explains how debt works.',
    intro:
      'In the US the biggest financial decisions arrive early — student loans, credit, a first job with untaxed income. This edition is about seeing what those decisions cost before you make them, and understanding the number that quietly decides a lot of your life.',
    stats: [
      {
        figure: '38%',
        label: 'is Gen Z’s score on the P-Fin financial literacy index, the lowest of any generation',
        source: {
          title: 'TIAA Institute-GFLEC Personal Finance Index 2025',
          url: 'https://www.tiaa.org/public/institute/about/news/2025-tiaa-institute-gflec-personal-finance-index',
        },
      },
      {
        figure: '3×',
        label: 'more likely to be financially fragile if your financial literacy is very low',
        source: {
          title: 'TIAA Institute-GFLEC, P-Fin Index 2025',
          url: 'https://gflec.org/wp-content/uploads/2025/05/TIAA-Institute-and-GFLEC_Financial-literacy-and-retirement-fluency-in-America_P-Fin-2025.pdf',
        },
      },
      {
        figure: '61%',
        label: 'of buy-now-pay-later users have subprime or deep subprime credit scores',
        source: {
          title: 'CFPB, Consumer Use of Buy Now, Pay Later',
          url: 'https://files.consumerfinance.gov/f/documents/cfpb_BNPL_Report_2025_01.pdf',
        },
      },
    ],
    problems: [
      {
        title: 'Student loans signed at 17',
        body: 'The largest debt most Americans ever take on, agreed before most people have had a full-time job, and rarely explained as a monthly payment lasting a decade.',
      },
      {
        title: 'The credit score nobody teaches',
        body: 'A number that decides apartments, car loans and sometimes hiring. It runs on rules you can learn in an afternoon and almost nobody is taught.',
      },
      {
        title: 'Buy now, pay later, stacked',
        body: 'Most users hold several at once. Regular users carry noticeably more credit-card debt than similar people who do not use it at all.',
      },
      {
        title: 'Self-employment tax arrives late',
        body: 'Money from a side hustle or gig work shows up untaxed. The bill comes later, and it surprises people who spent it.',
      },
    ],
    tracks: [
      {
        title: 'Money basics',
        summary: 'The decisions that shape the next ten years.',
        lessons: [
          'Your first paycheck: reading the deductions',
          'How a credit score actually moves',
          'Student loans as a monthly payment',
          'Buy now, pay later: the real cost',
        ],
      },
      {
        title: 'Start something',
        summary: 'Earning on your own terms without a surprise tax bill.',
        lessons: [
          'Test an idea in a weekend',
          'Pricing your work, not your time',
          'Break-even after platform fees',
          'Setting money aside for self-employment tax',
        ],
      },
      {
        title: 'How business works',
        summary: 'Where profit comes from and who takes a cut.',
        lessons: [
          'Reading a simple income statement',
          'What a platform’s fees really cost you',
          'Supply and demand around you',
          'How startups raise money',
        ],
      },
    ],
    breakEven: {
      fixed: '90',
      variable: '9',
      price: '25',
      units: '100',
      unitName: 'orders',
      fixedHint: 'What you pay every month whatever you sell: shop fees, software, storage.',
      variableHint: 'What one order costs you: blank product, printing, shipping.',
      scenario: 'A custom-print side hustle, after platform fees.',
    },
    note: 'Education only, with no recommendation of any named financial product. Tax questions point to the IRS, and anything set by state law says so.',
  },
];

export function getRegion(code: string): Region {
  const region = REGIONS.find((r) => r.code === code);
  if (!region) throw new Error(`Unknown region: ${code}`);
  return region;
}
