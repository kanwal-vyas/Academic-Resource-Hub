# Practical Assignment: Software Process Engineering

**Project Name:** Academic Resource Hub  
**Student Name:** [Your Name]  
**Subject:** Software Engineering  

---

## 1. Software Process Models: Overview

A Software Process Model is an abstract representation of a software process. It presents a description of a process from a particular perspective. These models provide a roadmap for the development team to follow, ensuring that the software is delivered on time, within budget, and with high quality.

Common models include:
- **Waterfall Model:** A linear and sequential approach.
- **Incremental Model:** Development in small, functional pieces.
- **Agile Model:** Iterative and incremental development based on constant feedback.
* **Spiral Model:** A risk-driven process model generator.

---

## 2. Software Process Model Selection

### 2.1 Chosen System: Academic Resource Hub
For the development of the **Academic Resource Hub**, the **Incremental Model** was selected. 

#### Application in the Project:
The project was not built all at once. Instead, it was divided into several functional increments:
1. **Increment 1 (Core Sharing):** Focused on the basic student portal where users could register and view shared PDFs.
2. **Increment 2 (Governance & Admin):** Added the Admin Panel to verify resources and manage users, ensuring data quality.
3. **Increment 3 (Intelligence & Real-time):** Integrated the Gemini AI for summaries and Socket.IO for live notifications.

Each increment was a fully functional "mini-project" that added value to the previous version.

---

### 2.2 Comparison of Models

| Feature | Waterfall | Agile | Spiral | Incremental (Chosen) |
| :--- | :--- | :--- | :--- | :--- |
| **Requirements** | Fixed at the start. | Evolve through iterations. | Evolve as risks are identified. | Fixed for each increment but can grow. |
| **Delivery** | Single final delivery. | Continuous small deliveries. | Each cycle produces a prototype. | Staged delivery of functional modules. |
| **Risk Handling** | Poor (errors found late). | Excellent (daily feedback). | Best (Risk-focused). | Good (Risks isolated to increments). |
| **Flexibility** | Rigid. | Highly flexible. | Moderate. | Flexible between stages. |
| **Complexity** | Low to Moderate. | High (requires high interaction). | Very High. | Moderate. |

---

### 2.3 Justification for the Incremental Model

The Incremental Model is the best fit for the **Academic Resource Hub** for the following reasons:

1. **Prioritization of Features:** In an academic setting, the ability to share notes is more urgent than AI summaries. The Incremental model allowed us to release the "Notes Sharing" module first while the "AI Integration" was still in development.
2. **Reduced Risk of Failure:** By breaking the monorepo into Frontend, Backend, and Admin segments, we could test and stabilize the core API before adding complex real-time features like Socket.IO.
3. **Easier Debugging:** If a bug appeared in the notification system, we knew exactly which increment introduced it, making it easier to isolate from the core authentication logic.
4. **Early Value:** Users could start using the Student Portal as soon as Increment 1 was finished, rather than waiting for the entire Admin and AI suite to be complete (as required by Waterfall).
5. **Resource Management:** As this is an academic project, the Incremental model allows for steady progress without the overwhelming complexity of a full Spiral or the constant meetings required by Agile.

---

**Conclusion:**  
The Incremental Model provided the perfect balance between structure and flexibility, allowing the **Academic Resource Hub** to grow from a simple file-sharing tool into a sophisticated, AI-enhanced intelligence hub.
