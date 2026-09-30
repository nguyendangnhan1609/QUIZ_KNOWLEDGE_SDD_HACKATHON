# AI-Driven Knowledge Management & Assessment Platform

Version: 1.1  
Status: MVP Specification  
Author: Product Team  
Last Updated: 2026-05-09

---

# 1. Executive Summary

The AI-Driven Knowledge Management & Assessment Platform is a web-based application that automates internal knowledge assessment using Generative AI.

The system allows knowledge managers to upload company documents such as PDFs, Word files, and Markdown documents. AI automatically converts these documents into randomized multiple-choice quizzes that can be shared through public links.

Participants can complete quizzes without authentication, while managers can monitor analytics and assessment results through a dedicated results dashboard.

The platform aims to improve employee knowledge retention, reduce manual quiz creation effort, and provide measurable training outcomes.

---

# 2. Problem Statement

Organizations often distribute internal documentation and training materials without having an effective way to verify employee understanding.

Current challenges include:

- Employees may skim or ignore important documents.
- Manual quiz creation is time-consuming.
- Traditional training systems require complex setup and administration.
- Existing LMS platforms are often too heavy for lightweight internal training use cases.
- Managers lack measurable analytics for knowledge comprehension.

The absence of automated assessment reduces training effectiveness and knowledge retention.

---

# 3. Solution Overview

The platform transforms static company knowledge documents into AI-generated assessments.

Managers upload documents and request quiz generation. The system processes the content, generates a question bank using AI, and creates two shareable public links:

1. Quiz Link
2. Results Dashboard Link

Participants access quizzes directly through the public link without logging in.

To reduce cheating and answer sharing, each participant receives a randomized quiz variation generated from the same question bank.

Managers can track participant performance and assessment statistics through a results dashboard.

---

# 4. Product Goals

## Primary Goals

- Automate quiz generation from documents using AI.
- Reduce manual effort for internal training.
- Improve employee knowledge validation.
- Provide lightweight, shareable assessments without authentication.
- Enable measurable training analytics.

## Secondary Goals

- Support rapid quiz creation during onboarding or compliance training.
- Improve employee engagement with internal knowledge materials.
- Demonstrate practical AI-powered workflow automation.

---

# 5. Non-Goals (Out of Scope for MVP)

The following features are explicitly excluded from the MVP:

- User authentication
- Role-based access control
- Organization/team management
- Real-time collaboration
- AI chatbot assistant
- Video/audio learning support
- Learning management system (LMS) integrations
- Payment systems
- Mobile application
- Certificate generation
- Advanced anti-cheating mechanisms
- Timed exams
- Question editing interface

---

# 6. User Roles

## 6.1 Knowledge Manager

A user responsible for uploading documents, generating quizzes, sharing quiz links, and reviewing results.

### Capabilities

- Upload knowledge documents
- Trigger AI quiz generation
- Access quiz sharing link
- Access results dashboard link
- Review participant performance statistics
- Validate quiz quality by opening the public quiz link; if the AI-generated content is unsatisfactory, regenerate a new question bank (no in-place editing interface in MVP)

---

## 6.2 Participant

A user taking the generated assessment.

### Capabilities

- Access quiz through public link
- Complete randomized quiz
- Enter participant identifier (full name or short name in employee-code style, e.g., `nd_thanh`)
- Submit answers

---

# 7. User Flows

## 7.1 Knowledge Manager Flow

```text
Upload document
→ AI processes document
→ AI generates question bank
→ System creates quiz
→ System generates public quiz link
→ System generates public results link
→ Manager shares quiz link
→ Participants complete assessment
→ Manager reviews analytics
```

---

## 7.2 Participant Flow

```text
Open quiz link
→ Enter participant identifier
→ Receive randomized quiz
→ Answer questions
→ Submit quiz
→ System stores results
```

---

## 7.3 Results Review Flow

```text
Open results dashboard link
→ View participant submissions
→ View average scores
→ View question statistics
→ Analyze performance trends
```

---

# 8. Functional Requirements

## 8.1 Document Upload

The system shall allow managers to upload documents.

### Supported Formats

- PDF
- DOCX
- Markdown (.md)

### Requirements

- Store uploaded file
- Extract textual content
- Validate supported format
- Handle upload failure gracefully

---

## 8.2 AI Question Generation

The system shall generate multiple-choice questions from uploaded documents using AI.

### Requirements

- Generate question bank automatically
- Each question must contain:
  - Question text
  - Four answer choices
  - One correct answer
  - Explanation
  - Difficulty level
- Questions should test comprehension, not simple memorization
- Generated questions must be stored persistently

---

## 8.3 Quiz Creation

The system shall generate a quiz instance after question generation.

### Requirements

- Generate unique public quiz link
- Generate unique public results link
- Associate quiz with uploaded document
- Store generated question bank
- Assign an incremental, monotonically increasing ID to each quiz / question bank to avoid collisions
- Record a `createdAt` timestamp for each quiz / question bank to support future automatic cleanup of stale data (cleanup policy itself is deferred to a later version)

---

