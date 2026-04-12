# Assignment 3: Keeping Track Report Guide

This document contains two sections. The first explains exactly **how** you should write your report to meet the rubric requirements. The second provides a **Markdown template** you can copy and fill out.
Word count (or equivalent): Roughly 25 pages of Content, Logs & Diagrams (Use Case, Activity, Flow Charts, etc.), and 3 minutes of Video, depending on tasks undertaken

## Part 1: How to Write Your Report

To achieve a high grade (A/B level), your writing needs to shift from a simple diary of events to an analytical reflection. Here is how you should approach it:

* **Target Audience:** Pitch the report to a fellow student. You do not need to explain basic concepts (e.g., "Android Studio is an IDE"), but you do need to explain your advanced implementation choices (e.g., "I chose Room over standard SQLite because it provides compile time verification of SQL queries, which reduced my runtime crashes").
* **Focus on the "Why":** The rubric heavily penalises reports that only describe what was done. Every time you state a feature you built, follow it up with why you designed it that way, why you chose a specific architecture, or why you used a particular library.
* **Be Specific with Challenges:** When detailing your Challenges and Explorations, do not write "RecyclerView was hard to set up." Instead, write: "I encountered an issue where my RecyclerView duplicated items upon scrolling. The root cause was the Viewholder not recycling data properly. I solved this by..."
* **Connect to the Rubric:** Make it easy for your tutor to give you marks. Use headings that directly align with the grading criteria (UI/UX, Code Quality, Process, Challenges).
* **Show Evolution:** Explicitly mention Assignment 2, what feedback you received, and how you improved your processes or code structure for Assignment 3.

***

## Part 2: Report Template

# Assignment 3: Keeping Track 
**Name:** [Your Name]
**Student ID:** [Your ID]
**GitHub Repository:** [Insert Link to GitHub Classroom Repo]
**Demo Video / Investigation Link:** [Insert Link if applicable]

## 1. App Vision & Introduction
* **App Concept:** Briefly describe what your app tracks (e.g., workout routines, restaurant visits) and its core value proposition.
* **Target Audience:** Who is this app for, and what makes it specifically suited for mobile users?

## 2. UI/UX Design & Prototyping
*(Rubric Focus: Vision, User Stories, Use Cases, Prototypes, Mobile Experience)*

* **User Stories & Use Cases:** Provide 3 to 5 core user stories (e.g., "As a user, I want to filter my tracked items by date so I can see recent entries").
* **Prototyping:** Discuss your design phase. Include screenshots or links to your low-fidelity (wireframes) and high-fidelity prototypes. 
* **Mobile-First Considerations:** Explain how you accounted for mobile constraints (screen size, touch targets, one-handed use).
* **User Testing:** Briefly describe any testing you did with peers and how their feedback changed your UI/UX.

## 3. Architecture & Implementation (Code Quality & Functionality)
*(Rubric Focus: 3 to 4 distinct activities/fragments, CRUD, ViewModels, LiveData, Architecture)*

* **Architectural Pattern:** Explain your use of MVVM (Model-View-ViewModel). Why did you structure your data this way?
* **Data Persistence:** Detail your database choice (Room, SQLite, or Firebase). Highlight how you achieved full CRUD (Create, Read, Update, Delete) functionality.
* **Advanced Components:** Discuss your implementation of Fragments, LiveData, and Concurrency (Coroutines or Threads). Explain why these tools were necessary for your app's performance.

## 4. Reflection on Assignment 2
* **Evolution:** What did you learn from Assignment 2? Describe specific changes you made in your development approach, code structure, or UI design for this final assignment.

## 5. Challenges, Explorations, and Takeaways
*(Rubric Focus: Deep, personal, and insightful conclusions, multi-step problem solving)*

* **Challenge 1: [Name the Challenge]**
    * **Root Cause:** What went wrong?
    * **Action Taken:** What multi-step process did you use to debug and fix it?
    * **Takeaway:** What did this teach you about Android development?
* **Challenge 2: [Name the Challenge]**
    * *(Repeat the structure above)*

## 6. Investigation / Experiment (Optional / High-Achiever Task)
*(Note: If you did not do the investigation, remove this section)*

* **Hypothesis:** What were you testing? (e.g., CPU performance of two different list rendering methods).
* **Methodology:** How did you use the Android Profiler or conduct your usability study?
* **Results:** What data did you gather? (Include screenshots of profiler graphs or survey results).
* **Conclusion:** What is the final takeaway from this experiment?

## 7. Software Development Process
*(Rubric Focus: Sensible structured process, time logs, commits)*

* **Version Control:** Summarise your Git commit strategy. Explain how you used descriptive commit messages to track features.
* **Time Logs:** * *Insert a table outlining your dates, tasks worked on, and hours spent.*
    * Provide a brief reflection on your time management.

## 8. Generative AI Acknowledgement
*(You MUST include one of the two statements below)*

**Option 1:** "No Generative AI tools were used for this task."

**Option 2:** "Generative AI tools (e.g., ChatGPT, Gemini) were used for this task to assist with [brainstorming, debugging, explaining concepts]. The prompts and outputs are included in Appendix B."

## References
* Include any tutorials, documentation (Android Developers), or libraries referenced during development in APA 7 format.

## Appendices
* **Appendix A: Architectural Diagrams** (Use Case diagrams, Activity Flow Charts, Database Schemas).
* **Appendix B: Generative AI Logs** (If GenAI was used).