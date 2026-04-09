/**
 * Build a synthetic filled-in intake spreadsheet and test the importer.
 * Verifies that real values get imported into the right places.
 */
import "dotenv/config";
import * as XLSX from "xlsx";
import { query } from "../build/database.js";
import { importIntakeTemplate } from "../build/intake-importer.js";

async function main() {
  // Build a fake filled-in intake spreadsheet from scratch
  const wb = XLSX.utils.book_new();

  // General Company Info — match the template's row structure with values in column B
  const generalRows = [
    ["Field", "Info", "Notes", ""],
    ["General Info", "", "", ""],
    ["Company Official (Legal) Name:", "Acme Health LLC", "", ""],
    ["DBA or Short Business Name:", "Acme Health", "", ""],
    ["Locations (Should match GBP listing):", "Office Name: Main Office | Address: 123 Main St, Springfield IL 62701", "", ""],
    ["Is This a Local Service Area Business or a Physical Location?:", "Physical Location", "", ""],
    ["Display Physical Address on Site / Marketing Material?", true, "", ""],
    ["Company Phone Numbers: ", "Main Line: 217-555-1234 | SMS Number: 217-555-9999 | Toll Free: 800-555-1234", "", ""],
    ["Main Company Email Addresses: ", "Primary Email to Diplay on Website (Usually info@ or admin@): info@acmehealth.com | Emails where inquiries whould go (if different from above): hello@acmehealth.com", "", ""],
    ["Email Address for Employment Inquiries:", "careers@acmehealth.com", "", ""],
    ["Company Website URL:", "https://acmehealth.com", "", ""],
    ["Date Founded (Mo/Yr):", "06/2018", "", ""],
    ["Company EIN:", "12-3456789", "", ""],
    ["Type of Business (LLC, S-Corp, Sole P, etc):", "LLC", "", ""],
    ["Number of Clients (Current):", "150", "", ""],
    ["Desired # of Clients to acquire the next 12 Months:", "200", "", ""],
    ["Average Client Lifetime Value ($):", "8500", "", ""],
    ["Number of Employees:", "12", "", ""],
    ["Estimated Current Annual Revenue:", "1500000", "", ""],
    ["Target Annual Revenue 12 Months From Now:", "2500000", "", ""],
    ["Current (Before Hiring Us) Monthly Marketing Spend:", "5000", "", ""],
    ["Current (Before Hiring Us) Monthly Ads Budget:", "3000", "", ""],
    ["CRM System(s) Used:", "GoHighLevel", "", ""],
    ["Domain Registrar:", "GoDaddy", "", ""],
    ["Business Hours:", "Monday: 9-5 | Tuesday: 9-5 | Wednesday: 9-5 | Thursday: 9-5 | Friday: 9-3 | Saturday: Closed | Sunday: Closed", "", ""],
    ["Business Time Zone:", "CST", "", ""],
    ["Payment Types Accepted:", "Cash, Credit Card, HSA", "", ""],
    ["Combined years of experience between your leadership team members:", "45", "", ""],
    ["Other Business Facts (Review/BBB Ratings, # of Specialists, # of clients/projects completed, etc):", "5-star Google reviews, BBB A+ rated, 3 board-certified specialists", "", ""],
    ["", "", "", ""],
    ["Company Contacts / Leadership Team", "", "", ""],
    ["Contact 1:", "Name: Dr. Jane Smith | Position: Founder & CEO | Phone: 217-555-1235 | Email: jane@acmehealth.com", "Marketing Responsibilities: Final approval | Bio: 20 years experience | Headshot link: https://drive.google.com/...", ""],
    ["Contact 2:", "Name: John Doe | Position: COO | Phone: 217-555-1236 | Email: john@acmehealth.com", "", ""],
    ["", "", "", ""],
    ["Unique Selling Propositions", "", "", ""],
    ["Notable Mentions:", "Featured in Springfield Business Journal, recommended by local hospitals", "", ""],
    ["Unique Selling Propositions:", "Only clinic in Springfield offering 24/7 telehealth", "", ""],
    ["Guarantees / Pledges:", "100% satisfaction guarantee on first visit", "", ""],
    ["What Makes Your Company Unique From Your Competitors?:", "We combine functional medicine with traditional care under one roof", "", ""],
    ["Community Involvement:", "Sponsors Springfield 5K, hosts free monthly health workshops", "", ""],
    ["Affiliations & Associations (Trade Associations, Chambers, Networking Organizations, Charities):", "Springfield Chamber of Commerce, AAFP", "", ""],
    ["Quality Assurance Process / System:", "Bi-monthly chart reviews, patient satisfaction surveys", "", ""],
    ["Trainings, Certifications:", "All providers IFM-certified", "", ""],
    ["Awards & Recognitions:", "2024 Best Functional Medicine Clinic - Local Choice Awards", "", ""],
    ["Company Background (How was the company started? What was the inspiration to open the business?:", "Founded by Dr. Smith after her daughter recovered from chronic illness using functional medicine approaches.", "", ""],
    ["Company Mission Statement:", "To empower our patients to achieve optimal health through personalized, root-cause care.", "", ""],
    ["Company Core Values:", "Integrity, compassion, evidence-based care, patient empowerment", "", ""],
    ["Company Slogans or Mottos to include in marketing materials:", "Health, restored.", "", ""],
    ["", "", "", ""],
    ["General Client Demographics", "", "", ""],
    ["Gender Breakdown (Male%/Female%):", "30% Male / 70% Female", "", ""],
    ["Age Breakdown (What percent in each age group):", "30% 30-45, 50% 45-60, 20% 60+", "", ""],
    ["Location:", "Springfield IL and surrounding 30 mile radius", "", ""],
    ["Income Range:", "$75k - $200k", "", ""],
    ["Main Pain Points:", "Chronic fatigue, autoimmune issues, hormonal imbalances", "", ""],
    ["Education Level:", "College educated", "", ""],
    ["Languages Spoken:", "English, Spanish", "", ""],
    ["", "", "", ""],
    ["Top Competitors", "", "", ""],
    ["Company 1:", "Company Name: Springfield Wellness Center | URL: springfieldwellness.com | URLs of Active Social Accounts: facebook.com/sw, instagram.com/sw", "Competitor Notes: Focus on aesthetics", ""],
    ["Company 2:", "Company Name: Heartland Functional Medicine | URL: heartlandfm.com | URLs of Active Social Accounts: ", "", ""],
    ["", "", "", ""],
    ["Appointment Calendar Setup", "", "", ""],
    ["Appointment Type 1:", "Purpose of Calendar: New Patient Consult | User: Dr. Smith | Hours Available: M-F 9-4 | Meeting Length: 60 min | Minimum Schedule Notice: 24 hours | Buffer Time: 15 min", "", ""],
  ];

  const generalSheet = XLSX.utils.aoa_to_sheet(generalRows);
  XLSX.utils.book_append_sheet(wb, generalSheet, "General Company Info");

  // Content Guidelines
  const contentRows = [
    ["Content Guidelines", "", "", ""],
    ["Company Media Assets Google Drive Link:", "https://drive.google.com/folders/abc", "", ""],
    ["What topics should we focus on when creating content for your services?:", "Functional medicine, hormone optimization, chronic disease prevention", "", ""],
    ["Are there restrictions in your industry such as claims or guarantees that we're not allowed to write about? (such as superlatives ‘best,’ ‘leading,’ ‘top’ and so forth)", "Avoid superlatives, never promise cures, no medical claims", "", ""],
    ["What writing style does your audience resonate most with? (Casual, Technical, Sophisticated, etc.):", "Sophisticated but accessible", "", ""],
    ["Purpose of the content? (Informational, Commercial, Transactional) (KW Dependent):", "Educational + commercial mix", "", ""],
    ["How do we help convince your users to action? (Phone, Chat, Contact Form, Free Consultation, etc.):", "Free 15-min consultation booking via website", "", ""],
    ["Do you have any specials or promotions that we can use to reactivate your old clients or to use in digital marketing materials (website, ads, social media, etc.)?:", "Annual physical bundle: $299 ($450 value)", "", ""],
    ["Company Color Scheme (ideally a minimum of 2-3 complementary colors. This can be derived from a high quality logo):", "Color 1: #2E7D32 | Color 2: #81C784 | Color 3: #F1F8E9", "", ""],
    ["Fonts", "Header Font: Playfair Display | Body Font: Open Sans | Other Fonts: ", "", ""],
    ["Holidays to Include in Social Media: *Also included in automated email newsletters", "", "", ""],
    ["New Year's Day*", true, "", ""],
    ["Valentine's Day*", true, "", ""],
    ["Mother's Day*", true, "", ""],
    ["Christmas*", true, "", ""],
  ];
  const contentSheet = XLSX.utils.aoa_to_sheet(contentRows);
  XLSX.utils.book_append_sheet(wb, contentSheet, "Content Guidelines");

  // Service Info
  const serviceRows = [
    ["Services Offered", "", ""],
    ["List out ALL Services:", "", ""],
    ["Main Service 1:", "Functional Medicine: Comprehensive root-cause health assessments", ""],
    ["Main Service 2:", "BHRT: Bio-identical hormone replacement therapy", ""],
    ["Main Service 3:", "IV Therapy: Nutrient infusion therapy", ""],
    ["Main Service 4:", "Weight Management: Medical weight loss programs", ""],
    ["Secondary Service 1:", "Aesthetics: Botox and dermal fillers", ""],
    ["Secondary Service 2:", "TCM: Traditional Chinese medicine and acupuncture", ""],
    ["Any Service Seasonality?:", "IV therapy spikes in winter (immunity), aesthetics in spring", ""],
    ["Primary Service Areas / Target Towns:", "Springfield, Chatham, Sherman", ""],
    ["Secondary Service Areas / Target Towns:", "Decatur, Jacksonville", ""],
    ["Do clients come to you or do you go to your clients?:", "Clients come to us", ""],
  ];
  const serviceSheet = XLSX.utils.aoa_to_sheet(serviceRows);
  XLSX.utils.book_append_sheet(wb, serviceSheet, "Service Info");

  // Logins/Accounts
  const loginsRows = [
    ["Social Media", "", ""],
    ["Google Business Profile URL:", "https://maps.google.com/?cid=12345", ""],
    ["Facebook Page URL:", "https://facebook.com/acmehealth", ""],
    ["Instagram URL:", "https://instagram.com/acmehealth", ""],
    ["Company LinkedIn URL:", "https://linkedin.com/company/acmehealth", ""],
    ["GBP Review Link:", "https://g.page/r/abc/review", ""],
    ["GBP Location ID:", "ChIJxxx", ""],
    ["Technical Info/Access Granted", "", ""],
    ["Domain Login Info, or Access:", "Granted to ai@example.com", ""],
    ["Website Backend Access:", "WP admin granted to ai@example.com", ""],
    ["Google Business Profile Access:", "Owner access granted to ai@example.com", ""],
    ["Google Ads Access:", "MCC link sent and accepted", ""],
  ];
  const loginsSheet = XLSX.utils.aoa_to_sheet(loginsRows);
  XLSX.utils.book_append_sheet(wb, loginsSheet, "LoginsAccounts");

  // TestimonialsPersonas
  const persRows = [
    ["Buyer Personas", "Demographic Info:", "Buyer Needs:"],
    ["Client Avatar 1:", "Name: Sarah Wellness | Age: 42 | Gender: Female | Location: Springfield IL | Family Status: Married, 2 kids | Education Level: Masters | Job: Marketing Manager | Income Level: $90k | Communication Channels Used: Instagram, Email", "Bio: Health-conscious mom seeking functional approach | Pain Points: Fatigue, weight gain | Gains/Expectations from my services: Energy back, better sleep | Factors Influencing buying decision: Reviews, doctor credentials"],
    ["Client Avatar 2:", "Name: Mike Executive | Age: 55 | Gender: Male | Location: Chatham IL | Family Status: Married | Education Level: MBA | Job: Business Owner | Income Level: $250k | Communication Channels Used: LinkedIn", "Bio: High-stress executive with hormone issues | Pain Points: Low energy, brain fog | Gains: Sharper focus, better physical performance | Factors Influencing: Privacy, results"],
    ["Featured Reviews/Testimonials", "", ""],
    ["Testimonial 1:", "Testimonial: Acme Health changed my life. After years of fatigue I finally feel myself again. | Author: Sarah J.", "https://g.page/review/123"],
    ["Testimonial 2:", "Testimonial: The team is incredibly knowledgeable and caring. Highly recommend! | Author: Mike B.", "https://g.page/review/456"],
  ];
  const persSheet = XLSX.utils.aoa_to_sheet(persRows);
  XLSX.utils.book_append_sheet(wb, persSheet, "TestimonialsPersonas");

  // Ads Management
  const adsRows = [
    ["Ad Management Setup", "", ""],
    ["Which Ad platform(s) will we be utilizing?:", "Google Ads, Meta Ads", ""],
    ["What Service(s) will be focus on?:", "BHRT and Functional Medicine", ""],
    ["What is unique about your ability to provide these services?", "Only IFM-certified clinic in 50 mile radius", ""],
    ["What is your monthly Ads Budget (per network)", "$3000 Google + $2000 Meta", ""],
    ["What outcome are we optimizing for? (Calls, Appointments, Sales, Traffic, Form Fills, Offers Claimed):", "Appointments", ""],
    ["What percentage of qualified leads do you believe you will close?:", "35", ""],
    ["Who gets these appointments?", "New patient coordinator", ""],
    ["approximate value per client ?", "8500", ""],
  ];
  const adsSheet = XLSX.utils.aoa_to_sheet(adsRows);
  XLSX.utils.book_append_sheet(wb, adsSheet, "Ads Management");

  // Save and import
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // Find or create test client
  const { rows: existing } = await query("SELECT id FROM cm_clients WHERE slug = 'test-intake-filled'");
  let clientId;
  if (existing[0]) {
    clientId = existing[0].id;
  } else {
    const { rows } = await query(
      "INSERT INTO cm_clients (slug, company_name, status) VALUES ('test-intake-filled', 'Test Intake Filled', 'active') RETURNING id"
    );
    clientId = rows[0].id;
  }

  // Wipe previous import
  await query("DELETE FROM cm_contacts WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_competitors WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_buyer_personas WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_testimonials WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_appointment_types WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_services WHERE client_id = $1 AND source = 'intake_import'", [clientId]);
  await query("DELETE FROM cm_ads_config WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_service_areas WHERE client_id = $1", [clientId]);

  const result = await importIntakeTemplate(clientId, buf);

  console.log("\nImport result:");
  console.log("  Fields imported:", result.fieldsImported);
  console.log("  Total fields imported:", Object.values(result.fieldsImported).reduce((a, b) => a + b, 0));

  // Verify everything came through
  const { rows: client } = await query("SELECT * FROM cm_clients WHERE id = $1", [clientId]);
  const c = client[0];
  console.log("\n── Foundation (cm_clients) ──");
  console.log("  legal_name:", c.legal_name);
  console.log("  dba_name:", c.dba_name);
  console.log("  company_website:", c.company_website);
  console.log("  primary_email:", c.primary_email);
  console.log("  main_phone:", c.main_phone);
  console.log("  business_type:", c.business_type);
  console.log("  number_of_customers:", c.number_of_customers);
  console.log("  avg_client_lifetime_value:", c.avg_client_lifetime_value);
  console.log("  estimated_annual_revenue:", c.estimated_annual_revenue);
  console.log("  business_hours_structured:", JSON.stringify(c.business_hours_structured));
  console.log("\n── Discovery ──");
  console.log("  notable_mentions:", c.notable_mentions?.slice(0, 60));
  console.log("  what_makes_us_unique:", c.what_makes_us_unique?.slice(0, 60));
  console.log("  community_involvement:", c.community_involvement?.slice(0, 60));
  console.log("  certifications_trainings:", c.certifications_trainings?.slice(0, 60));
  console.log("  awards_recognitions:", c.awards_recognitions?.slice(0, 60));
  console.log("  company_background:", c.company_background?.slice(0, 60));
  console.log("  mission_statement:", c.mission_statement?.slice(0, 60));
  console.log("  core_values:", c.core_values?.slice(0, 60));
  console.log("  slogans_mottos:", c.slogans_mottos);
  console.log("  demographics_age:", c.demographics_age);
  console.log("  demographics_pain_points:", c.demographics_pain_points?.slice(0, 60));
  console.log("\n── Logins (Drive link policy) ──");
  console.log("  social_links:", JSON.stringify(c.social_links));
  console.log("  access_checklist:", JSON.stringify(c.access_checklist));
  console.log("  gbp_url:", c.gbp_url);
  console.log("  gbp_review_link:", c.gbp_review_link);
  console.log("  gbp_location_id:", c.gbp_location_id);

  const { rows: contacts } = await query("SELECT * FROM cm_contacts WHERE client_id = $1", [clientId]);
  console.log("\n── Contacts ──", contacts.length);
  contacts.forEach(r => console.log(`  ${r.name} | ${r.role} | ${r.email}`));

  const { rows: competitors } = await query("SELECT * FROM cm_competitors WHERE client_id = $1", [clientId]);
  console.log("\n── Competitors ──", competitors.length);
  competitors.forEach(r => console.log(`  ${r.company_name} | ${r.url}`));

  const { rows: services } = await query("SELECT * FROM cm_services WHERE client_id = $1 ORDER BY sort_order", [clientId]);
  console.log("\n── Services ──", services.length);
  services.forEach(r => console.log(`  [${r.tier}] ${r.service_name}: ${r.description?.slice(0, 50)}`));

  const { rows: areas } = await query("SELECT * FROM cm_service_areas WHERE client_id = $1", [clientId]);
  console.log("\n── Service Areas ──", areas.length);
  areas.forEach(r => console.log(`  ${r.target_cities?.replace(/\n/g, " | ")}`));

  const { rows: personas } = await query("SELECT * FROM cm_buyer_personas WHERE client_id = $1", [clientId]);
  console.log("\n── Personas ──", personas.length);
  personas.forEach(r => console.log(`  ${r.persona_name} (${r.age}, ${r.gender}) — ${r.occupation}`));

  const { rows: testimonials } = await query("SELECT * FROM cm_testimonials WHERE client_id = $1", [clientId]);
  console.log("\n── Testimonials ──", testimonials.length);
  testimonials.forEach(r => console.log(`  ${r.author}: ${r.testimonial_text?.slice(0, 60)}`));

  const { rows: ads } = await query("SELECT * FROM cm_ads_config WHERE client_id = $1", [clientId]);
  console.log("\n── Ads Config ──", ads.length);
  ads.forEach(r => {
    console.log(`  platforms: ${JSON.stringify(r.platforms)}`);
    console.log(`  optimization_goal: ${r.optimization_goal}`);
    console.log(`  expected_close_rate: ${r.expected_close_rate}`);
    console.log(`  value_per_client: ${r.value_per_client}`);
  });

  const { rows: appts } = await query("SELECT * FROM cm_appointment_types WHERE client_id = $1", [clientId]);
  console.log("\n── Appointments ──", appts.length);
  appts.forEach(r => console.log(`  ${r.name}: ${r.purpose} | ${r.assigned_user}`));

  const { rows: cg } = await query("SELECT * FROM cm_content_guidelines WHERE client_id = $1", [clientId]);
  console.log("\n── Content Guidelines ──", cg.length);
  cg.forEach(r => {
    console.log(`  focus_topics: ${r.focus_topics?.slice(0, 60)}`);
    console.log(`  brand_colors: ${r.brand_colors}`);
    console.log(`  fonts: ${r.fonts?.replace(/\n/g, " | ")}`);
    console.log(`  observed_holidays: ${r.observed_holidays}`);
  });

  process.exit(0);
}

main().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