## 8.4 Randomized Assessment

The system shall randomize quiz content for each participant.

### Requirements

- Randomize question order
- Randomize answer order
- Select randomized subset of questions from question bank
- Preserve grading integrity after randomization

### Example

Question bank size: 30 questions  
Quiz per participant: 10 randomized questions

---

## 8.5 Quiz Participation

The system shall allow public participation without authentication.

### Requirements

- No login required
- Require a participant identifier before submission. The identifier is either a full name or a short name in employee-code style (e.g., `nd_thanh`)
- The identifier must be unique within a given quiz. If a participant submits with an identifier that already exists for that quiz, the system automatically appends a `_yyyyMMddHHmmss` timestamp suffix so the new submission is stored as a distinct record
- Retakes are allowed; each retake is recorded as an independent attempt after the timestamp suffix is applied
- Allow answer selection
- Allow quiz submission

---

## 8.6 Result Processing

The system shall calculate participant scores.

### Requirements

- Compare submitted answers with correct answers
- Calculate total score
- Store participant result
- Store submission timestamp

---

## 8.7 Analytics Dashboard

The system shall provide assessment analytics.

### Requirements

- Display total submissions
- Display average score
- Display participant scores
- Display question-level accuracy
- Display highest and lowest scores

### Access Model

- The results dashboard is accessed through a public link generated together with the quiz.
- By design, anyone who has the link can view the dashboard. The link is intended to be held by the quiz creator and shared only at their discretion. No additional authentication or access control is provided in MVP.

---

# 9. Non-Functional Requirements

## Performance

- Quiz generation should complete within 30 seconds for "standard documents", where a standard document is defined as a text-based document of approximately 50 pages or fewer (≈ 50,000 characters). Larger documents may exceed this target and are explicitly out of MVP performance scope.
- Quiz pages should load within 3 seconds.

## Scalability

- Support at least 100 concurrent quiz participants during MVP demo.

## Reliability

- Prevent data loss during submission.
- Preserve uploaded documents and quiz results.

## Security

- Public quiz access must use non-guessable tokens.
- Result dashboard links must be difficult to predict.

## Usability

- Quiz participation should require minimal instructions.
- Mobile-responsive UI is preferred.

---

# 10. AI Requirements

## AI Responsibilities

The AI component shall:

- Parse extracted document content
- Generate meaningful MCQs
- Generate plausible distractors
- Identify correct answers
- Generate explanations
- Assign difficulty labels

---

## AI Output Schema

Example (question bank wrapper, with stable IDs and creation timestamp):

```json
{
  "quizId": 1024,
  "createdAt": "2026-05-09T10:00:00Z",
  "questions": [
    {
      "questionId": 1,
      "question": "What is the primary purpose of the platform?",
      "options": [
        "Video conferencing",
        "Knowledge assessment",
        "Payroll processing",
        "Cloud storage"
      ],
      "correctAnswer": "Knowledge assessment",
      "explanation": "The platform focuses on training and assessment.",
      "difficulty": "easy"
    }
  ]
}
```

Notes:

- `quizId` is an incremental ID assigned by the system; `questionId` is unique within a quiz.
- `createdAt` is recorded at quiz / question bank creation time and is used to support future automatic cleanup of stale data.

---

# 11. MVP Success Criteria

The MVP is considered successful if:

- Managers can upload documents successfully.
- AI can generate usable quizzes automatically.
- Participants can complete quizzes without login.
- Randomized quizzes work correctly.
- Results are stored and displayed correctly.
- The full workflow can be demonstrated end-to-end during hackathon presentation.

---

# 12. Technical Assumptions

The MVP assumes:

- AI generation uses a third-party LLM API.
- Uploaded documents are primarily text-based.
- Public links are sufficient for access control. The results dashboard link is shareable by design — anyone holding the link can access the dashboard, and access control is intentionally out of scope for MVP.
- Assessment scale is relatively small during MVP stage.
- Supported documents at MVP are limited to those that the AI can read directly (text-based PDF, DOCX, Markdown). No hard page / character / token limits are enforced in this version; finer constraints will be specified in a later version.

---

# 13. Risks & Constraints

## Risks

- AI may generate inaccurate questions.
- Large PDFs may exceed token limits.
- Randomization logic may affect grading integrity.
- Poorly formatted documents may reduce extraction quality.

## Constraints

- Limited development time during hackathon.
- Limited infrastructure budget.
- No dedicated authentication system in MVP.

---

# 14. Future Enhancements

Potential future improvements include:

- Authentication and user management
- Role-based permissions
- AI-powered answer explanations
- Adaptive difficulty quizzes
- RAG-based question generation
- Quiz editing interface
- Multi-language support
- LMS integrations
- Anti-cheating systems
- Timed exams
- Certification generation
- Team analytics dashboard

---

# 15. Definition of Done

The MVP is complete when:

- A document can be uploaded.
- AI can generate a question bank.
- A quiz link is generated.
- Participants can complete randomized quizzes.
- Results are stored successfully.
- Analytics dashboard displays valid results.
- End-to-end workflow is demo-ready.

---

