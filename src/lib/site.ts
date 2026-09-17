/**
 * Site-wide configuration. Anything legal or brand-facing that appears on more than
 * one page lives here, so a change happens once.
 */

export const site = {
  name: 'LaunchPad',
  tagline: 'Learn how money actually works.',
  description:
    'A free learning hub where anyone aged 15 to 21 can learn how money and business work, then practise with calculators. Editions for India, Europe and the United States.',
  url: 'https://dixitrajvir20-blip.github.io/passion-project',
  owner: 'Rajvir Dixit',
  ownerLocation: 'New York, United States',
  /** Replace with a real mailbox before launch. Used on Privacy, Terms, Accessibility. */
  contactEmail: 'hello@launchpad-project.example',
  repo: 'https://github.com/dixitrajvir20-blip/passion-project',
  /**
   * Who owns what (docs/PROJECT_BRIEF.md §12). Lessons and other text are shared so teachers and
   * clubs can reuse them with credit; the code is open source. The name and logo are neither.
   */
  contentLicence: {
    name: 'CC BY-NC-SA 4.0',
    fullName: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
  codeLicence: { name: 'MIT' },
  /** Dates shown on the legal pages. Bump when the text changes. */
  legalUpdated: '17 September 2026',
  /** Accounts stay off until the backend, the legal review and the parent-consent flow exist. */
  accountsEnabled: import.meta.env.PUBLIC_ACCOUNTS_ENABLED === 'true',
  /** Cookieless analytics stay off until documented on the privacy page. */
  analyticsEnabled: import.meta.env.PUBLIC_ANALYTICS_ENABLED === 'true',
  /** Third-party embeds (YouTube etc.) load only behind a click and only with consent. */
  embedsEnabled: import.meta.env.PUBLIC_EMBEDS_ENABLED === 'true',
};

/**
 * Optional storage categories that need a choice from the reader. Necessary storage
 * (edition, currency, progress, the consent record itself) never appears here.
 * When this list is empty the consent banner never shows; the Privacy choices dialog
 * still works from the footer so people can see what is stored.
 */
/**
 * Build-time guard. The sign-in island only has the preview provider (it stores nothing and
 * sends nothing), so switching accounts on without a live backend would show minors a working-
 * looking form that silently does nothing, including "we've emailed your parent". Fail the
 * build instead. Wire a live AuthProvider and set PUBLIC_AUTH_ORIGIN before flipping the flag;
 * see docs/AUTH_AND_ACCOUNTS.md, "What has to be true before flipping".
 */
if (site.accountsEnabled && !import.meta.env.PUBLIC_AUTH_ORIGIN) {
  throw new Error(
    'PUBLIC_ACCOUNTS_ENABLED=true but PUBLIC_AUTH_ORIGIN is not set: no live AuthProvider is wired. See docs/AUTH_AND_ACCOUNTS.md.',
  );
}

export const consentCategories = [
  {
    id: 'analytics' as const,
    label: 'Usage statistics',
    description:
      'Anonymous counts of which pages and calculators are used, with no cookies and no profile. Off until the privacy page says otherwise.',
    active: site.analyticsEnabled,
  },
  {
    id: 'embeds' as const,
    label: 'Videos from other sites',
    description:
      'Lets embedded videos load from YouTube when you tap them. YouTube may set its own cookies once a video plays.',
    active: site.embedsEnabled,
  },
];

export const CONSENT_VERSION = 1;
