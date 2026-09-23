export interface Source {
  title: string;
  url: string;
}

export interface Stat {
  figure: string;
  label: string;
  source: Source;
}

export type TrackSlug = 'money-basics' | 'start-something' | 'how-business-works' | 'credit-and-fraud' | 'protect-your-money';

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
  budget: { income: string; incomeHint: string; rows: BudgetRow[]; scenario: string };
  savings: { start: string; monthly: string; rate: string; years: string; scenario: string };
  sideHustle: { units: string; price: string; cost: string; fee: string; hours: string; unitName: string; scenario: string };
  loan: { principal: string; rate: string; months: string; scenario: string };
}

export interface Region {
  code: string;
  name: string;
  tab: string;
  locale: string;
  currency: string;
  /** The edition front's headline: what this edition is about, in its own terms. */
  headline: string;
  /** Three topics shown as tag pills on the front page's edition card. */
  tags: string[];
  /** The official route to report a scam, shown on the edition front. */
  report: { stamp: string; text: string; link?: { label: string; url: string } };
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
    headline: 'Your first salary: the payslip, the tax, the fund and the buffer.',
    tags: ['UPI', 'Scams', 'First job'],
    report: {
      stamp: '1930',
      text: 'Lost money to a scam? Call 1930, the national cybercrime helpline, or report it online, as fast as you can. The sooner it is reported, the better the chance of stopping the money.',
      link: { label: 'cybercrime.gov.in', url: 'https://cybercrime.gov.in' },
    },
    problem:
      'Most first earners in India meet a payslip, a loan app and a trading screen before anyone has shown them the arithmetic behind any of them, and the official figures record what that costs.',
    intro:
      'India built payment rails almost everyone can reach, and the knowledge to use them safely has not caught up. This edition is about keeping what you earn, spotting the patterns fraud uses, and working out whether a small business actually makes money.',
    stats: [
      {
        figure: '27%',
        label: 'of Indian adults were financially literate in NCFE’s 2019 national survey',
        source: {
          title: 'NCFE Financial Literacy and Inclusion Survey (2019)',
          url: 'https://ncfe.org.in/wp-content/uploads/2023/12/NISM_Final-Report-All-India.pdf',
        },
      },
      {
        figure: '₹805 crore',
        label: 'of UPI fraud reported across 10.64 lakh incidents, April to November 2025',
        source: {
          title: 'The420.in, reporting a Lok Sabha answer (15 Dec 2025)',
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
        title: 'Your first salary',
        summary: 'Reading the payslip, getting withheld tax back, moving the provident fund, and building a buffer.',
        planned: [],
      },
      {
        slug: 'protect-your-money',
        title: 'Protect your money',
        summary: 'The four ways young Indians lose money, ranked by the official figures, and the one action the rules reward in each case.',
        planned: [],
      },
      {
        slug: 'start-something',
        title: 'Start a service business',
        summary: 'Pricing, break-even, cash and the first regulated loan, worked on a coaching centre and a freelance service.',
        planned: [],
      },
    ],
    breakEven: {
      fixed: '18000',
      variable: '300',
      price: '1500',
      units: '25',
      unitName: 'students',
      fixedHint: 'What you pay every month whatever happens: the room, electricity, the whiteboard loan instalment.',
      variableHint: 'What one student costs you each month: printed notes, test papers, a share of the internet.',
      scenario: 'A weekend coaching class for board exams, worked out in rupees.',
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
        scenario: 'A first month of money with a job for every part of it.',
      },
      savings: { start: '0', monthly: '500', rate: '6', years: '10', scenario: 'A small amount, put aside every month.' },
      sideHustle: { units: '40', price: '250', cost: '110', fee: '5', hours: '30', unitName: 'orders', scenario: 'Reselling phone cases on Instagram and WhatsApp.' },
      loan: { principal: '50000', rate: '12', months: '24', scenario: 'A ₹50,000 loan for a second-hand scooter.' },
    },
    note: 'Following SEBI’s education-only rules (January 2025, updated May 2026): no advice on any named security, no price targets, no claims about returns, and any market price shown is at least 30 days old. Nothing here is investment advice.',
  },
  {
    code: 'eu',
    name: 'Europe',
    tab: 'Europe',
    locale: 'en-IE',
    currency: 'EUR',
    headline: 'Read the payslip, check the payee, count the instalments.',
    tags: ['Payslips', 'Buy now, pay later', 'Selling abroad'],
    report: {
      stamp: 'Act fast',
      text: 'Lost money to a scam? Call your bank straight away to try to stop the payment, then report it to the police in your country. The reporting route is national, so it differs from country to country.',
    },
    problem:
      'Half of EU adults could not cover three months of living costs, and payers themselves bore about 85% of the €2.2 billion lost to transfer fraud in 2024; the checks that prevent both are rarely taught before the first payslip arrives.',
    intro:
      'Europe has some of the strongest consumer protections anywhere and some of the lowest financial confidence. This edition is about building a buffer, seeing debt for what it is when it arrives dressed as convenience, and working across borders without guessing.',
    stats: [
      {
        figure: '18%',
        label: 'of EU adults had high financial literacy in 2023; younger adults tend to score lower than others',
        source: {
          title: 'European Commission, Financial Literacy Strategy for the EU, COM(2025) 681 (30 Sep 2025)',
          url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52025DC0681',
        },
      },
      {
        figure: '49%',
        label: 'of EU adults aged 18 to 65 lack savings to cover three months of living costs',
        source: {
          title: 'European Commission, Financial Literacy Strategy for the EU, COM(2025) 681 (30 Sep 2025)',
          url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52025DC0681',
        },
      },
      {
        figure: '27',
        label: 'countries in the EU, each setting its own business tax and registration rules',
        source: {
          title: 'European Union, Key facts and figures (europa.eu, 2026)',
          url: 'https://european-union.europa.eu/principles-countries-history/facts-and-figures-european-union_en',
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
        body: 'Poland, Sweden, Czechia, Hungary, Denmark and Romania are outside the eurozone. The calculators here work in euros; the ideas work in any currency.',
      },
    ],
    tracks: [
      {
        slug: 'money-basics',
        title: 'Your first pay and what it has to cover',
        summary: 'Read the payslip, size the buffer, cost the move, and see what interest and inflation do over time.',
        planned: [],
      },
      {
        slug: 'credit-and-fraud',
        title: 'Credit, payments and fraud',
        summary: 'Instalment plans, transfers, job offers and money advice: where the evidence says young Europeans lose money.',
        planned: [],
      },
      {
        slug: 'start-something',
        title: 'Run it like a business',
        summary: 'Read the numbers, price with fees and borders included, and declare what you earn.',
        planned: [],
      },
    ],
    breakEven: {
      fixed: '320',
      variable: '22',
      price: '55',
      units: '16',
      unitName: 'repairs',
      fixedHint: 'What you pay every month whatever happens: the workshop bay, insurance, the tool loan.',
      variableHint: 'What one repair costs you in parts and consumables.',
      scenario: 'A weekend bicycle-repair service in a rented workshop bay, worked out in euros.',
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
        scenario: 'A first month of money with a job for every part of it.',
      },
      savings: { start: '0', monthly: '50', rate: '2.5', years: '10', scenario: 'A small amount, put aside every month.' },
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
    headline: 'Student loans, credit and taxes arrive before anyone explains them.',
    tags: ['Credit scores', 'Student loans', 'Side hustles'],
    report: {
      stamp: 'FTC',
      text: 'Lost money to a scam? Contact your bank or payment app straight away, then report it to the Federal Trade Commission.',
      link: { label: 'reportfraud.ftc.gov', url: 'https://reportfraud.ftc.gov' },
    },
    problem:
      'A 17-year-old can sign a federal loan, open a credit card and earn untaxed side income before anyone shows them the monthly payment, the interest or the tax bill, and in 2026 Gen Z adults answered 38% of the P-Fin Index questions correctly.',
    intro:
      'In the US some of the biggest money decisions arrive early: student loans, a first credit card, side-hustle income that nobody taxes for you. This edition is about seeing what those decisions cost before you make them, and understanding the number that quietly decides a lot of your life.',
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
        label: 'more likely to be financially fragile, for US adults with very low versus very high financial literacy (2025)',
        source: {
          title: 'TIAA Institute-GFLEC Personal Finance Index 2025, press release (29 May 2025)',
          url: 'https://www.prnewswire.com/news-releases/national-financial-literacy-remains-stagnant-at-49-as-generational-gaps-widen-tiaa-institute-gflec-study-finds-811010090.html',
        },
      },
      {
        figure: '63%',
        label: 'of buy now, pay later borrowers at six big lenders had more than one loan running at once in 2022',
        source: {
          title: 'CFPB, Consumer Use of Buy Now, Pay Later and Other Unsecured Debt (13 Jan 2025)',
          url: 'https://www.consumerfinance.gov/archive/newsroom/cfpb-research-reveals-heavy-buy-now-pay-later-use-among-borrowers-with-high-credit-balances-and-multiple-pay-in-four-loans/',
        },
      },
    ],
    problems: [
      {
        title: 'Student loans signed at 17',
        body: 'Often agreed before a first full-time job, and rarely explained as what it really is: a monthly payment that can last ten years or more.',
      },
      {
        title: 'The credit score nobody teaches',
        body: 'A number that decides apartments, car loans and sometimes hiring. It runs on rules you can learn in an afternoon and almost nobody is taught.',
      },
      {
        title: 'Buy now, pay later, stacked',
        body: 'Pay-in-four plans are loans, and they stack: most borrowers at the big lenders had more than one running at the same time in 2022.',
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
        summary: 'The first year of earning: the paycheck, the cushion, the credit file and the loan, each as a number you can check.',
        planned: [],
      },
      {
        slug: 'start-something',
        title: 'Working for yourself',
        summary: 'Price a job, find break-even, read a month’s income statement and set tax aside.',
        planned: [],
      },
      {
        slug: 'how-business-works',
        title: 'Who gets paid, and by whom',
        summary: 'The business model behind four things sold to you: a platform, a pay-in-four plan, a promoted tip and a job that is really a scam.',
        planned: [],
      },
    ],
    breakEven: {
      fixed: '900',
      variable: '7.5',
      price: '18',
      units: '120',
      unitName: 'shirts',
      fixedHint: 'What you pay every month whatever you sell: the heat press loan, software, storage.',
      variableHint: 'What one shirt costs you: the blank, the ink, the packaging.',
      scenario: 'A custom apparel business printing shirts for school clubs and local teams, worked out in dollars.',
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
        scenario: 'A first month of money with a job for every part of it.',
      },
      savings: { start: '0', monthly: '50', rate: '4', years: '10', scenario: 'A small amount, put aside every month.' },
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
