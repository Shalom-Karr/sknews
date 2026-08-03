# Gemini Agent Guide for SK News Website

This document provides a comprehensive guide for AI agents working on the SK News website. It outlines the project's architecture, key functionalities, and development preferences to ensure consistency and efficiency in future tasks.

## 1. Project Overview

The SK News website is a modern, dynamic web platform serving a text-based news service for the Yeshiva community. The site is built with a static frontend and a Supabase backend, which provides the database, authentication, and real-time capabilities.

**Primary Goal:** To provide a central, user-friendly hub for accessing news, joining community chats, and learning about the SK News service.

**Canonical URL:** `https://SKNews.pages.dev`

## 2. Architecture and Tech Stack

*   **Frontend:**
    *   **Framework:** Static HTML, CSS, and JavaScript.
    *   **Styling:** [**Tailwind CSS**](https://tailwindcss.com/) is used for all styling. Development should adhere to a utility-first approach. The design is a modern, dark theme.
    *   **JavaScript:** Vanilla JavaScript with ES Modules (`import`/`export`). All scripts that interact with Supabase are modules and must be loaded with `type="module"`.
*   **Backend & Database:**
    *   **Provider:** [**Supabase**](https://supabase.com/)
    *   **Database:** PostgreSQL
    *   **Authentication:** Supabase Auth is used for the admin panels.
*   **Hosting:**
    *   **Provider:** [**Cloudflare Pages**](https://pages.cloudflare.com/)
    *   **Deployment:** Continuous deployment is set up from the GitHub repository.

## 3. Key Functionalities

### 3.1. Dynamic Content

A core principle of this project is to make content as dynamic as possible. All content that may change over time is managed in the Supabase database and fetched by the frontend at runtime.

**Database Tables:**

*   **`feed`:** Manages the live news feed on the homepage.
    *   `title` (text)
    *   `content` (text)
    *   `is_pinned` (boolean)
    *   `pinned_until` (timestamp)
*   **`chats`:** Manages the community chats on the `chats.html` page.
    *   `name`, `description`, `logo_url`, `phone_number`, `groupme_link`, `keyword`
*   **`sites`:** Manages the project links on the `sites.html` page.
    *   `title`, `description`, `url`
*   **`news_admin`:** A key-value store for editable content on otherwise static pages (e.g., `terms.html`, `join.html`).
    *   `page` (text, e.g., "terms")
    *   `element_id` (text, e.g., "terms-content")
    *   `content` (text)
*   **`contacts`:** Stores submissions from the contact form.
    *   `name`, `email`, `message`

### 3.2. Dual Admin Panels

The site has two distinct admin panels for different management tasks.

*   **News Feed Admin (`admin.html`):**
    *   **Purpose:** To manage the live news feed.
    *   **Functionality:** Add, edit, delete, pin, and unpin feed items.
*   **Website Content Admin (`admin_new.html`):**
    *   **Purpose:** To manage all other dynamic content.
    *   **Functionality:** Full CRUD operations for `chats` and `sites`. Edit content for pages managed by the `news_admin` table.

**Navigation:** The two admin panels are linked to each other via a link in the header.

## 4. Development Preferences & Guidelines

### 4.1. Design and UI

*   **Theme:** The website uses a dark theme with teal as the primary accent color.
*   **Framework:** All new UI elements must be built with Tailwind CSS. Do not add custom CSS files.
*   **Responsiveness:** All pages must be fully responsive and tested on mobile, tablet, and desktop screen sizes.

### 4.2. Code and Implementation

*   **JavaScript:** Use modern, vanilla JavaScript (ES6+). Do not introduce any frontend frameworks like React or Vue. All new database interactions should use `async/await`.
*   **Supabase:**
    *   All interactions with the Supabase database must be done through the `supabase-client.js` module.
    *   Row Level Security (RLS) is enabled on all tables. Ensure appropriate policies are in place for any new tables.
*   **File Structure:** Keep the file structure flat. HTML files are in the root, and JavaScript files are in the root. Images are in the `/img` directory.

### 4.3. SEO and Accessibility

*   **Canonical URLs:** Every HTML page must have a `<link rel="canonical">` tag pointing to its absolute URL at `https://SKNews.pages.dev`.
*   **Sitemap:** The `sitemap.xml` file must be kept up-to-date with all public-facing pages.
*   **Semantic HTML:** Use semantic HTML tags (`<header>`, `<footer>`, `<main>`, `<section>`, etc.) to improve accessibility and SEO.

## 5. Task Workflow

1.  **Understand the Goal:** Read the user's request carefully. If anything is unclear, ask for clarification.
2.  **Formulate a Plan:** Create a step-by-step plan to achieve the goal.
3.  **Implement Changes:**
    *   Write clean, commented code that adheres to the guidelines above.
    *   If adding new dynamic content, ensure the corresponding admin functionality is also created.
4.  **Verify Locally:**
    *   Run a local HTTP server (`python -m http.server`) to test all changes.
    *   Use Playwright to perform frontend verification and capture screenshots.
5.  **Update Documentation:** If any architectural changes are made, update this `gemini.md` file and the `README.md`.
6.  **Submit for Review:** Once all steps are complete and verified, submit the code.
