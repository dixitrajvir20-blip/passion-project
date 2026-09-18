export interface Source {
  title: string;
  url: string;
}

export interface Stat {
  figure: string;
  label: string;
  source: Source;
}

export type TrackSlug = 'money-basics' | 'start-something' | 'how-business-works';

export interface Track {
  slug: TrackSlug;
  title: string;
  summary: string;
  /**
   * Titles still to be written, shown as plain text. Published lessons are NOT listed here:
   * they come from the content collection (src/content/lessons), so a title lives in one place.
   */
  planned: string[];
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

export interface BudgetRow {
  name: string;
  amount: string;
  category: 'needs' | 'wants' | 'savings';
}

/** Opening numbers for each calculator. Examples to be replaced, never predictions. */
export interface ToolDefaults {
  budget: { income: string; incomeHint: string; rows: BudgetRow[] };
  savings: { start: string; monthly: string; rate: string; years: string };
  sideHustle: { units: string; price: string; cost: string; fee: string; hours: string; unitName: string; scenario: string };
  loan: { principal: string; rate: string; months: string; scenario: string };
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
  tools: ToolDefaults;
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
        label: 'lost to UPI fraud across 10.64 lakh incidents between April and November 2025',
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
        slug: 'money-basics',
        title: 'Money basics',
        summary: 'What to do with money once you have some, and how to keep it.',
        planned: [
          'Your first offer letter: CTC vs in-hand',
          'Loan apps: how to tell a real one from a trap',
          'Compound growth on ₹500 a month',
        ],
      },
      {
        slug: 'start-something',
        title: 'Start something',
        summary: 'Turning an idea into something real, starting with almost nothing.',
        planned: [
          'Test an idea in a weekend without spending',
          'Pricing when everyone around you is cheaper',
          'Break-even: how many cups before you profit?',
          'Selling on WhatsApp and Instagram',
        ],
      },
      {
        slug: 'how-business-works',
        title: 'How business works',
        summary: 'The machinery underneath the shops and stalls you already know.',
        planned: [
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
      fixedHint: 'What you pay every month whatever you sell: stall rent, licence, the cart loan instalment.',
      variableHint: 'What one cup costs you: tea, milk, sugar, gas, cup.',
      scenario: 'A chai stall, worked out in rupees.',
    },
    tools: {
      budget: {
        income: '8000',
        incomeHint: 'A stipend, tuition income, a first part-time wage, or pocket money.',
        rows: [
          { name: 'Travel to college or work', amount: '1200', category: 'needs' },
          { name: 'Phone and data', amount: '400', category: 'needs' },
          { name: 'Given at home', amount: '1500', category: 'needs' },
          { name: 'Food outside', amount: '1500', category: 'wants' },
          { name: 'Subscriptions', amount: '300', category: 'wants' },
          { name: 'Put aside', amount: '1600', category: 'savings' },
        ],
      },
      savings: { start: '0', monthly: '500', rate: '6', years: '10' },
      sideHustle: { units: '40', price: '250', cost: '110', fee: '5', hours: '30', unitName: 'orders', scenario: 'Reselling phone cases on Instagram and WhatsApp.' },
      loan: { principal: '50000', rate: '12', months: '24', scenario: 'A ₹50,000 loan for a second-hand scooter.' },
    },
    note: 'Indian market examples use prices at least 30 days old and never name a security with a target, following SEBI’s education-only rules (January 2025, updated May 2026). Nothing here is investment advice.',
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
        slug: 'money-basics',
        title: 'Money basics',
        summary: 'Building a cushion and keeping debt visible.',
        planned: [
          'Your first pay: what to do in the first week',
          'Building three months of cover, slowly',
          'Buy now, pay later: seeing the debt',
          'What inflation did to your savings',
        ],
      },
      {
        slug: 'start-something',
        title: 'Start something',
        summary: 'Selling into a single market made of 27 rulebooks.',
        planned: [
          'Test an idea without spending',
          'Pricing for customers in another country',
          'Break-even with platform fees included',
          'Registering as a small trader: what to ask',
        ],
      },
      {
        slug: 'how-business-works',
        title: 'How business works',
        summary: 'Where profit comes from, and which rights you already have.',
        planned: [
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
    tools: {
      budget: {
        income: '950',
        incomeHint: 'An apprentice wage, a student job, or a grant.',
        rows: [
          { name: 'Room or rent share', amount: '380', category: 'needs' },
          { name: 'Transport pass', amount: '49', category: 'needs' },
          { name: 'Phone', amount: '15', category: 'needs' },
          { name: 'Food', amount: '200', category: 'needs' },
          { name: 'Going out', amount: '120', category: 'wants' },
          { name: 'Subscriptions', amount: '20', category: 'wants' },
          { name: 'Buffer', amount: '100', category: 'savings' },
        ],
      },
      savings: { start: '0', monthly: '50', rate: '2.5', years: '10' },
      sideHustle: { units: '30', price: '18', cost: '6', fee: '10', hours: '25', unitName: 'orders', scenario: 'A small online shop selling across the EU.' },
      loan: { principal: '2000', rate: '8', months: '24', scenario: 'A €2,000 loan for a laptop.' },
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
        slug: 'money-basics',
        title: 'Money basics',
        summary: 'The decisions that shape the next ten years.',
        planned: [
          'Your first paycheck: reading the deductions',
          'How a credit score actually moves',
          'Student loans as a monthly payment',
          'Buy now, pay later: the real cost',
        ],
      },
      {
        slug: 'start-something',
        title: 'Start something',
        summary: 'Earning on your own terms without a surprise tax bill.',
        planned: [
          'Test an idea in a weekend',
          'Pricing your work, not your time',
          'Break-even after platform fees',
          'Setting money aside for self-employment tax',
        ],
      },
      {
        slug: 'how-business-works',
        title: 'How business works',
        summary: 'Where profit comes from and who takes a cut.',
        planned: [
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
    tools: {
      budget: {
        income: '1200',
        incomeHint: 'Take-home pay from a part-time job, after the deductions on the stub.',
        rows: [
          { name: 'Gas or transit', amount: '160', category: 'needs' },
          { name: 'Phone', amount: '45', category: 'needs' },
          { name: 'Food', amount: '250', category: 'needs' },
          { name: 'Eating out', amount: '150', category: 'wants' },
          { name: 'Subscriptions', amount: '30', category: 'wants' },
          { name: 'Savings', amount: '240', category: 'savings' },
        ],
      },
      savings: { start: '0', monthly: '50', rate: '4', years: '10' },
      sideHustle: { units: '25', price: '25', cost: '9', fee: '12', hours: '20', unitName: 'orders', scenario: 'A custom-print shop on a marketplace that takes a cut.' },
      loan: { principal: '10000', rate: '6.5', months: '120', scenario: 'A $10,000 student loan repaid over ten years.' },
    },
    note: 'Education only, with no recommendation of any named financial product. Tax questions point to the IRS, and anything set by state law says so.',
  },
];

export function getRegion(code: string): Region {
  const region = REGIONS.find((r) => r.code === code);
  if (!region) throw new Error(`Unknown region: ${code}`);
  return region;
}
