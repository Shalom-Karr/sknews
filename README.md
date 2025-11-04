# SK News Website

![SK News](https://SKNews.pages.dev/img/news-banner.jpg)

**Live Demo:** [**SKNews.pages.dev**](https://SKNews.pages.dev/)

## About The Project

SK News is a modern, dynamic web platform for a text-based news service tailored for the Yeshiva community. The project's core mission is to deliver reliable, kosher-filtered news updates, community information, and engaging discussions directly to users' phones.

The website serves as a central hub for all SK News services. It provides clear pathways for users to join various news and community chats via SMS or GroupMe, learn about the organization, and view a live feed of breaking news. The site features a clean, professional, dark-themed design built with Tailwind CSS that is fully responsive and accessible on all devices.

A key feature of this project is its deep integration with a Supabase backend, which powers a real-time news feed and two secure admin panels for comprehensive content management.

## Key Features

*   **Dynamic, Database-Driven Content:** Most of the website's content, including the live feed, chats, and site links, is fetched dynamically from a Supabase database.
*   **Dual Admin Panels:**
    *   **News Feed Admin (`admin.html`):** A secure panel for managing the live news feed, including adding, editing, and pinning articles.
    *   **Website Content Admin (`admin_new.html`):** A second panel for managing all other dynamic content, including the chat directory, other sites, and editable content on the "Terms" and "Join" pages.
*   **Modern Frontend:** The entire user interface has been redesigned with Tailwind CSS for a consistent, modern, and responsive experience.
*   **Interactive Community Pages:**
    *   **Chats Page:** A consolidated, dynamic page that displays all community chats in a grid, with a modal for detailed information and join links.
    *   **Sites Page:** A page dedicated to showcasing other projects and websites, managed entirely from the admin panel.
*   **SEO Optimized:**
    *   **Canonical URLs:** All pages include a `<link rel="canonical">` tag pointing to `https://SKNews.pages.dev` to prevent duplicate content issues.
    *   **Sitemap:** A comprehensive `sitemap.xml` is included for efficient indexing by search engines.
    *   **Robots.txt:** A `robots.txt` file is configured to guide crawlers.

## Tech Stack

This project is built with a focus on modern, lightweight, and powerful technologies:

*   **Frontend:**
    *   HTML5
    *   [**Tailwind CSS**](https://tailwindcss.com/): A utility-first CSS framework for rapid UI development.
    *   Vanilla JavaScript (ES Modules)
*   **Backend & Database:**
    *   [**Supabase**](https://supabase.com/): Used for the PostgreSQL database, user authentication (for the admin panels), and real-time data fetching.
*   **Hosting & Deployment:**
    *   [**Cloudflare Pages**](https://pages.cloudflare.com/): For continuous deployment and hosting.

## Database Structure

The Supabase database consists of the following key tables:

*   **`feed`:** Stores all the live feed items for the website.
*   **`chats`:** Contains information about the various community chats, including names, descriptions, and join links.
*   **`sites`:** Manages the list of other websites and projects displayed on the "Sites" page.
*   **`news_admin`:** A key-value store for managing editable content on static pages like "Terms" and "Join".
*   **`contacts`:** Stores submissions from the contact form.

## Local Development

To get a local copy up and running, follow these steps.

### Prerequisites

You will need a free [Supabase](https://app.supabase.com/) account.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Create a Supabase Project:**
    *   Create a new project in your Supabase dashboard.
    *   Save your **Project URL** and **anon (public) key**.

3.  **Create `supabase-client.js`:**
    *   In the project root, create a file named `supabase-client.js`.
    *   Add the following code, replacing the placeholders with your Supabase credentials:
        ```javascript
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

        const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
        const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

        export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        ```

4.  **Set up the Database Tables:**
    *   In your Supabase project's SQL Editor, run the SQL scripts provided by the development team to create the `feed`, `chats`, `sites`, `news_admin`, and `contacts` tables and their corresponding policies.

5.  **Create an Admin User:**
    *   In Supabase, go to **Authentication** and add a new user with the email and password you will use for both admin panels.

6.  **Run Locally:**
    *   To avoid CORS issues, run a simple local server. If you have Python installed, you can run:
        ```sh
        python -m http.server
        ```
    *   Open your browser to `http://localhost:8000`.

## Contact

Shalom Karr - [info.skjmedia@gmail.com](mailto:info.skjmedia@gmail.com)

Project Link: [https://SKNews.pages.dev](https://SKNews.pages.dev)
