# Compliance brief: free, non-commercial money/business education site (ages 15–21; India/EU/US, UK possible) — 17 Sep 2026

Not legal advice. Citations [S#] → list at the end.

## 0. Corrections and 2025–26 developments that change the premise
1. **SEBI's "three-month" price-data rule is gone.** Circular of 29 Jan 2025 was **updated 8 May 2026**: an "education-only" person must not use **market price data of the preceding thirty days** (was three months) to name/display a security in a way "indicating the future price, advice or recommendation". Two prohibited activities: (i) advice/recommendation on securities without SEBI registration; (ii) claims of returns/performance. [S35]
2. **UK cookie law changed on 5 Feb 2026** (Data (Use and Access) Act 2025): PECR now allows, without consent, storage/access for **statistical purposes**, **appearance/preference**, security, and emergency-geolocation — with clear information and a free, simple opt-out; PECR fines now up to £17.5m/4%. ICO's storage-and-access guidance finalised 29 Apr 2026. [S9][S10]
3. **COPPA amended rule**: effective 23 Jun 2025, compliance deadline 22 Apr 2026. [S20]
4. **DPDP Rules 2025** notified 13 Nov 2025; substantive duties (notice, consent, children, breach) apply 18 months later — **13/14 May 2027**. [S16][S18][S19]
5. **NetChoice v. Bonta (9th Cir., 12 Mar 2026)**: CAADCA's DPIA, dark-pattern and profiling provisions remain enjoined; age-estimation, high-privacy defaults, disclosures provisions no longer enjoined (remanded). Applies only to CCPA "businesses". [S22]
6. **ADA Title II** web rule deadlines extended (IFR 20 Apr 2026) to 26 Apr 2027/2028 — public entities only. [S28]
7. **EU–US DPF**: General Court dismissed Latombe (3 Sep 2025); DPF still in force. [S29]
8. **Digital Omnibus** (proposal, 19 Nov 2025) would cut banner frequency — a proposal only. [S42]

## 1. Cookies and device storage (EU/UK)
- **Scope.** Art 5(3) ePrivacy covers any storage of, or access to, information on the device. EDPB Guidelines 2/2023 v2 (7 Oct 2024): JavaScript that makes the browser send device information "clearly falls within" Art 5(3) (para 33); purely local processing that never leaves the device is not "access" (paras 44–45). Writing to localStorage is "storage"; whether it needs consent depends on the exemption. [S1]
- **Exempt ("strictly necessary")**: user-input/session, authentication, security, load-balancing, **UI customisation (language/region)**, and **the tracker storing the user's consent choice** (WP29 Opinion 04/2012; CNIL Délib. 2020-091 para 49). Lesson-progress storage that stays on-device is analogous to user-input/customisation — treat as exempt but document it. [S2][S3]
- **Needs consent**: advertising, cross-site/social trackers, third-party embeds, analytics unless an exemption applies. Pre-ticked boxes/inactivity invalid (Planet49, C-673/17, 1 Oct 2019). [S5][S6]
- **Banner design (EU)**: EDPB taskforce report (17 Jan 2023): reject option on the first layer, no pre-ticked boxes, no deceptive colours, easy withdrawal. [S5] CNIL fined Google €150m/Facebook €60m (Jan 2022) for reject-harder-than-accept, Shein €150m (Sep 2025). [S12]
- **UK**: ICO expects "reject all" as prominent as "accept all" (guidance updated 16 Aug 2026); "consent or pay" irrelevant to a free site; 2025 campaign: 134 of top-200 sites warned. [S7][S8][S9][S12]
- **Cookieless analytics**: France — consent not needed if CNIL's conditions are met (audience measurement only, publisher only, anonymous statistics, no cross-site identifiers, tracker ≤13 months, data ≤25 months, information + objection); CNIL now uses provider self-evaluation (4 Jul 2025). [S3][S4] UK — statistical-purposes exception since 5 Feb 2026. [S10] Elsewhere no harmonised exemption; Fathom says its design "is not a universal exemption from consent" (8 Sep 2026). [S11]

## 2. Children
- **GDPR Art 8** national ages: 13 — BE, DK, EE, FI, LV, MT, PT, SE (UK also 13); 14 — AT, BG, CY, IT, LT, ES; 15 — CZ, FR, EL, SI; 16 — HR, DE, HU, IE, LU, NL, PL, RO, SK (secondary table, Aug 2026 — verify per country). [S13] A service is "offered directly to a child" unless genuinely restricted to 18+. [S14]
- **UK Children's Code** (in force 2 Sep 2020; compliance 2 Sep 2021): any ISS "likely to be accessed" by under-18s, including non-UK services targeting UK users. 15 standards; age bands 0–5, 6–9, 10–12, 13–15, 16–17; self-declaration acceptable for low risk; nudges toward lower privacy prohibited. [S15]
- **India DPDP** (s.9; Rules 10–12): "child" = under 18; verifiable parental consent via identity/age details or a **virtual token** from a lawfully entrusted entity/**Digital Locker**; **absolute ban** on tracking, behavioural monitoring and targeted advertising directed at children (s.9(3)); Fourth Schedule Part A exempts an "educational institution" only for its own educational activities — unlikely to cover a private website. Rule 3 notice: itemised data, purposes, withdrawal link, rights, Board complaint route. Rule 7 breach: notify affected persons without delay; Board within 72 hours. Penalties up to ₹200 crore for children's-data breaches. Until May 2027, s.9 is not in force. [S16][S17][S18]
- **US COPPA** (<13): a general-audience/teen site need not age-screen; "actual knowledge" arises when the operator learns a user is under 13. If you age-screen, do it neutrally. 2025 rule: separate consent for third-party disclosure, richer direct notice, written security program, posted retention policy. FAQ updated 10 Jul 2026. [S20]
- **US states**: CCPA — for-profit "businesses" only (>$25m revenue base; 100k consumers); 13–15 opt-in for sale/sharing, <13 parental; GPC must be honoured; "Do Not Sell or Share" link required only if you sell/share (28 Aug 2026). [S21] Colorado CPA covers nonprofits meeting thresholds; universal opt-out from 1 Jul 2024; minors (<18) consent for targeted ads/sale/profiling from 1 Oct 2025. [S23] KOSA reintroduced (S.1748, 14 May 2025), **not enacted**. [S24]

## 3. Required notices and pages
- **GDPR Art 13**: controller identity/contact; purposes + legal basis; recipients; transfers; retention; rights; withdrawal; complaint right; automated decisions. [S25]
- **Impressum**: DDG §5 applies to "geschäftsmäßige, in der Regel gegen Entgelt" services — likely not a free hobby site; **MStV §18(1)** requires name and address for all telemedia not "exclusively personal or family"; §18(2) expressly relaxes rules for **Jugendliche running telemedia intended for young people**. Ask a lawyer about a US-established site. [S26]
- **Accessibility**: Web Accessibility Directive — public bodies only. EAA — listed products/services from 28 Jun 2025; a free educational site is not listed. [S27] US: DOJ says Title III applies to public-accommodation websites but there is no regulation (18 Mar 2022). Aim for WCAG 2.1/2.2 AA and publish an accessibility statement. [S28]
- **Contracts with minors**: India — Contract Act s.11 [S41]; keep terms simple, no payments, no penalties.

## 4. Analytics and third parties
- Google Analytics: Austrian DSB (Jan 2022), CNIL (Feb 2022), Garante (Jun 2022) found GA transfers unlawful; DPF adequacy (10 Jul 2023, upheld 3 Sep 2025) cures the transfer issue, but GA still needs consent under Art 5(3). [S29][S30]
- Google Fonts: LG München I (20 Jan 2022) — dynamic loading sent IPs to Google without consent; self-hosting avoids this. [S31]
- YouTube: privacy-enhanced mode stops personalisation but Google's page does not say no data is sent. Use click-to-load. [S32]
- Newsletter: Germany — double opt-in (BGH I ZR 164/09); US CAN-SPAM: physical postal address, opt-out within 10 business days. [S33][S34]

## 5. Financial-education content rules
- India: conditions in §0(1). [S35]
- UK: FCA FG24/1 (26 Mar 2024) — a financial promotion is an invitation/inducement; unauthorised promotions are a criminal offence (ss.21/25 FSMA); generic education without inducement is outside s.21. [S36]
- EU: MAR treats frequent public investment recommendations as regulated (ESMA Oct 2021 — could not fetch).
- US: Advisers Act "investment adviser" with a publisher's exclusion; FINRA 17-18 (2017); SEC alert (29 Aug 2022). [S37]
- Disclaimers evidence intent but do **not** cure specific buy/sell calls, performance claims, or undisclosed paid promotion.

## 6. Sign-in for minors: age assurance context
- EU DSA Art 28 guidelines (14 Jul 2025): online platforms accessible to minors (not micro/small enterprises) — not relevant to a UGC-free site. [S38] UK OSA age-assurance duties (July 2025) cover user-to-user/search/porn services. [S39]
- Real flows: Google child accounts (parental consent via card authorisation); Apple child accounts (parent confirms adult status); Roblox (ID + selfie for 13+ features). [S40]

## (a) Checklist by region
**All**: M privacy notice; M cookie/storage notice (no banner while §c=no); M "not advice" disclaimer; S accessibility statement; S security basics for accounts.
**EU**: M Art 13 notice; M Art 5(3) analysis documented; S per-country age gate; S DPIA if accounts; N Impressum-style name/address if German law may reach you.
**UK**: M UK GDPR notice; M PECR info + opt-out; M Children's Code DPIA + high-privacy defaults + no nudges; M 13+ self-consent.
**India**: M DPDP notice by May 2027; M parental-consent flow or no minor accounts; M no tracking/ads for under-18s; M breach procedure; M SEBI 30-day/no-advice rule.
**US**: M COPPA posture (neutral age screen; delete on actual knowledge); M CAN-SPAM for newsletters; S honour GPC; S "we do not sell or share".

## (b) Privacy-policy contents
| Item | GDPR/UK GDPR | DPDP (Rule 3) | CCPA | COPPA |
|---|---|---|---|---|
| Controller identity/contact | Yes | Yes (fiduciary + grievance) | Yes | Yes |
| Data itemised | Yes | Yes (itemised) | Categories + purposes | Yes |
| Purposes + legal basis | Yes | Purpose | Purposes | Purposes |
| Recipients | Yes | – | Sale/sharing statement | Identities |
| Transfers | Yes | – | – | – |
| Retention | Yes | Erasure on withdrawal | Yes | Written policy |
| Rights & how | Yes | Yes + withdrawal link | Yes + GPC | Parental review/delete |
| Complaint route | DPA | Data Protection Board | – | – |
| Children-specific | Art 8 age, plain language | Parental consent method | <16 opt-in | Direct notice to parent |

## (c) Banner decision tree
1. Only localStorage prefs/progress, consent record, login-session cookie, security → **no banner**. Publish the storage notice.
2. Add cookieless analytics → **no banner if** configured to CNIL conditions and UK statistical exception; treat DE/NL/AT as "confirm with lawyer". Anything with cookies/cross-site IDs (GA4, Meta pixel) → **banner** with equal Accept/Reject, nothing set before choice.
3. YouTube → click-to-load facade → no banner; direct iframe (even nocookie) → banner.
4. Accounts/newsletter → no banner (auth exempt); handle via notices + consent forms.

## (d) Age gate + parental-consent flow
Keep progress on-device so anonymous use processes no personal data. **India**: DOB self-declaration; under-18 → parent-consent screen; migrate to DigiLocker virtual-token; never track/profile minors; simplest: India accounts 18+ only. **EU**: DOB gate; below the national Art 8 age → parent-email consent; consider one EU-wide threshold of 16. **UK**: 13+ self-consent. **US**: neutral DOB screen; under-13 → no account; honour GPC.

## (e) Confirm with a lawyer
1. Whether a US-run non-commercial site is "established"/targeted enough for DDG/MStV Impressum and per-country EU rules. 2. Analytics-without-consent position for DE/NL/AT. 3. Whether lesson-progress localStorage is "strictly necessary". 4. DPDP: Data Fiduciary status; Rule 10 flow adequacy; SEBI 30-day rule application. 5. UK Children's Code DPIA scope; PECR reg 22 for newsletter. 6. CCPA/CPA thresholds. 7. Minor-contract enforceability; SEC/FINRA exposure of specific stock examples.

## Sources
S1 EDPB Guidelines 2/2023 v2 https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf · S2 WP29 Op. 04/2012 https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf · S3 CNIL Délib. 2020-091 https://www.cnil.fr/sites/default/files/atoms/files/lignes_directrices_de_la_cnil_sur_les_cookies_et_autres_traceurs.pdf · S4 https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience · S5 https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf · S6 https://www.twobirds.com/en/insights/2019/global/planet49-cjeu-rules-on-cookie-consent · S7 https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2025/01/ico-takes-action-to-tackle-cookie-compliance-across-the-uk-s-top-1-000-websites/ · S8 https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/online-tracking/consent-or-pay/about-this-guidance/ · S9 https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-we-manage-consent-in-practice/ · S10 https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2026/02/key-aspects-of-the-data--use-and-access--act-take-effect.html · S11 https://usefathom.com/legal/compliance/eprivacy-compliant-website-analytics · S12 https://kukie.io/blog/cookie-consent-fines-2025-2026 · S13 https://gdprlocal.com/digital-age-of-consent-under-the-gdpr/ · S14 https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-are-the-rules-about-an-iss-and-consent/ · S15 https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/ · S16 https://www.dpdpa.com/DPDP_Rules_2025_English_only.pdf ; https://dpdpa.dcomply.in/rules/ ; https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf · S17 https://www.dpdpa.com/dpdparules/rule10.html ; https://dpdpa.com/schedule/schedule4.html ; https://www.dpdpa.com/dpdpa2023/chapter-2/section9.html · S18 https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/ · S19 https://www.business-standard.com/technology/tech-news/meity-may-cut-compliance-timeline-for-key-dpdp-rules-to-12-months-126012201293_1.html · S20 https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule ; https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions · S21 https://oag.ca.gov/privacy/ccpa · S22 https://law.justia.com/cases/federal/appellate-courts/ca9/25-2366/25-2366-2026-03-12.html · S23 https://coag.gov/resources/colorado-privacy-act/ · S24 https://en.wikipedia.org/wiki/Kids_Online_Safety_Act · S25 https://gdpr-info.eu/art-13-gdpr/ · S26 https://www.gesetze-im-internet.de/ddg/__5.html ; MStV §18 · S27 https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en · S28 https://www.ada.gov/resources/web-guidance/ ; https://www.ada.gov/resources/2024-03-08-web-rule/ · S29 https://curia.europa.eu/jcms/upload/docs/application/pdf/2025-09/cp250106en.pdf · S30 https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9782874 · S31 https://de.wikipedia.org/wiki/Google_Fonts · S32 https://support.google.com/youtube/answer/171780 · S33 https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business · S34 https://de.wikipedia.org/wiki/Double-Opt-in · S35 https://www.sebi.gov.in/legal/circulars/jan-2025/details-clarifications-on-provisions-related-to-association-of-persons-regulated-by-the-board-miis-and-their-agents-with-persons-engaged-in-prohibited-activities_91356.html · S36 https://www.fca.org.uk/publications/finalised-guidance/fg24-1-finalised-guidance-financial-promotions-social-media · S37 https://www.law.cornell.edu/uscode/text/15/80b-2 ; https://www.finra.org/rules-guidance/notices/17-18 · S38 https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors · S39 https://www.ofcom.org.uk/online-safety/protecting-children/age-checks-to-protect-children-online · S40 https://support.google.com/families/answer/7103338 ; https://support.apple.com/en-us/HT201084 ; https://en.help.roblox.com/hc/en-us/articles/4407282410644-Age-Verification-FAQs · S41 https://www.indiacode.nic.in/bitstream/123456789/2187/2/A187209.pdf · S42 https://ec.europa.eu/commission/presscorner/detail/en/ip_25_2718

Could not verify: CPPA inflation-adjusted threshold; ESMA finfluencer statements; Latombe appeal status; Maryland/Vermont/Nebraska codes and app-store age laws; EU minors-contract rules; COPPA 2.0 status; whether the DPDP date is 13 or 14 May 2027.
