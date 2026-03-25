# Team Dashboard Roadmap

**Last updated**: 2026-03-25
**Live**: teamdashboard.aimarketingteam.com

---

## Phase 1: Client Info & Strategy Foundation (CURRENT)
*Goal: Rich, complete client profiles that power everything downstream*

### Done
- [x] Client CRUD with 7 editable tabs (Info, Services, SEO, Content, Campaigns, Deliverables, Strategy, Health, Brand Story)
- [x] Services: full CRUD with categories (dropdown of existing + new), tiers, sub-services, provider assignment
- [x] Strategy Hub: Market Intelligence, Brand Foundation (Content Guide), Strategy Outputs
- [x] Strategy Outputs: Content Pillars, Customer Journey Map, 12-Month Plan, 90-Day Sprint
- [x] Brand Story: generation, editing, public shareable page (`/brand-story/:token`)
- [x] Campaigns: full form (30+ fields), inline deliverable CRUD
- [x] Marketing Plan: category grouping, included/not-included badges
- [x] Content Guide: 9 color-coded sections, progress tracking, completion bar
- [x] Traffic Light health status with click-to-edit
- [x] Onboarding: admin wizard (7 steps) + public client intake form
- [x] Marketing Guides: full CRUD with categories, search, filtering, editor
- [x] Client-specific contextual sidebar navigation
- [x] Visual Identity color swatches in markdown rendering

### Remaining
- [ ] Review & polish client info completeness (are all important fields captured?)
- [ ] Campaign tracking improvements (status workflow, timeline visualization?)
- [ ] Content Guide <-> Strategy Hub flow (ensure data feeds properly between them)
- [ ] Buyer persona depth (demographics, psychographics, pain points, objections)

---

## Phase 2: Fulfillment & Execution Tools
*Goal: Use client info + strategies to produce high-quality deliverables*

- [ ] **SEO Fulfillment**: keyword research tools, on-page audit, content briefs from strategy, rank tracking
- [ ] **Content Creation**: AI-assisted content generation using Brand Story + Content Pillars + voice guidelines
- [ ] **Ads Analysis**: Google Ads / Meta Ads performance dashboards, optimization suggestions
- [ ] **Content Calendar**: scheduled content tied to 12-Month Plan and 90-Day Sprint
- [ ] **Deliverable Tracking**: status workflow (draft → review → approved → published), assignment to team
- [ ] **GBP Management**: Google Business Profile posts, reviews, local SEO tied to client profile

---

## Phase 3: Reporting & Client Communication
*Goal: Automated reporting that pulls from all fulfillment data + traffic light status*

- [ ] **Monthly Report Generator**: gather SEO rankings, content published, ads performance, deliverables completed
- [ ] **Traffic Light Summary**: roll up health status across all departments into report
- [ ] **Client-Facing Reports**: branded PDF/web reports ready to send
- [ ] **Accomplishment Log**: track what was done for each client (auto-populated from task completions)
- [ ] **Report Scheduling**: auto-generate and notify on cadence (weekly/monthly)

---

## Phase 4: EOS & Internal Operations
*Goal: Internal team management, accountability, and process*

- [ ] **EOS Rocks**: quarterly goals per team member (pages exist, need polish)
- [ ] **EOS Scorecard**: weekly metrics tracking (page exists)
- [ ] **EOS L10 Meetings**: meeting structure and issue tracking (page exists)
- [ ] **Company Training Library**: training materials, onboarding docs for new hires
- [ ] **SOP Management**: living SOPs with version tracking, assignment
- [ ] **PTO Calendar**: team availability and scheduling
- [ ] **Company Policies**: policy documents, acknowledgment tracking

---

## Phase 5: Workspace & Automation
*Goal: AI-powered workspace and automated workflows*

- [ ] **Workspace/Chat**: migrate to React (only unmigrated page)
- [ ] **Sidebar**: resizable + collapsible
- [ ] **Workflow Automation**: connect scheduler to fulfillment (auto-generate content briefs, etc.)
- [ ] **Notifications**: in-app + Discord notifications for task assignments, report completion
